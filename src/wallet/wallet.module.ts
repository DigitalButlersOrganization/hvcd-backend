import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
  ],
  providers: [WalletService],
  controllers: [WalletController],
})
export class WalletModule {}
