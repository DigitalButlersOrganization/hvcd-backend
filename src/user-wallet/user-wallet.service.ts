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
import { PaginatedResult } from '../shared/models/paginated-result.model.js';
import { FindQueryDto } from './dto/find-query.dto.js';
import { FindManyQueryDto } from './dto/queries/find-many-query.dto.js';
import { FindAllQueryDto } from '../wallet/dto/find-all-query.dto.js';
import { TokenHoldingService } from '../token-holding/token-holding.service.js';
import { PaginationDto } from '../shared/dto/pagination.dto.js';
import { FindOneQueryDto } from '../wallet/dto/find-one-query.dto.js';
import { FindHoldingsDto } from '../token-holding/dto/find-holdings.dto.js';

@Injectable()
export class UserWalletService {
  constructor(
    @InjectModel(UserWallet.name)
    private readonly userWalletModel: Model<UserWallet>,
    private readonly walletService: WalletService,
    private readonly tokenHoldingService: TokenHoldingService,
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

  async findOne(id: string, userId: string, period: number = 7) {
    const userWallet = await this.userWalletModel.findOne({
      _id: id,
      user: userId,
    });

    if (!userWallet) {
      throw new NotFoundException('Wallet not found');
    }

    const query = new FindOneQueryDto();
    query.period = period;
    query.walletId = userWallet.wallet.toString();
    const wallet = await this.walletService.findOne(query);

    return {
      name: userWallet.name,
      ...wallet,
      creationDate: this.getWalletAge(wallet.creationDate),
    };
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

    const userWallets = await this.userWalletModel
      .find({
        user: userId,
        ...searchQuery,
      })
      .sort(
        findQueryDto.sort
          ? {
              [findQueryDto.sort.by]:
                findQueryDto.sort.order === 'asc' ? 1 : -1,
            }
          : {},
      );

    const walletIds = [];
    const userWalletsFormating = {};
    userWallets.forEach((userWallet: UserWalletDocument) => {
      walletIds.push(userWallet.wallet);
      userWalletsFormating[userWallet.wallet.toString()] = {
        id: userWallet.id,
        name: userWallet.name,
        pnl: {},
        winrate: {},
        import: false,
      };
    });

    const findAllQuery = new FindAllQueryDto();
    findAllQuery.walletIds = walletIds;

    if (findQueryDto.sort) {
      findAllQuery.sort = findQueryDto.sort;
    }

    if (findQueryDto.period) {
      findAllQuery.period = findQueryDto.period;
    }

    const walletResult = await this.walletService.findAll(
      findAllQuery,
      page,
      limit,
    );

    if (findQueryDto.sort.by === 'name') {
      walletResult.items = walletIds.map((id) => {
        return walletResult.items.find((wallet) => {
          return wallet._id.toString() === id.toString();
        });
      });
    }

    walletResult.items = walletResult.items.map((wallet) => {
      const userWallet = userWalletsFormating[wallet._id];
      userWallet['publicAddress'] = wallet.publicAddress;
      userWallet['balance'] = wallet.balance;
      userWallet.creationDate = this.getWalletAge(wallet.creationDate);
      userWallet.pnl = {
        percent: wallet.pnlPercentage,
        value: wallet.pnl,
      };
      userWallet.winrate = wallet.winrate;
      userWallet.import = !wallet.importStatus.done;

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

  async findWalletHoldings(
    paginationDto: FindHoldingsDto,
    id: string,
    userId: string,
  ) {
    const userWallet = await this.userWalletModel.findOne({
      _id: id,
      user: userId,
    });

    return await this.tokenHoldingService.findWalletHoldings(
      paginationDto,
      userWallet.wallet.toString(),
    );
  }

  async getSpecificHolding(id: string, holdingId: string, userId: string) {
    const userWallet = await this.userWalletModel.findOne({
      _id: id,
      user: userId,
    });

    const holding = await this.tokenHoldingService.findSpecificWalletHolding(
      userWallet.wallet._id.toString(),
      holdingId,
    );

    // TODO calculate
    return {
      ...holding,
      betSize: 'Medium',
    };
  }

  async getHoldingsTransactions(
    id: string,
    holdingId: string,
    userId: string,
    paginationDto: PaginationDto,
  ) {
    const userWallet = await this.userWalletModel.findOne({
      _id: id,
      user: userId,
    });

    return await this.tokenHoldingService.getHoldingsTransactions(
      userWallet.wallet.toString(),
      holdingId,
      paginationDto,
    );
  }

  private getWalletAge(creationDate: string) {
    if (!creationDate) {
      return null;
    }

    const targetDate = new Date(creationDate);
    const currentDate = new Date();
    const diffTime = currentDate.getTime() - targetDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `${diffDays} days`;
  }
}
