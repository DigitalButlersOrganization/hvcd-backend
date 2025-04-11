import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITransaction } from '../helius/interfaces/transaction.interface.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { ConfigService } from '@nestjs/config';
import { HeliusService } from '../helius/helius.service.js';
import { WalletDto } from '../wallet/dto/wallet.dto.js';
import { TransactionActions } from './enums/transaction-actions.enum.js';
import { Transaction } from './schemas/transaction.schema.js';
import { WalletDocument } from '../wallet/schemas/wallet.schema.js';
import { sleep } from '@nestjs/terminus/dist/utils/index.js';
import { PaginationService } from '../shared/services/pagintation.service.js';
import { PaginationDto } from '../shared/dto/pagination.dto.js';

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

  async saveTransactions(transactions: ITransaction[], wallet: WalletDocument) {
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
          action: this.transactionType(from.mint, to.mint),
        };
      }),
    );

    return await this.transactionModel.insertMany(transactionsWithPrices);
  }

  async formatTransaction(transaction: ITransaction, wallet: WalletDocument) {
    const from = transaction.tokenTransfers[0];
    const to = transaction.tokenTransfers[1];
    const transactionType = this.transactionType(from.mint, to.mint);

    if (!transactionType) {
      return null;
    }

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
      action: transactionType,
    };
  }

  async findAll(userId: string) {
    return this.transactionModel.find({ user: userId });
  }

  async importTransactions(wallet: WalletDocument) {
    try {
      const transactions: ITransaction[] =
        await this.heliusService.getTransactions(
          wallet.publicAddress,
          wallet.importStatus.lastTransaction,
        );

      if (!transactions.length) {
        wallet.importStatus.isImporting = false;
        wallet.importStatus.done = true;
        await wallet.save();
        return;
      }

      const lastTransactionDate = new Date(transactions[0].timestamp * 1000);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (lastTransactionDate < sixMonthsAgo) {
        wallet.importStatus.isImporting = false;
        wallet.importStatus.done = true;
        await wallet.save();
        return;
      }

      const swapTransactions = [];

      for (const transaction of transactions) {
        if (
          transaction.type === 'SWAP' &&
          transaction.tokenTransfers.length > 1 &&
          transaction.tokenTransfers.length <= 3
        ) {
          const formatedTransaction = await this.formatTransaction(
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
      await this.importTransactions(wallet);
    } catch (e) {
      wallet.importStatus.isImporting = false;
      await wallet.save();
      if (e.status === HttpStatus.TOO_MANY_REQUESTS) {
        await sleep(500);
        await this.importTransactions(wallet);
      } else {
        throw e;
      }
    }
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

  async getByMintAndWallet(
    walletId: string,
    mint: string,
    paginationDto: PaginationDto,
  ) {
    return await PaginationService.paginate(
      this.transactionModel,
      paginationDto,
      {
        wallet: walletId,
        $or: [{ 'from.mint': mint }, { 'to.mint': mint }],
      },
    );
  }

  private transactionType(fromMint: string, toMint: string) {
    if (fromMint === this.solanaMint) {
      return TransactionActions.BUY;
    } else if (toMint === this.solanaMint) {
      return TransactionActions.SELL;
    }

    return '';
  }
}
