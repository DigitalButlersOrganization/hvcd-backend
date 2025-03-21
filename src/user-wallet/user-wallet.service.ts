import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserWallet } from './schemas/user-wallet.schema.js';
import { UserWalletDto } from './dto/user-wallet.dto.js';
import { UserWalletMapper } from './user-wallet.mapper.js';
import { CreateUserWalletDto } from './dto/create-user-wallet.dto.js';
import { UpdateUserWalletDto } from './dto/update-user-wallet.dto.js';
import { WalletService } from '../wallet/wallet.service.js';
import { PaginationService } from '../shared/services/pagintation.service.js';
import { PaginationDto } from '../shared/dto/pagination.dto.js';
import { PaginatedResult } from '../shared/models/paginated-result.model.js';

@Injectable()
export class UserWalletService {
  constructor(
    @InjectModel(UserWallet.name)
    private readonly userWalletModel: Model<UserWallet>,
    private readonly walletService: WalletService,
  ) {}

  async create(
    createUserWalletDto: CreateUserWalletDto,
    userId: string,
  ): Promise<UserWalletDto> {
    const wallet = await this.walletService.findOrCreate(
      createUserWalletDto.address,
    );

    let userWallet = await this.userWalletModel.findOne({
      wallet: wallet.id,
      user: userId,
    });

    if (userWallet) {
      throw new ConflictException('Wallet already exists in this account');
    }

    userWallet = await this.userWalletModel.create({
      wallet: wallet.id,
      name: createUserWalletDto.name,
      user: userId,
    });
    await userWallet.populate('wallet');

    return UserWalletMapper.toDto(userWallet);
  }

  async update(
    id: string,
    updateUserWalletDto: UpdateUserWalletDto,
    userId: string,
  ): Promise<UserWalletDto> {
    const userWallet = await this.userWalletModel.findOneAndUpdate(
      {
        _id: id,
        user: userId,
      },
      { name: updateUserWalletDto.name },
      {
        new: true,
      },
    );

    if (!userWallet) {
      throw new NotFoundException('Wallet not found');
    }

    await userWallet.populate('wallet');

    return UserWalletMapper.toDto(userWallet);
  }

  async findOne(id: string, userId: string): Promise<UserWalletDto> {
    const userWallet = await this.userWalletModel.findOne({
      _id: id,
      user: userId,
    });

    if (!userWallet) {
      throw new NotFoundException('Wallet not found');
    }

    await userWallet.populate('wallet');

    return UserWalletMapper.toDto(userWallet);
  }

  async findAll(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<UserWalletDto>> {
    const paginationResult = await PaginationService.paginate(
      this.userWalletModel,
      paginationDto,
      { user: userId },
      'wallet',
    );

    const { items, ...pagination } = paginationResult;

    return {
      items: items.map(UserWalletMapper.toDto),
      ...pagination,
    };
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.userWalletModel.deleteOne({
      _id: id,
      user: userId,
    });

    if (!result.deletedCount) {
      throw new NotFoundException('Wallet not found');
    }
  }
}
