import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HeliusService } from '../helius/helius.service.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { InjectModel } from '@nestjs/mongoose';
import { PriceHistory } from '../price-history/schemas/price-history.schema.js';
import { Model } from 'mongoose';
import { TransactionService } from '../transaction/transaction.service.js';
import { Wallet } from '../wallet/schemas/wallet.schema.js';
import { TokenHolding } from '../token-holding/schemas/token-holding.schema.js';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../wallet/wallet.service.js';
import {
  Transaction,
  TransactionDocument,
} from '../transaction/schemas/transaction.schema.js';

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
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(TokenHolding.name)
    private readonly tokenHoldingModel: Model<TokenHolding>,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
  ) {}

  @Get('price-history')
  async priceHistory() {
    const lastPrice = await this.priceHistoryModel.findOne().sort({ date: -1 });
    let start;
    if (!lastPrice) {
      start = new Date('2025-01-01T00:00:00Z').getTime();
    } else {
      start = new Date(lastPrice.date).getTime();
    }

    let allKlines = [];
    let next = true;

    while (next) {
      const klines = await this.priceHistoryService.fetchKlines(
        'SOLUSDC',
        '1m',
        1000,
        start,
      );

      allKlines = [...allKlines, ...klines];

      if (klines.length < 1000) {
        next = false;
      } else {
        start = klines[klines.length - 1][0];
      }
    }

    const history = allKlines.map((kline) => ({
      price: kline[1],
      date: new Date(kline[0]),
    }));

    await this.priceHistoryModel.insertMany(history);
  }

  @Get()
  async test() {
    const wallet = '67fd6b5cd978c0289e6cb274';

    const txs: TransactionDocument[] = await this.transactionModel
      .find({
        wallet: wallet,
      })
      .sort({ date: 1 });

    const mintTransactions = {};
    for (const tx of txs) {
      if (!mintTransactions[tx.tradableTokenMint]) {
        mintTransactions[tx.tradableTokenMint] = {
          totalBoughtUsd: 0,
          totalSoldUsd: 0,
          totalAmount: 0,
          totalAmountUsd: 0,
          sales: [],
        };
      }

      if (tx.action === 'buy') {
        mintTransactions[tx.tradableTokenMint].totalAmount += tx.to.amount;
        mintTransactions[tx.tradableTokenMint].totalAmountUsd +=
          tx.to.priceAmount;
        mintTransactions[tx.tradableTokenMint].totalBoughtUsd +=
          tx.to.priceAmount;
      } else if (tx.action === 'sell') {
        let avgBuyPrice = 0;

        if (mintTransactions[tx.tradableTokenMint].totalAmount > 0) {
          avgBuyPrice =
            mintTransactions[tx.tradableTokenMint].totalAmountUsd /
            mintTransactions[tx.tradableTokenMint].totalAmount;
        }
        const salePricePerCoin = tx.from.price;
        const isProfitable = salePricePerCoin > avgBuyPrice;
        mintTransactions[tx.tradableTokenMint].sales.push(isProfitable);
        mintTransactions[tx.tradableTokenMint].totalAmount -= tx.from.amount;
        mintTransactions[tx.tradableTokenMint].totalAmountUsd -=
          tx.from.amount * avgBuyPrice;
        mintTransactions[tx.tradableTokenMint].totalSoldUsd +=
          tx.from.priceAmount;
      }
    }

    const holdings = await this.tokenHoldingModel.find({
      wallet: wallet,
    });
  }
}
