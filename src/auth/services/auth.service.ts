import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SendCodeDto } from '../dto/send-code.dto.js';
import { SignInDto } from '../dto/sign-in.dto.js';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from '../../user/dto/create-user.dto.js';
import { UserService } from '../../user/user.service.js';
import { AuthorizationResponseDto } from '../dto/authorithation-response.dto.js';
import { JwtService } from '@nestjs/jwt';
import {
  IOtpService,
  OTP_SERVICE_NAME,
} from '../../otp/otp-service.interface.js';
import { RevokeRefreshTokenService } from './revoke-refresh-token.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private readonly jwtService: JwtService,
    private readonly revokeRefreshTokenService: RevokeRefreshTokenService,
    private readonly configService: ConfigService,
    @Inject(OTP_SERVICE_NAME) private readonly otpService: IOtpService,
  ) {
    this.otpService.setServiceSid(
      this.configService.get<string>('TWILIO_VERIFY_SERVICE_SID'),
    );
  }

  async verifyAndSignIn(signInDto: SignInDto) {
    const { phone, code } = signInDto;
    const user = await this.userService.findByPhone(phone);
    const verify = await this.otpService.verifyCode(phone, code);

    if (!verify) {
      throw new BadRequestException(
        'Invalid verification code or phone number',
      );
    }

    return await this.generateTokens(user.id);
  }

  async sendCode(sendCodeDto: SendCodeDto): Promise<void> {
    const createUserDto = plainToInstance(CreateUserDto, sendCodeDto);
    const user = await this.userService.findOrCreate(createUserDto);

    if (user) {
      await this.otpService.sendCode(user.phone);
    }
  }

  async refreshToken(refreshToken: string, userId: string) {
    const user = await this.userService.findById(userId);
    await this.revokeRefreshTokenService.create(refreshToken);

    return await this.generateTokens(user.id);
  }

  async logout(refreshToken: string, userId: string) {
    await this.userService.findById(userId);
    await this.revokeRefreshTokenService.create(refreshToken);
  }

  private async generateTokens(
    userId: string,
  ): Promise<AuthorizationResponseDto> {
    const payload = { sub: userId };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
