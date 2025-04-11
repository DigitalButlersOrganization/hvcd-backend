import { Module } from '@nestjs/common';
import { UserWalletService } from './user-wallet.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { UserWallet, UserWalletSchema } from './schemas/user-wallet.schema.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { UserWalletController } from './user-wallet.controller.js';
import { HeliusModule } from '../helius/helius.module.js';
import { TokenHoldingModule } from '../token-holding/token-holding.module.js';

@Module({
  providers: [UserWalletService],
  imports: [
    MongooseModule.forFeature([
      { name: UserWallet.name, schema: UserWalletSchema },
    ]),
    WalletModule,
    HeliusModule,
    TokenHoldingModule,
  ],
  controllers: [UserWalletController],
  exports: [UserWalletService],
})
export class UserWalletModule {}
