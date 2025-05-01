import { Module } from '@nestjs/common';
import { MarketCapModule } from '../market-cap/market-cap.module.js';
import { TransactionModule } from '../transaction/transaction.module.js';
import { TransactionMarketCapService } from './transaction-market-cap/transaction-market-cap.service.js';
import { TaskModule } from '../task/task.module.js';
import { TokenHoldingModule } from '../token-holding/token-holding.module.js';
import { HeliusModule } from '../helius/helius.module.js';

@Module({
  imports: [
    MarketCapModule,
    TransactionModule,
    TaskModule,
    TokenHoldingModule,
    HeliusModule,
  ],
  providers: [TransactionMarketCapService],
  exports: [TransactionMarketCapService],
})
export class FacadeModule {}
