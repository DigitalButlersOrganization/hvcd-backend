import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { TransactionsController } from './transactions.controller.js';

@Module({
  providers: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
