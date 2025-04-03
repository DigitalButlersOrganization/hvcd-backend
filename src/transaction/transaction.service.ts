import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITransaction } from '../helius/interfaces/transaction.interface.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { ConfigService } from '@nestjs/config';
import { HeliusService } from '../helius/helius.service.js';
import { WalletDto } from '../wallet/dto/wallet.dto.js';
import { TransactionActions } from './enums/transaction-actions.enum.js';
import { Transaction } from './schemas/transaction.schema.js';

@Injectable()
export class TransactionService {
  private readonly solanaMint: string;

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly priceHistoryService: PriceHistoryService,
    private readonly configService: ConfigService,
    private readonly heliusService: HeliusService,
  ) {
    this.solanaMint = this.configService.get<string>('SOLANA_MINT');
  }

  async createTransactions(wallet: WalletDto) {
    const transactions: ITransaction[] =
      await this.heliusService.getTransactionHistory(wallet.publicAddress);

    const transactionsWithPrices = await Promise.all(
      transactions.map(async (transaction) => {
        const from = transaction.tokenTransfers[0];
        const to = transaction.tokenTransfers[1];
        const date = new Date(transaction.timestamp * 1000);
        const price = await this.priceHistoryService.getPriceByDate(date);
        const { fromPrice, toPrice } = this.getPrices(from, to, price.price);

        return {
          description: transaction.description,
          type: transaction.type,
          source: transaction.source,
          fee: transaction.fee,
          feePayer: transaction.feePayer,
          signature: transaction.signature,
          date: date,
          from: {
            mint: from.mint,
            amount: from.tokenAmount,
            price: fromPrice,
            priceAmount: from.tokenAmount * fromPrice,
          },
          to: {
            mint: to.mint,
            amount: to.tokenAmount,
            price: toPrice,
            priceAmount: to.tokenAmount * toPrice,
          },
          wallet: wallet.id,
          action: this.transactionType(from.mint),
        };
      }),
    );

    return await this.transactionModel.insertMany(transactionsWithPrices);
  }

  async findAll(userId: string) {
    return this.transactionModel.find({ user: userId });
  }

  private getPrices(from, to, price: number) {
    let fromPrice: number;
    let toPrice: number;

    if (from.mint === this.solanaMint) {
      fromPrice = price;
      toPrice = (fromPrice * from.tokenAmount) / to.tokenAmount;
    } else {
      toPrice = price;
      fromPrice = (toPrice * to.tokenAmount) / from.tokenAmount;
    }

    return {
      fromPrice,
      toPrice,
    };
  }

  private transactionType(fromMint: string) {
    return fromMint === this.solanaMint
      ? TransactionActions.BUY
      : TransactionActions.SELL;
  }
}
