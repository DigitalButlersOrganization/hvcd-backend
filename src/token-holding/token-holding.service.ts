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

  async importAssets(wallet: WalletDocument, page: number = 1) {
    const assets = await this.heliusService.getAssets(
      wallet.publicAddress,
      page,
    );
    if (assets.total > 0) {
      const tokenHoldings = assets.items.map((asset) => {
        const decimals = asset.token_info?.decimals || 0;

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
              { $eq: ['$betSize', 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalRevenue', '$betSize'] },
                      '$betSize',
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
          totalPrice: '$holdings.totalPrice',
          betSize: '$holdings.betSize',
          totalRevenue: '$holdings.totalRevenue',
          pnl: '$holdings.pnl',
          roi: '$holdings.roi',
          icon: '$holdings.icon',
          dateLastTraded: '$holdings.dateLastTraded',
          balance: '$holdings.balance',
          supply: '$holdings.supply',
          balanceMaxHoldings: {
            $multiply: [
              {
                $divide: [
                  { $toDouble: '$holdings.balance' },
                  { $toDouble: '$holdings.supply' },
                ],
              },
              100,
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

    const skip = (paginationDto.page - 1) * paginationDto.limit;
    aggregateStages.push({
      $facet: {
        paginatedResults: [{ $skip: skip }, { $limit: paginationDto.limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

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
              { $eq: ['$totalBought', 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalSold', '$totalBought'] },
                      '$totalBought',
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

    const transactions = await this.transactionService.getByMintAndWallet(
      walletId,
      holding.mintAddress,
      holding.supply,
      paginationDto,
    );

    return transactions;
  }

  async getTokensCountByWallet(wallet: string) {
    return this.tokenHoldingModel.countDocuments({ wallet });
  }
}
