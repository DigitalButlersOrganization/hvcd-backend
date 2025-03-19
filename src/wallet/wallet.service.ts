import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWalletDto } from './dto/create-wallet.dto.js';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet } from './schemas/wallet.schema.js';
import { Model } from 'mongoose';
import { WalletMapper } from './wallet.mapper.js';
import { UpdateWalletDto } from './dto/update-wallet.dto.js';
import { WalletDto } from './dto/wallet.dto.js';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
  ) {}

  async create(
    createWalletDto: CreateWalletDto,
    userId: string,
  ): Promise<WalletDto> {
    const wallet = await this.walletModel.create({
      ...createWalletDto,
      user: userId,
      creationDate: new Date(),
    });

    return WalletMapper.toDto(wallet);
  }

  async update(
    id: string,
    updateWalletDto: UpdateWalletDto,
    userId: string,
  ): Promise<WalletDto> {
    const wallet = await this.walletModel.findOneAndUpdate(
      {
        _id: id,
        user: userId,
      },
      { name: updateWalletDto.name },
      {
        new: true,
      },
    );

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return WalletMapper.toDto(wallet);
  }

  async findOne(id: string, userId: string): Promise<WalletDto> {
    const wallet = await this.walletModel.findOne({
      _id: id,
      user: userId,
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return WalletMapper.toDto(wallet);
  }

  async findAll(userId: string) {
    const wallets = await this.walletModel.find({ user: userId });

    return wallets.map(WalletMapper.toDto);
  }

  async remove(id: string, userId: string) {
    const result = await this.walletModel.deleteOne({
      _id: id,
      user: userId,
    });

    if (!result.deletedCount) {
      throw new NotFoundException('Wallet not found');
    }
  }
}
