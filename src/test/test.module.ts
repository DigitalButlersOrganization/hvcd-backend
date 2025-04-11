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
import {
  Transaction,
  TransactionSchema,
} from '../transaction/schemas/transaction.schema.js';

import {
  TokenHolding,
  TokenHoldingSchema,
} from '../token-holding/schemas/token-holding.schema.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  controllers: [TestController],
  imports: [
    MongooseModule.forFeature([
      { name: PriceHistory.name, schema: PriceHistorySchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: TokenHolding.name, schema: TokenHoldingSchema },
    ]),
    HeliusModule,
    PriceHistoryModule,
    TransactionModule,
    WalletModule,
  ],
})
export class TestModule {}
