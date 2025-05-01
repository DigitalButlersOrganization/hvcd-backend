import { Injectable, OnModuleInit } from '@nestjs/common';
import { CoinGeckoClient } from 'coingecko-api-v3';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskService } from '../task/task.service.js';
import { TransactionService } from '../transaction/transaction.service.js';
import { MarketCap, MarketCapDocument } from './schemas/market-cap.schema.js';
import { Coin } from './schemas/coin.schema.js';

@Injectable()
export class MarketCapService implements OnModuleInit {
  private readonly client: CoinGeckoClient;

  constructor(
    @InjectModel(Coin.name) private readonly coinModel: Model<Coin>,
    @InjectModel(MarketCap.name)
    private readonly marketCapModel: Model<MarketCap>,
    private readonly taskService: TaskService,
    private readonly transactionService: TransactionService,
  ) {
    this.client = new CoinGeckoClient({
      timeout: 10000,
      autoRetry: true,
    });
  }

  async onModuleInit() {
    await this.importCoinList();
  }

  async getCoinHistoricalData(coinId: string, date: string = null) {
    return await this.client.coinIdHistory({
      id: coinId,
      date: date,
    });
  }

  async getMarketCaps(coinGeckoId: string, dates: string[]) {
    const marketCapsDocuments: MarketCapDocument[] =
      await this.marketCapModel.find({
        coinGeckoId: coinGeckoId,
        date: {
          $in: dates,
        },
      });

    const dbMarketCaps = [];
    const coinGeckoMarketCaps = [];

    for (const marketCap of marketCapsDocuments) {
      dbMarketCaps.push({
        coinGeckoId: marketCap.id,
        date: marketCap.date,
        marketCap: marketCap.marketCap,
      });

      const index = dates.indexOf(marketCap.date);

      if (index !== -1) {
        dates.splice(index, 1);
      }
    }

    if (dates.length) {
      for (const date of dates) {
        const marketCap = await this.getCoinHistoricalData(coinGeckoId, date);

        if (marketCap?.market_data?.market_cap) {
          coinGeckoMarketCaps.push({
            coinGeckoId: coinGeckoId,
            date: date,
            marketCap: marketCap.market_data.market_cap.usd,
          });
        }
      }

      await this.marketCapModel.insertMany(coinGeckoMarketCaps);
    }

    return [...dbMarketCaps, ...coinGeckoMarketCaps];
  }

  async getCoinsBySymbols(symbols: string[]) {
    return this.coinModel.find({
      symbol: {
        $in: symbols,
      },
    });
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async importCoinList() {
    const coins = await this.client.coinList({
      include_platform: false,
    });

    const operations = coins.map((coin) => {
      coin.name = coin.name.toLowerCase();
      coin.symbol = coin.symbol.toLowerCase();

      return {
        updateOne: {
          filter: { id: coin.id },
          update: { $set: coin },
          upsert: true,
        },
      };
    });

    await this.coinModel.bulkWrite(operations);
  }
}
