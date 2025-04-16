import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ITransaction } from '../helius/interfaces/transaction.interface.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { ConfigService } from '@nestjs/config';
import { HeliusService } from '../helius/helius.service.js';
import { TransactionActions } from './enums/transaction-actions.enum.js';
import { Transaction } from './schemas/transaction.schema.js';
import { WalletDocument } from '../wallet/schemas/wallet.schema.js';
import { sleep } from '@nestjs/terminus/dist/utils/index.js';
import { PaginationService } from '../shared/services/pagintation.service.js';
import { PaginationDto } from '../shared/dto/pagination.dto.js';
import { transactions } from '@metaplex/js';

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

  async formatTransaction(transaction: ITransaction, wallet: WalletDocument) {
    const tradeData = await this.getTradeData(transaction);

    if (!tradeData.action) {
      return null;
    }

    return {
      ...tradeData,
      description: transaction.description,
      type: transaction.type,
      source: transaction.source,
      fee: transaction.fee,
      feePayer: transaction.feePayer,
      signature: transaction.signature,
      wallet: wallet.id,
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

      await this.transactionModel.bulkWrite(
        swapTransactions.map((transaction) => ({
          updateOne: {
            filter: { signature: transaction.signature },
            update: { $setOnInsert: transaction },
            upsert: true,
          },
        })),
        { ordered: false },
      );

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

  async getByMintAndWallet(
    walletId: string,
    mint: string,
    supply: number,
    paginationDto: PaginationDto,
  ) {
    const transactions = await this.transactionModel.aggregate([
      {
        $match: {
          $and: [
            { wallet: new mongoose.Types.ObjectId(walletId) },
            {
              $or: [{ 'from.mint': mint }, { 'to.mint': mint }],
            },
          ],
        },
      },
      {
        $project: {
          signature: 1,
          date: 1,
          action: 1,
          amount: '$to.priceAmount',
          balanceMaxHoldings: {
            $multiply: [
              {
                $divide: [
                  { $toDouble: '$to.priceAmount' },
                  { $toDouble: supply },
                ],
              },
              100,
            ],
          },
        },
      },
    ]);

    return transactions;
  }

  private async getTradeData(transaction: ITransaction) {
    let fromPrice: number;
    let toPrice: number;
    let tradableTokenMint: string;
    let action: string;
    const from = transaction.tokenTransfers[0];
    const to = transaction.tokenTransfers[1];
    const date = new Date(transaction.timestamp * 1000);
    const price = await this.priceHistoryService.getPriceByDate(date);

    if (from.mint === this.solanaMint) {
      fromPrice = price.price;
      toPrice = (fromPrice * from.tokenAmount) / to.tokenAmount;
      tradableTokenMint = to.mint;
      action = TransactionActions.BUY;
    } else {
      toPrice = price.price;
      fromPrice = (toPrice * to.tokenAmount) / from.tokenAmount;
      tradableTokenMint = from.mint;
      action = TransactionActions.SELL;
    }

    return {
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
      tradableTokenMint: tradableTokenMint,
      action: action,
    };
  }
}
