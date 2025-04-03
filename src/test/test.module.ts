import { Module } from '@nestjs/common';
import { TestController } from './test.controller.js';
import { HeliusModule } from '../helius/helius.module.js';
import { PriceHistoryModule } from '../price-history/price-history.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PriceHistory,
  PriceHistorySchema,
} from '../price-history/schemas/price-history.schema.js';
import { TransactionModule } from '../transaction/transaction.module.js';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema.js';

@Module({
  controllers: [TestController],
  imports: [
    MongooseModule.forFeature([
      { name: PriceHistory.name, schema: PriceHistorySchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    HeliusModule,
    PriceHistoryModule,
    TransactionModule,
  ],
})
export class TestModule {}
