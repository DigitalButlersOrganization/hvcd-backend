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

  async findOrCreate(walletAddress: string): Promise<WalletDto> {
    let wallet = await this.walletModel.findOne({ walletAddress });

    if (!wallet) {
      const balance = await this.heliusService.getBalance(walletAddress);

      wallet = await this.walletModel.create({
        publicAddress: walletAddress,
        creationDate: new Date(),
        balance: balance,
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
          localField: '_id',
          foreignField: 'wallet',
          as: 'transactions',
        },
      },
      {
        $unwind: {
          path: '$transactions',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $and: [
            {
              $or: [
                { 'transactions.from.amount': { $gt: 0 } },
                { 'transactions.to.amount': { $gt: 0 } },
              ],
            },
            {
              'transactions.date': { $gte: fromDate },
            },
          ],
        },
      },
      {
        $group: {
          _id: {
            walletId: '$_id',
            publicAddress: '$publicAddress',
            creationDate: '$creationDate',
            balance: '$balance',
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
          balance: '$_id.balance',
          totalSpent: 1,
          totalRevenue: 1,
          pnl: { $subtract: ['$totalRevenue', '$totalSpent'] },
          pnlPercentage: {
            $cond: [
              { $eq: ['$totalSpent', 0] },
              0,
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
            balance: '$balance',
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
          balance: '$_id.balance',
          totalSpent: 1,
          totalRevenue: 1,
          pnl: { $subtract: ['$totalRevenue', '$totalSpent'] },
          pnlPercentage: {
            $cond: [
              { $eq: ['$totalSpent', 0] },
              0,
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

    const walletAggregate = await this.walletModel.aggregate(stages);
    console.log(walletAggregate);

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
