import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from '@solana/web3.js';
import { Model } from 'mongoose';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async createTransactions(transactions: any[], walletId: string) {
    await this.transactionModel.insertMany(
      transactions.map((transaction) => ({
        ...transaction,
        wallet: walletId,
      })),
    );
  }

  async findAll(userId: string) {
    return this.transactionModel.find({ user: userId });
  }
}
