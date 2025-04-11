import { Controller, Get, HttpStatus, Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HeliusService } from '../helius/helius.service.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { InjectModel } from '@nestjs/mongoose';
import { PriceHistory } from '../price-history/schemas/price-history.schema.js';
import { Model } from 'mongoose';
import { TransactionService } from '../transaction/transaction.service.js';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema.js';
import { Transaction } from '@solana/web3.js';
import { TokenHolding } from '../token-holding/schemas/token-holding.schema.js';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../wallet/wallet.service.js';
import { sleep } from '@nestjs/terminus/dist/utils/index.js';
import { ITransaction } from '../helius/interfaces/transaction.interface.js';

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
    const address = 'F19MQcxNeNFdEPSakkXvWqDyRShNJFkL61dfxBF7thJ8';
    return await this.heliusService.getAssets(
      'F19MQcxNeNFdEPSakkXvWqDyRShNJFkL61dfxBF7thJ8',
    );
    // const wallet = await this.walletService.findByAddress(address);
    //
    // if (!wallet.importStatus.done && !wallet.importStatus.isImporting) {
    //   wallet.importStatus.isImporting = true;
    //   await wallet.save();
    //   await this.importTransactions(address, wallet);
    // }
    // return { message: 'Import started or already done' };
  }

  private async importTransactions(address: string, wallet: WalletDocument) {
    try {
      const transactions: ITransaction[] =
        await this.heliusService.getTransactions(
          address,
          wallet.importStatus.lastTransaction,
        );

      if (!transactions.length) {
        wallet.importStatus.isImporting = false;
        wallet.importStatus.done = true;
        await wallet.save();
        console.log('finish');
        return;
      }

      const lastTransactionDate = new Date(transactions[0].timestamp * 1000);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (lastTransactionDate < sixMonthsAgo) {
        wallet.importStatus.isImporting = false;
        wallet.importStatus.done = true;
        await wallet.save();
        console.log('finish');
        return;
      }

      const swapTransactions = [];

      for (const transaction of transactions) {
        if (
          transaction.type === 'SWAP' &&
          transaction.tokenTransfers.length > 1 &&
          transaction.tokenTransfers.length <= 3
        ) {
          const formatedTransaction =
            await this.transactionService.formatTransaction(
              transaction,
              wallet,
            );

          if (formatedTransaction) {
            swapTransactions.push(formatedTransaction);
          }
        }
      }

      await this.transactionModel.insertMany(swapTransactions);

      wallet.importStatus.lastTransaction =
        transactions[transactions.length - 1].signature;
      wallet.importStatus.lastUpdatingAt = new Date();
      await wallet.save();
      console.log('push');
      await this.importTransactions(address, wallet);
    } catch (e) {
      wallet.importStatus.isImporting = false;
      await wallet.save();
      if (e.status === HttpStatus.TOO_MANY_REQUESTS) {
        await sleep(500);
        await this.importTransactions(address, wallet);
      } else {
        throw e;
      }
    }
  }
}
