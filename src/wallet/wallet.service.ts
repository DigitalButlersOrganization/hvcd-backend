import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema.js';
import mongoose, { Model, PipelineStage } from 'mongoose';
import { WalletMapper } from './wallet.mapper.js';
import { WalletDto } from './dto/wallet.dto.js';
import { HeliusService } from '../helius/helius.service.js';
import { TransactionService } from '../transaction/transaction.service.js';
import { TokenHoldingService } from '../token-holding/token-holding.service.js';
import { FindAllQueryDto } from './dto/find-all-query.dto.js';
import { FindOneQueryDto } from './dto/find-one-query.dto.js';
import { AgendaService } from '../agenda/agenda.service.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    private readonly heliusService: HeliusService,
    private readonly transactionService: TransactionService,
    private readonly tokenHoldingService: TokenHoldingService,
    private readonly agendaService: AgendaService,
  ) {}

  onModuleInit() {
    this.agendaService.defineTask('import-assets', async (job) => {
      const wallet: WalletDocument = job.attrs.data;

      await this.tokenHoldingService.importAssets(wallet);
    });

    this.agendaService.defineTask('import-transactions', async (job) => {
      const wallet = await this.walletModel.findOne({
        _id: job.attrs.data._id,
      });

      if (!wallet.importStatus.done && !wallet.importStatus.isImporting) {
        wallet.importStatus.isImporting = true;
        await wallet.save();
        await this.transactionService.importTransactions(wallet);
      }
    });
  }

  async findOrCreate(publicAddress: string): Promise<WalletDto> {
    let wallet = await this.walletModel.findOne({ publicAddress });

    if (!wallet) {
      const balance = await this.heliusService.getBalance(publicAddress);

      wallet = await this.walletModel.create({
        publicAddress: publicAddress,
        creationDate: new Date(),
        balance: balance / LAMPORTS_PER_SOL,
      });

      await this.agendaService.scheduleTask('import-assets', wallet);
      await this.agendaService.scheduleTask('import-transactions', wallet);

      await wallet.save();
    }

    return WalletMapper.toDto(wallet);
  }

  async update(id: string): Promise<WalletDto> {
    const wallet = await this.walletModel.findById(id);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    wallet.balance = await this.heliusService.getBalance(wallet.publicAddress);
    await wallet.save();

    return WalletMapper.toDto(wallet);
  }

  async findAll(
    findAllQueryDto: FindAllQueryDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const { sort, walletIds, period } = findAllQueryDto;
    const skip = (page - 1) * limit;
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - period);

    const stages: PipelineStage[] = [
      {
        $match: {
          _id: { $in: walletIds },
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: { walletId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$wallet', '$$walletId'] },
                    { $gte: ['$date', fromDate] },
                    {
                      $or: [
                        { $gt: ['$from.amount', 0] },
                        { $gt: ['$to.amount', 0] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'transactions',
        },
      },
      {
        $lookup: {
          from: 'tokenHoldings',
          localField: '_id',
          foreignField: 'wallet',
          as: 'holdings',
        },
      },
      {
        $unwind: {
          path: '$transactions',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            walletId: '$_id',
            publicAddress: '$publicAddress',
            creationDate: '$creationDate',
            balance: { $multiply: ['$balance', 130] },
            winrate: '$winrate',
            totalHoldingsPrice: '$totalHoldingsPrice',
            tokenBalance: { $sum: '$holdings.totalPrice' },
            importStatus: '$importStatus',
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$transactions.action', 'buy'] },
                { $ifNull: ['$transactions.from.priceAmount', 0] },
                0,
              ],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$transactions.action', 'sell'] },
                { $ifNull: ['$transactions.to.priceAmount', 0] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: '$_id.walletId',
          publicAddress: '$_id.publicAddress',
          creationDate: '$_id.creationDate',
          balance: { $sum: ['$_id.balance', '$_id.tokenBalance'] },
          totalSpent: 1,
          totalRevenue: 1,
          winrate: `$_id.winrate.${period}`,
          importStatus: '$_id.importStatus',
          pnl: { $subtract: ['$totalRevenue', '$totalSpent'] },
          pnlPercentage: {
            $cond: [
              { $eq: ['$totalSpent', 0] },
              100,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalRevenue', '$totalSpent'] },
                      '$totalSpent',
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

    if (sort) {
      const sortParam = {};
      sortParam[sort.by] = sort.order === 'asc' ? 1 : -1;
      stages.push({
        $sort: sortParam,
      });
    }

    stages.push({
      $facet: {
        paginatedResults: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const walletsAggregate = await this.walletModel.aggregate(stages);
    const wallets = walletsAggregate[0].paginatedResults;
    const total = walletsAggregate[0].totalCount[0]?.count || 0;

    return {
      items: wallets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(findOneQuery: FindOneQueryDto) {
    const { walletId, period } = findOneQuery;
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - period);

    const stages: PipelineStage[] = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(walletId),
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: { walletId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$wallet', '$$walletId'] },
                    { $gte: ['$date', fromDate] },
                    {
                      $or: [
                        { $gt: ['$from.amount', 0] },
                        { $gt: ['$to.amount', 0] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'transactions',
        },
      },
      {
        $lookup: {
          from: 'tokenHoldings',
          localField: '_id',
          foreignField: 'wallet',
          as: 'holdings',
        },
      },

      {
        $unwind: {
          path: '$transactions',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            walletId: '$_id',
            publicAddress: '$publicAddress',
            creationDate: '$creationDate',
            solanaBalance: { $multiply: ['$balance', 130] },
            holdingsCount: { $size: '$holdings' },
            winrate: '$winrate',
            tokenBalance: { $sum: '$holdings.totalPrice' },
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$transactions.action', 'buy'] },
                { $ifNull: ['$transactions.from.priceAmount', 0] },
                0,
              ],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$transactions.action', 'sell'] },
                { $ifNull: ['$transactions.to.priceAmount', 0] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: '$_id.walletId',
          publicAddress: '$_id.publicAddress',
          creationDate: '$_id.creationDate',
          tokenTrades: '$_id.holdingsCount',
          pnl: { $subtract: ['$totalRevenue', '$totalSpent'] },
          winrate: `$_id.winrate.${period}`,
          balance: { $sum: ['$_id.solanaBalance', '$_id.tokenBalance'] },
        },
      },
    ];

    const walletAggregate = await this.walletModel.aggregate(stages);

    return walletAggregate[0];
  }

  async findByAddress(address: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findOne({
      publicAddress: address,
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }
}
