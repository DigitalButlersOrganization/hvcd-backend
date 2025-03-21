import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from './schemas/wallet.schema.js';
import { Model } from 'mongoose';
import { WalletMapper } from './wallet.mapper.js';
import { WalletDto } from './dto/wallet.dto.js';
import { HeliusService } from '../helius/helius.service.js';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    private readonly heliusService: HeliusService,
  ) {}

  async create(walletAddress: string): Promise<WalletDto> {
    await this.heliusService.getAccountInfo(walletAddress);

    const balance = await this.heliusService.getBalance(walletAddress);
    const wallet = await this.walletModel.create({
      address: walletAddress,
      creationDate: new Date(),
      balance: balance,
    });

    return WalletMapper.toDto(wallet);
  }

  async update(id: string): Promise<WalletDto> {
    const wallet = await this.walletModel.findById(id);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    wallet.balance = await this.heliusService.getBalance(wallet.address);
    await wallet.save();

    return WalletMapper.toDto(wallet);
  }

  async findOrCreate(address: string): Promise<WalletDto> {
    const wallet = await this.walletModel.findOne({ address });

    if (!wallet) {
      return this.create(address);
    }

    return WalletMapper.toDto(wallet);
  }
}
