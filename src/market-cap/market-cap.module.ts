import { Module } from '@nestjs/common';
import { MarketCapService } from './market-cap.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Coin, CoinSchema } from './schemas/coin.schema.js';
import { TaskModule } from '../task/task.module.js';
import { TransactionModule } from '../transaction/transaction.module.js';
import { MarketCap, MarketCapSchema } from './schemas/market-cap.schema.js';

@Module({
  providers: [MarketCapService],
  imports: [
    MongooseModule.forFeature([
      { name: Coin.name, schema: CoinSchema },
      { name: MarketCap.name, schema: MarketCapSchema },
    ]),
    TaskModule,
    TransactionModule,
  ],
  exports: [MarketCapService],
})
export class MarketCapModule {}
