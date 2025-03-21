import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema.js';
import { HeliusModule } from '../helius/helius.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    HeliusModule,
  ],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
