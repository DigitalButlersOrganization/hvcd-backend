import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from './schemas/wallet.schema.js';
import { Model } from 'mongoose';
import { WalletMapper } from './wallet.mapper.js';
import { WalletDto } from './dto/wallet.dto.js';
import { HeliusService } from '../helius/helius.service.js';
import { TransactionService } from '../transaction/transaction.service.js';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    private readonly heliusService: HeliusService,
    private readonly transactionService: TransactionService,
  ) {}

  async create(walletAddress: string): Promise<WalletDto> {
    await this.heliusService.getAccountInfo(walletAddress);

    const balance = await this.heliusService.getBalance(walletAddress);
    const wallet = await this.walletModel.create({
      publicAddress: walletAddress,
      creationDate: new Date(),
      balance: balance,
    });

    const transactions =
      await this.heliusService.getTransactionHistory(walletAddress);
    await this.transactionService.createTransactions(transactions, wallet.id);

    return WalletMapper.toDto(wallet);
  }

  async update(id: string): Promise<WalletDto> {
    const wallet = await this.walletModel.findById(id);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    wallet.balance = await this.heliusService.getBalance(wallet.publicAddress);
    await wallet.save();

    return WalletMapper.toDto(wallet);
  }

  async findOrCreate(publicAddress: string): Promise<WalletDto> {
    const wallet = await this.walletModel.findOne({ publicAddress });

    if (!wallet) {
      return this.create(publicAddress);
    }

    return WalletMapper.toDto(wallet);
  }
}
