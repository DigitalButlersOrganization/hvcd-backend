import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TokenHolding } from './schemas/token-holding.schema.js';
import { Model } from 'mongoose';
import { HeliusService } from '../helius/helius.service.js';
import { TokenHoldingMapper } from './token-holding.mapper.js';
import { PaginationService } from '../shared/services/pagintation.service.js';
import { PaginationDto } from '../shared/dto/pagination.dto.js';
import { TransactionService } from '../transaction/transaction.service.js';
import { WalletDocument } from '../wallet/schemas/wallet.schema.js';

@Injectable()
export class TokenHoldingService {
  constructor(
    @InjectModel(TokenHolding.name)
    private readonly tokenHoldingModel: Model<TokenHolding>,
    private readonly heliusService: HeliusService,
    private readonly transactionService: TransactionService,
  ) {}

  async importAssets(wallet: WalletDocument, page: number = 1) {
    const assets = await this.heliusService.getAssets(
      wallet.publicAddress,
      page,
    );
    if (assets.total > 0) {
      const tokenHoldings = assets.items.map((asset) => {
        return {
          mintAddress: asset.id,
          balance: asset.token_info.balance,
          name: asset.content.metadata?.name,
          icon: asset.content.files[0]?.cdn_uri || '',
          wallet: wallet._id,
          owner: asset.ownership.owner,
        };
      });

      await this.tokenHoldingModel.insertMany(tokenHoldings);
    }

    if (assets.total === 1000) {
      await this.importAssets(wallet, ++page);
    }
  }

  async findWalletHoldings(paginationDto: PaginationDto, walletId: string) {
    const paginatedResult = await PaginationService.paginate(
      this.tokenHoldingModel,
      paginationDto,
      {
        wallet: walletId,
        balance: { $gt: 0 },
      },
    );

    return {
      ...paginatedResult,
      items: paginatedResult.items.map(TokenHoldingMapper.toDto),
    };
  }

  async findSpecificWalletHolding(walletId: string, holdingId: string) {
    const holding = await this.tokenHoldingModel.findOne({
      wallet: walletId,
      _id: holdingId,
    });

    return holding;
  }

  async getHoldingsTransactions(
    walletId: string,
    holdingId: string,
    paginationDto: PaginationDto,
  ) {
    const holding = await this.tokenHoldingModel.findOne({
      _id: holdingId,
      wallet: walletId,
    });

    if (!holding) {
      throw new NotFoundException('Holding not found');
    }

    const transactions = await this.transactionService.getByMintAndWallet(
      walletId,
      holding.mintAddress,
      paginationDto,
    );

    return transactions;
  }

  async getTokensCountByWallet(wallet: string) {
    return this.tokenHoldingModel.countDocuments({ wallet });
  }
}
