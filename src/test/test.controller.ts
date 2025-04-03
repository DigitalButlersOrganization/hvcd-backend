import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HeliusService } from '../helius/helius.service.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { InjectModel } from '@nestjs/mongoose';
import { PriceHistory } from '../price-history/schemas/price-history.schema.js';
import { Model } from 'mongoose';
import { TransactionService } from '../transaction/transaction.service.js';
import { Wallet } from '../wallet/schemas/wallet.schema.js';

@Controller('test')
@ApiTags('Test')
@Injectable()
export class TestController {
  constructor(
    private readonly heliusService: HeliusService,
    private readonly priceHistoryService: PriceHistoryService,
    @InjectModel(PriceHistory.name)
    private readonly priceHistoryModel: Model<PriceHistory>,
    private readonly transactionService: TransactionService,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
  ) {}

  // @Get()
  // async test() {
  //   const wallets = await this.walletModel.aggregate([
  //     {
  //       $lookup: {
  //         from: 'transactions',
  //         localField: '_id',
  //         foreignField: 'wallet',
  //         as: 'transactions',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$transactions',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $match: {
  //         $or: [
  //           { 'transactions.from.amount': { $gt: 0 } },
  //           { 'transactions.to.amount': { $gt: 0 } },
  //         ],
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: '$publicAddress',
  //         totalSpent: {
  //           $sum: {
  //             $cond: [
  //               { $eq: ['$transactions.action', 'buy'] },
  //               { $ifNull: ['$transactions.from.priceAmount', 0] }, // Используем priceAmount для покупки
  //               0,
  //             ],
  //           },
  //         },
  //         totalRevenue: {
  //           $sum: {
  //             $cond: [
  //               { $eq: ['$transactions.action', 'sell'] },
  //               { $ifNull: ['$transactions.to.priceAmount', 0] }, // Используем priceAmount для продажи
  //               0,
  //             ],
  //           },
  //         },
  //       },
  //     },
  //     {
  //       $project: {
  //         walletAddress: '$_id',
  //         totalSpent: 1,
  //         totalRevenue: 1,
  //         pnl: { $subtract: ['$totalRevenue', '$totalSpent'] }, // Расчет PnL
  //         pnlPercentage: {
  //           $cond: [
  //             { $eq: ['$totalSpent', 0] },
  //             0, // Если totalSpent = 0, то процент PnL будет 0
  //             {
  //               $multiply: [
  //                 {
  //                   $divide: [
  //                     { $subtract: ['$totalRevenue', '$totalSpent'] },
  //                     '$totalSpent',
  //                   ],
  //                 },
  //                 100,
  //               ],
  //             }, // Расчет процента PnL
  //           ],
  //         },
  //       },
  //     },
  //     {
  //       $sort: { pnl: -1 }, // Сортировка по PnL (по убыванию)
  //     },
  //   ]);
  //
  //   return wallets;
  // }

  // @Get()
  // async test() {
  //   let start = new Date('2025-03-28T00:00:00Z').getTime();
  //   let allKlines = [];
  //   let next = true;
  //
  //   while (next) {
  //     const klines = await this.priceHistoryService.fetchKlines(
  //       'SOLUSDC',
  //       '1m',
  //       1000,
  //       start,
  //     );
  //
  //     allKlines = [...allKlines, ...klines];
  //
  //     if (klines.length < 1000) {
  //       next = false;
  //     } else {
  //       start = klines[klines.length - 1][0];
  //     }
  //   }
  //
  //   const history = allKlines.map((kline) => ({
  //     price: kline[1],
  //     date: new Date(kline[0]),
  //   }));
  //
  //   await this.priceHistoryModel.insertMany(history);
  // }

  // @Get()
  // async test() {
  //   const address = 'F19MQcxNeNFdEPSakkXvWqDyRShNJFkL61dfxBF7thJ8';
  //   //const tokenAccounts =
  //   // await this.heliusService.getTokenAccountsByOwner(address);
  //   // const assets = await this.heliusService.getAllAssetsByOwner(address);
  // }
}
