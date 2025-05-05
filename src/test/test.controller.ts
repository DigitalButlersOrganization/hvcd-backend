import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HeliusService } from '../helius/helius.service.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { InjectModel } from '@nestjs/mongoose';
import { PriceHistory } from '../price-history/schemas/price-history.schema.js';
import mongoose, { Model, PipelineStage } from 'mongoose';
import { TransactionService } from '../transaction/transaction.service.js';
import { Wallet } from '../wallet/schemas/wallet.schema.js';
import { TokenHolding } from '../token-holding/schemas/token-holding.schema.js';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../wallet/wallet.service.js';
import {
  Transaction,
  TransactionDocument,
} from '../transaction/schemas/transaction.schema.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CoinGeckoClient } from 'coingecko-api-v3';
import { TransactionMarketCapService } from '../facade/transaction-market-cap/transaction-market-cap.service.js';

@Controller('test')
@ApiTags('Test')
@Injectable()
export class TestController {
  private readonly client: CoinGeckoClient;

  constructor(
    private readonly heliusService: HeliusService,
    private readonly priceHistoryService: PriceHistoryService,
    @InjectModel(PriceHistory.name)
    private readonly priceHistoryModel: Model<PriceHistory>,
    private readonly transactionService: TransactionService,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(TokenHolding.name)
    private readonly tokenHoldingModel: Model<TokenHolding>,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly transactionMarketCupService: TransactionMarketCapService,
  ) {
    this.client = new CoinGeckoClient({
      timeout: 10000,
      autoRetry: true,
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateTransactionMarketCap() {
    const wallets = await this.walletModel.find({
      'importStatus.done': true,
    });

    const walletIds = wallets.map((wallet) => wallet.id);

    const tokenHoldings = await this.tokenHoldingModel.find({
      wallet: {
        $in: walletIds,
      },
    });

    for (const tokenHolding of tokenHoldings) {
      const operations = [];
      const transactions = await this.transactionModel
        .find({
          tradableTokenMint: tokenHolding.mintAddress,
          wallet: tokenHolding.wallet,
        })
        .sort({ date: 1 });

      let currentBetSize = 0;
      let currentRevenue = 0;

      transactions.map((transaction) => {
        if (transaction.action === 'buy') {
          currentBetSize += transaction.from.priceAmount || 0;
        } else if (transaction.action === 'sell') {
          currentRevenue += transaction.to.priceAmount || 0;
        }

        const transactionPnl = currentRevenue - currentBetSize;
        const transactionRoi = currentBetSize
          ? (transactionPnl / currentBetSize) * 100
          : '-';

        operations.push({
          updateOne: {
            filter: { _id: transaction.id },
            update: {
              $set: {
                pnl: transactionPnl,
                roi: transactionRoi,
              },
            },
          },
        });
      });

      if (operations.length) {
        await this.transactionModel.bulkWrite(operations);
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async priceHistory() {
    const lastPrice = await this.priceHistoryModel.findOne().sort({ date: -1 });
    let start;
    if (!lastPrice) {
      start = new Date('2024-10-01T00:00:00Z').getTime();
    } else {
      start = new Date(lastPrice.date).getTime();
    }

    let next = true;

    while (next) {
      const klines = await this.priceHistoryService.fetchKlines(
        'SOLUSDC',
        '1m',
        1000,
        start,
      );

      const history = klines.map((kline) => ({
        price: kline[1],
        date: new Date(kline[0]),
      }));

      await this.priceHistoryModel.insertMany(history);

      if (klines.length < 1000) {
        next = false;
      } else {
        start = klines[klines.length - 1][0];
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateWalletAges() {
    const stages: PipelineStage[] = [
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'wallet',
          as: 'transactions',
        },
      },
      {
        $project: {
          _id: 1,
          firstTransactionDate: { $min: '$transactions.date' },
        },
      },
    ];

    const walletsWithFirstTransactionDate =
      await this.walletModel.aggregate(stages);

    const operations = [];

    for (const wallet of walletsWithFirstTransactionDate) {
      operations.push({
        updateOne: {
          filter: { _id: wallet._id },
          update: { $set: { creationDate: wallet.firstTransactionDate } },
        },
      });
    }

    await this.walletModel.bulkWrite(operations);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateWinrates() {
    const periods = [7, 30, 90, 180];
    const winrates = {};

    for (const period of periods) {
      const sales = {};
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - period);

      const txs: TransactionDocument[] = await this.transactionModel
        .find({
          date: { $gte: fromDate },
        })
        .sort({ date: 1 });

      for (const tx of txs) {
        const walletId = tx.wallet.toString();

        if (!sales[walletId]) {
          sales[walletId] = {
            sales: 0,
            profitableSales: 0,
            winrate: 0,
          };
        }

        if (!winrates[walletId]) {
          winrates[walletId] = {
            7: 0,
            30: 0,
            90: 0,
            180: 0,
          };
        }

        if (!sales[walletId][tx.tradableTokenMint]) {
          sales[walletId][tx.tradableTokenMint] = {
            totalBoughtUsd: 0,
            totalSoldUsd: 0,
            totalAmount: 0,
            totalAmountUsd: 0,
          };
        }

        const tokenData = sales[walletId][tx.tradableTokenMint];

        if (tx.action === 'buy') {
          tokenData.totalAmount += tx.to.amount;
          tokenData.totalAmountUsd += tx.to.priceAmount;
          tokenData.totalBoughtUsd += tx.to.priceAmount;
        } else if (tx.action === 'sell') {
          let avgBuyPrice = 0;

          if (tokenData.totalAmount > 0) {
            avgBuyPrice = tokenData.totalAmountUsd / tokenData.totalAmount;
          }
          const salePricePerCoin = tx.from.price;
          sales[walletId].sales += 1;

          if (salePricePerCoin > avgBuyPrice) {
            sales[walletId].profitableSales += 1;
          }

          tokenData.totalAmount -= tx.from.amount;
          tokenData.totalAmountUsd -= tx.from.amount * avgBuyPrice;
          tokenData.totalSoldUsd += tx.from.priceAmount;
          sales[walletId][tx.tradableTokenMint] = tokenData;

          if (sales[walletId].profitableSales === 0) {
            winrates[walletId][period] = 0;
            sales[walletId].winrate = 0;
          } else {
            winrates[walletId][period] =
              (sales[walletId].profitableSales / sales[walletId].sales) * 100;
            sales[walletId].winrate =
              (sales[walletId].profitableSales / sales[walletId].sales) * 100;
          }
        }
      }
    }

    const operations = [];
    for (const walletId in winrates) {
      operations.push({
        updateOne: {
          filter: { _id: walletId },
          update: { $set: { winrate: winrates[walletId] } },
        },
      });
    }

    await this.walletModel.bulkWrite(operations);
  }
}
