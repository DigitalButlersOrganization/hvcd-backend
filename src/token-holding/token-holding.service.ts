import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TokenHolding } from './schemas/token-holding.schema.js';
import mongoose, { Model, PipelineStage } from 'mongoose';
import { HeliusService } from '../helius/helius.service.js';
import { PaginationDto } from '../shared/dto/pagination.dto.js';
import { TransactionService } from '../transaction/transaction.service.js';
import { WalletDocument } from '../wallet/schemas/wallet.schema.js';
import { Decimal } from 'decimal.js';
import { FindHoldingsDto } from './dto/find-holdings.dto.js';

@Injectable()
export class TokenHoldingService {
  constructor(
    @InjectModel(TokenHolding.name)
    private readonly tokenHoldingModel: Model<TokenHolding>,
    private readonly heliusService: HeliusService,
    private readonly transactionService: TransactionService,
  ) {}

  async importAssets(
    wallet: WalletDocument,
    page: number = 1,
    ids: string[] = [],
  ) {
    const assets = await this.heliusService.getAssets(
      wallet.publicAddress,
      page,
    );

    if (assets.total > 0) {
      const tokenHoldings = assets.items.map((asset) => {
        const decimals = asset.token_info?.decimals || 0;
        ids.push(asset.id);

        return {
          mintAddress: asset.id,
          balance: new Decimal(asset.token_info.balance)
            .div(Math.pow(10, decimals))
            .toNumber(),
          supply: new Decimal(asset.token_info.supply)
            .div(Math.pow(10, decimals))
            .toNumber(),
          pricePerToken: asset.token_info.price_info?.price_per_token || 0,
          totalPrice: asset.token_info.price_info?.total_price || 0,
          name: asset.content.metadata?.name?.toLowerCase(),
          icon: asset.content.files[0]?.cdn_uri || '',
          wallet: wallet._id,
          owner: asset.ownership.owner,
          symbol: asset.content.metadata?.symbol?.toLowerCase(),
        };
      });

      await this.tokenHoldingModel.insertMany(tokenHoldings);
    }

    if (assets.total === 1000) {
      await this.importAssets(wallet, ++page, ids);
    }

    const accountsData = await this.heliusService.getTokenAccountsByOwner(
      wallet.publicAddress,
    );

    if (accountsData.value.length) {
      const accounts = accountsData.value;
      const nullableAccountsIds = [];

      const nullableBalanceAccounts = accounts.filter((accountData) => {
        const mint = accountData.account.data.parsed.info.mint;
        const include =
          !ids.includes(mint) &&
          accountData.account.data.program === 'spl-token';

        if (include) {
          nullableAccountsIds.push(mint);
        }

        return include;
      });

      const assets =
        await this.heliusService.getAssetBatch(nullableAccountsIds);
      const assetsData = assets.reduce((acc, asset) => {
        const decimals = asset.token_info?.decimals || 0;
        ids.push(asset.id);

        acc[asset.id] = {
          name: asset.content.metadata?.name?.toLowerCase(),
          icon: asset.content.files[0]?.uri || '',
          symbol: asset.content.metadata?.symbol?.toLowerCase(),
          supply: new Decimal(asset.token_info.supply)
            .div(Math.pow(10, decimals))
            .toNumber(),
          pricePerToken: asset.token_info.price_info?.price_per_token || 0,
          totalPrice: asset.token_info.price_info?.total_price || 0,
        };

        return acc;
      }, {});

      const nullableTokenHoldings = nullableBalanceAccounts.map(
        (accountData) => {
          const mint = accountData.account.data.parsed.info.mint;

          return {
            mintAddress: mint,
            balance: 0,
            supply: assetsData[mint].supply,
            pricePerToken: assetsData[mint].pricePerToken,
            totalPrice: assetsData[mint].totalPrice,
            name: assetsData[mint]?.name || '',
            icon: assetsData[mint]?.icon || '',
            wallet: wallet._id,
            owner: accountData.account.data.parsed.info.owner,
            symbol: assetsData[mint]?.symbol || '',
          };
        },
      );

      if (nullableTokenHoldings.length) {
        await this.tokenHoldingModel.insertMany(nullableTokenHoldings);
      }
    }
  }

  async findWalletHoldings(paginationDto: FindHoldingsDto, walletId: string) {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - paginationDto.period);

    const matchStage = {
      $match: {
        $and: [
          { wallet: new mongoose.Types.ObjectId(walletId) },
          paginationDto.search
            ? {
                $or: [
                  { name: { $regex: paginationDto.search, $options: 'i' } },
                  {
                    mintAddress: {
                      $regex: paginationDto.search,
                      $options: 'i',
                    },
                  },
                ],
              }
            : {},
        ],
      },
    };

