import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  UserWallet,
  UserWalletDocument,
} from './schemas/user-wallet.schema.js';
import { UserWalletDto } from './dto/user-wallet.dto.js';
import { UserWalletMapper } from './user-wallet.mapper.js';
import { CreateUserWalletDto } from './dto/create-user-wallet.dto.js';
import { UpdateUserWalletDto } from './dto/update-user-wallet.dto.js';
import { WalletService } from '../wallet/wallet.service.js';
import { PaginationService } from '../shared/services/pagintation.service.js';
import { PaginatedResult } from '../shared/models/paginated-result.model.js';
import { FindQueryDto } from './dto/find-query.dto.js';
import { FindManyQueryDto } from './dto/queries/find-many-query.dto.js';
import { FindAllQueryDto } from '../wallet/dto/find-all-query.dto.js';

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
      publicAddress: wallet.publicAddress,
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

    await userWallet.populate({
      path: 'wallet',
      populate: {
        path: 'tokenHoldings',
      },
    });

    return UserWalletMapper.toDto(userWallet);
  }

  async findAll(
    userId: string,
    findQueryDto: FindQueryDto,
  ): Promise<PaginatedResult<UserWalletDto>> {
    const { search, page, limit } = findQueryDto;

    const searchQuery: FilterQuery<UserWallet> = {
      $or: [
        { name: { $regex: search || '', $options: 'i' } },
        { publicAddress: { $regex: search || '', $options: 'i' } },
      ],
    };

    const userWallets = await this.userWalletModel.find({
      user: userId,
      ...searchQuery,
    });

    const walletIds = [];
    const userWalletsFormating = {};
    userWallets.forEach((userWallet: UserWalletDocument) => {
      walletIds.push(userWallet.wallet);
      userWalletsFormating[userWallet.wallet.toString()] = {
        name: userWallet.name,
        pnl: {},
        winrate: {},
      };
    });
    const findAllQuery = new FindAllQueryDto();
    findAllQuery.walletIds = walletIds;

    if (findQueryDto.sort) {
      findAllQuery.sort = findQueryDto.sort;
    }

    if (findQueryDto.period) {
      findQueryDto.period = findAllQuery.period;
    }

    const walletResult = await this.walletService.findAll(
      findAllQuery,
      page,
      limit,
    );

    walletResult.items = walletResult.items.map((wallet) => {
      const userWallet = userWalletsFormating[wallet._id];
      userWallet['publicAddress'] = wallet.publicAddress;
      userWallet['balance'] = wallet.balance;
      userWallet.creationDate = wallet.creationDate;
      userWallet.pnl = {
        percent: wallet.pnlPercentage,
        value: wallet.pnl,
      };

      return userWallet;
    });

    return walletResult;
  }

  async findMany(filter: FindManyQueryDto): Promise<UserWalletDocument[]> {
    return this.userWalletModel.find(filter);
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
