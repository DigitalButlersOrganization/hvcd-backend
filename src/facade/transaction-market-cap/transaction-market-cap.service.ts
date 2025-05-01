import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../transaction/transaction.service.js';
import { MarketCapService } from '../../market-cap/market-cap.service.js';
import { TaskService } from '../../task/task.service.js';
import { TransactionDocument } from '../../transaction/schemas/transaction.schema.js';
import { TokenHoldingService } from '../../token-holding/token-holding.service.js';
import { format } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TransactionMarketCapService {
  private readonly taskName = 'setTransactionsMarketCap';

  constructor(
    private readonly transactionService: TransactionService,
    private readonly marketCapService: MarketCapService,
    private readonly taskService: TaskService,
    private readonly tokenHoldingService: TokenHoldingService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async setTransactionsMarketCap() {
    const task = await this.taskService.findOrCrete(this.taskName);

    if (task.locked) {
      return;
    }

    await this.taskService.acquireLock(this.taskName);

    try {
      const transactions =
        await this.transactionService.getTransactionsWithoutMarketCup();
      if (!transactions.length) return;

      const groupedData = this.groupTransactionsByMintAndDate(transactions);
      const holdings = await this.getTokenHoldings(groupedData.uniqueMints);
      const coins = await this.processCoins(holdings);
      await this.updateTransactionsWithMarketCaps(groupedData, coins, holdings);
    } catch (e) {
      throw e;
    } finally {
      await this.taskService.releaseLock(this.taskName);
    }
  }

  private async getTokenHoldings(uniqueMints: string[]) {
    return this.tokenHoldingService.getGroupHoldingsByMints(uniqueMints);
  }

  private groupTransactionsByMintAndDate(transactions: TransactionDocument[]) {
    const uniqueMintsSet = new Set<string>();
    const mintDates = {};
    const transactionsByMintAndDates = {};

    for (const transaction of transactions) {
      const onlyDate = format(transaction.date, 'dd-MM-yyyy');
      const mint = transaction.tradableTokenMint;

      uniqueMintsSet.add(mint);
      mintDates[mint] = mintDates[mint] || [];
      transactionsByMintAndDates[mint] = transactionsByMintAndDates[mint] || {};

      if (!mintDates[mint].includes(onlyDate)) {
        mintDates[mint].push(onlyDate);
      }

      transactionsByMintAndDates[mint][onlyDate] =
        transactionsByMintAndDates[mint][onlyDate] || [];
      transactionsByMintAndDates[mint][onlyDate].push(transaction);
    }

    return {
      uniqueMints: Array.from(uniqueMintsSet),
      mintDates,
      transactionsByMintAndDates,
    };
  }

  private async updateTransactionsWithMarketCaps(
    groupedData: any,
    coins: any[],
    holdings: any[],
  ) {
    const symbolNames = holdings.reduce((acc, holding) => {
      acc[holding.symbol] = { name: holding.name, mint: holding.mintAddress };
      return acc;
    }, {});

    const bulkUpdateOperations = [];

    for (const coin of coins) {
      const mint = symbolNames[coin.symbol]?.mint;
      if (!mint) continue;

      const coinDates = groupedData.mintDates[mint];
      const marketCaps = await this.marketCapService.getMarketCaps(
        coin.id,
        coinDates,
      );

      for (const marketCap of marketCaps) {
        const transactions =
          groupedData.transactionsByMintAndDates[mint]?.[marketCap.date] || [];
        for (const transaction of transactions) {
          bulkUpdateOperations.push({
            updateOne: {
              filter: { _id: transaction.id },
              update: { $set: { marketCap: marketCap.marketCap } },
            },
          });
        }
      }
    }

    if (bulkUpdateOperations.length) {
      await this.transactionService.bulkUpdate(bulkUpdateOperations);
    }
  }

  private async processCoins(holdings: any[]) {
    const symbolNames = {};
    const symbols = holdings.map((holding) => {
      symbolNames[holding.symbol] = {
        name: holding.name,
        mint: holding.mintAddress,
      };
      return holding.symbol;
    });

    const coins = await this.marketCapService.getCoinsBySymbols(symbols);
    return this.filterDuplicateCoins(coins, symbolNames);
  }

  private filterDuplicateCoins(
    coins: any[],
    symbolNames: Record<string, { name: string; mint: string }>,
  ) {
    const symbolCount = new Map<string, number>();
    const duplicateSymbols = new Set<string>();

    for (const coin of coins) {
      const symbol = coin.symbol;
      if (symbol) {
        symbolCount.set(symbol, (symbolCount.get(symbol) || 0) + 1);
        if (symbolCount.get(symbol) > 1) {
          duplicateSymbols.add(symbol);
        }
      }
    }

    const matchedCoins = coins.filter((coin) => {
      if (!duplicateSymbols.has(coin.symbol)) return true;
      return symbolNames[coin.symbol]?.name === coin.name;
    });

    return matchedCoins;
  }
}
