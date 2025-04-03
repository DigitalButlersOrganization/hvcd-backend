import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { TransactionController } from './transaction.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction } from '@solana/web3.js';
import { TransactionSchema } from './schemas/transaction.schema.js';
import { PriceHistoryModule } from '../price-history/price-history.module.js';
import { HeliusModule } from '../helius/helius.module.js';

@Module({
  providers: [TransactionService],
  controllers: [TransactionController],
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    PriceHistoryModule,
    HeliusModule,
  ],
  exports: [TransactionService],
})
export class TransactionModule {}