    const aggregateStages: PipelineStage[] = [
      matchStage,
      {
        $lookup: {
          from: 'transactions',
          let: {
            mintAddress: '$mintAddress',
            walletId: '$wallet',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$tradableTokenMint', '$$mintAddress'] },
                    { $eq: ['$wallet', '$$walletId'] },
                    { $gte: ['$date', fromDate] },
                  ],
                },
              },
            },
            { $sort: { date: -1 } },
          ],
          as: 'transactions',
        },
      },
      {
        $addFields: {
          dateLastTraded: { $first: '$transactions.date' },
          betSize: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$this.action', 'buy'] },
                      { $ifNull: ['$$this.from.priceAmount', 0] },
                      0,
                    ],
                  },
                ],
              },
            },
          },
          totalRevenue: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$this.action', 'sell'] },
                      { $ifNull: ['$$this.to.priceAmount', 0] },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          pnl: { $subtract: ['$totalRevenue', '$betSize'] },
          roi: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $ifNull: ['$betSize', 0] }, 0] },
                  { $eq: ['$betSize', null] },
                ],
              },
              '-',
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $ifNull: ['$totalRevenue', 0] },
                          { $ifNull: ['$betSize', 0] },
                        ],
                      },
                      { $ifNull: ['$betSize', 0] },
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          holdingsBalance: { $sum: '$totalPrice' },
          holdings: { $push: '$$ROOT' },
        },
      },
      {
        $unwind: '$holdings',
      },
      {
        $project: {
          _id: '$holdings._id',
          name: '$holdings.name',
          wallet: '$holdings.wallet',
          mintAddress: '$holdings.mintAddress',
          betSize: '$holdings.betSize',
          totalRevenue: '$holdings.totalRevenue',
          pnl: '$holdings.pnl',
          roi: '$holdings.roi',
          icon: '$holdings.icon',
          dateLastTraded: '$holdings.dateLastTraded',
          balance: '$holdings.totalPrice',
          supply: '$holdings.supply',
          balanceMaxHoldings: {
            $cond: [
              {
                $or: [
                  {
                    $eq: [
                      { $ifNull: [{ $toDouble: '$holdings.supply' }, 0] },
                      0,
                    ],
                  },
                  { $eq: ['$holdings.supply', null] },
                ],
              },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $toDouble: { $ifNull: ['$holdings.balance', 0] } },
                      { $toDouble: { $ifNull: ['$holdings.supply', 0] } },
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
    ];

    if (paginationDto.sort) {
      const sortParam = {};
      sortParam[paginationDto.sort.by] =
        paginationDto.sort.order === 'asc' ? 1 : -1;
      aggregateStages.push({
        $sort: sortParam,
      });
    }

    const tokenHoldingsAggregate =
      await this.tokenHoldingModel.aggregate(aggregateStages);

    const tokenHoldings = tokenHoldingsAggregate[0].paginatedResults;
    const total = tokenHoldingsAggregate[0].totalCount[0]?.count || 0;

    return {
      items: tokenHoldings,
      total,
      page: paginationDto.page,
      limit: paginationDto.limit,
      totalPages: Math.ceil(total / paginationDto.limit),
    };
  }

  async findSpecificWalletHolding(walletId: string, holdingId: string) {
    const holding = await this.tokenHoldingModel.aggregate([
      {
        $match: {
          wallet: new mongoose.Types.ObjectId(walletId),
          _id: new mongoose.Types.ObjectId(holdingId),
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: {
            mintAddress: '$mintAddress',
            walletId: '$wallet',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$tradableTokenMint', '$$mintAddress'] },
                    { $eq: ['$wallet', '$$walletId'] },
                  ],
                },
              },
            },
          ],
          as: 'transactions',
        },
      },
      {
        $addFields: {
          totalBought: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$this.action', 'buy'] },
                      { $ifNull: ['$$this.from.priceAmount', 0] },
                      0,
                    ],
                  },
                ],
              },
            },
          },
          totalSold: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$this.action', 'sell'] },
                      { $ifNull: ['$$this.to.priceAmount', 0] },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          pnl: { $subtract: ['$totalSold', '$totalBought'] },
          roi: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $ifNull: ['$totalBought', 0] }, 0] },
                  { $eq: ['$totalBought', null] },
                ],
              },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $ifNull: ['$totalSold', 0] },
                          { $ifNull: ['$totalBought', 0] },
                        ],
                      },
                      { $ifNull: ['$totalBought', 0] },
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          wallet: 1,
          mintAddress: 1,
          name: 1,
          totalPrice: 1,
          icon: 1,
          pnl: 1,
          roi: 1,
          totalBought: 1,
          totalSold: 1,
          marketCap: { $multiply: ['$pricePerToken', '$supply'] },
        },
      },
    ]);

    return holding[0];
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

    return await this.transactionService.getByMintAndWallet(
      walletId,
      holding.mintAddress,
      holding.supply,
      paginationDto,
    );
  }

  async getTokensCountByWallet(wallet: string) {
    return this.tokenHoldingModel.countDocuments({ wallet });
  }

  async getGroupHoldingsByMints(mints: string[]) {
    return this.tokenHoldingModel.aggregate([
      {
        $match: {
          mintAddress: { $in: mints },
        },
      },
      {
        $group: {
          _id: '$mintAddress',
          doc: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$doc',
        },
      },
      {
        $project: {
          symbol: 1,
          mintAddress: 1,
          name: 1,
        },
      },
    ]);
  }
}
