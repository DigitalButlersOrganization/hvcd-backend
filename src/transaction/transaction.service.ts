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
import { PaginationDto } from '../shared/dto/pagination.dto.js';

@Injectable()
export class TransactionService {
  private readonly solanaMint: string;
  private readonly sixMonths = 6;
  private readonly initialRetryDelayMs = 500;
  private readonly maxRetryDelayMs = 10000;
  private readonly iterationPauseMs = 100;

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

  async importTransactions(wallet: WalletDocument): Promise<void> {
    let retryDelay = this.initialRetryDelayMs;

    while (true) {
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
          break;
        }

        const lastTransactionDate = new Date(transactions[0].timestamp * 1000);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - this.sixMonths);

        if (lastTransactionDate < sixMonthsAgo) {
          wallet.importStatus.isImporting = false;
          wallet.importStatus.done = true;
          await wallet.save();
          break;
        }

        const swapTransactions = (
          await Promise.all(
            transactions
              .filter(
                (tx) =>
                  tx.type === 'SWAP' &&
                  tx.tokenTransfers.length > 1 &&
                  tx.tokenTransfers.length <= 3,
              )
              .map((tx) => this.formatTransaction(tx, wallet)),
          )
        ).filter((tx) => tx !== null);

        if (swapTransactions.length > 0) {
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
        }

        wallet.importStatus.lastTransaction =
          transactions[transactions.length - 1].signature;
        wallet.importStatus.lastUpdatingAt = new Date();
        await wallet.save();

        await this.sleep(this.iterationPauseMs);
      } catch (e) {
        wallet.importStatus.isImporting = false;
        await wallet.save();
        if (e.status === HttpStatus.TOO_MANY_REQUESTS) {
          const retryAfter = e.headers?.['retry-after'];
          await this.sleep(
            retryAfter ? parseInt(retryAfter) * 1000 : retryDelay,
          );
          retryDelay = Math.min(retryDelay * 2, this.maxRetryDelayMs);
          continue;
        }
        throw e;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getByMintAndWallet(
    walletId: string,
    mint: string,
    supply: number,
    paginationDto: PaginationDto,
  ) {
    const skip = (paginationDto.page - 1) * paginationDto.limit;
    const safeSupply = supply && supply > 0 ? supply : 1;

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
          marketCap: 1,
          pnl: 1,
          roi: 1,
          balanceMaxHoldings: {
            $multiply: [
              {
                $divide: [
                  { $toDouble: '$to.priceAmount' },
                  { $toDouble: safeSupply },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $facet: {
          paginatedResults: [{ $skip: skip }, { $limit: paginationDto.limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const total = transactions[0].totalCount[0]?.count || 0;

    return {
      items: transactions[0].paginatedResults,
      total,
      page: paginationDto.page,
      limit: paginationDto.limit,
      totalPages: Math.ceil(total / paginationDto.limit),
    };
  }

  async getTransactionsWithoutMarketCup() {
    return this.transactionModel
      .find({
        $or: [
          { marketCap: null },
          { marketCap: { $exists: false } },
          { marketCap: '' },
        ],
      })
      .sort({ createdAt: -1 });
  }

  async bulkUpdate(operations) {
    return await this.transactionModel.bulkWrite(operations);
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
    } else if (to.mint === this.solanaMint) {
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
