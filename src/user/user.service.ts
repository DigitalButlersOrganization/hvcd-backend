import {
  BadRequestException,
  ConflictException, Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema.js';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserMapper } from './user.mapper.js';
import { UserDto } from './dto/user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ChangePhoneDto } from './dto/change-phone.dto.js';
import { ConfigService } from '@nestjs/config';
import { IOtpService, OTP_SERVICE_NAME } from '../otp/otp-service.interface.js';

@Injectable()
export class UserService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(OTP_SERVICE_NAME) private readonly otpService: IOtpService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    this.otpService.setServiceSid(
      this.configService.get<string>('TWILIO_CHANGE_NUMBER_VERIFY_SERVICE_SID'),
    );
  }

  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    const user: UserDocument = await this.userModel.create({
      ...createUserDto,
    });

    return UserMapper.toDto(user);
  }

  async findOrCreate(createUserDto: CreateUserDto): Promise<UserDto> {
    let user: UserDocument = await this.userModel.findOne({
      phone: createUserDto.phone,
    });

    if (!user) {
      user = await this.userModel.create({ ...createUserDto });
    }

    return UserMapper.toDto(user);
  }

  async findByPhone(phone: string): Promise<UserDto> {
    const user = await this.userModel.findOne({ phone });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return UserMapper.toDto(user);
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return UserMapper.toDto(user);
  }

  async update(updateUserDto: UpdateUserDto, id: string) {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return UserMapper.toDto(user);
  }

  async changePhone(changePhoneDto: ChangePhoneDto, userId: string) {
    const existsUser = await this.userModel.findOne({
      phone: changePhoneDto.newPhone,
    });

    if (existsUser) {
      throw new ConflictException('User with this phone already exists');
    }

    if (
      !(await this.otpService.verifyCode(
        changePhoneDto.newPhone,
        changePhoneDto.code,
      ))
    ) {
      throw new BadRequestException('Invalid verification code');
    }

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        phone: changePhoneDto.newPhone,
      },
      {
        new: true,
      },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }
}
