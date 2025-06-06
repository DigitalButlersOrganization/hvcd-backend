import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { OtpModule } from './otp/otp.module.js';
import { WalletModule } from './wallet/wallet.module.js';
import { HeliusModule } from './helius/helius.module.js';
import { UserWalletModule } from './user-wallet/user-wallet.module.js';
import { TransactionModule } from './transaction/transaction.module.js';
import { AblyModule } from './ably/ably.module.js';
import { TestModule } from './test/test.module.js';
import { TokenHoldingModule } from './token-holding/token-holding.module.js';
import { PriceHistoryModule } from './price-history/price-history.module.js';
import { FeedModule } from './feed/feed.module.js';
import { AgendaModule } from './agenda/agenda.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketCapModule } from './market-cap/market-cap.module.js';
import { TaskModule } from './task/task.module.js';
import { FacadeModule } from './facade/facade.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      expandVariables: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        user: configService.get<string>('MONGODB_USER'),
        pass: configService.get<string>('MONGODB_PASSWORD'),
        dbName: configService.get<string>('MONGODB_DB_NAME'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    OtpModule,
    WalletModule,
    HeliusModule,
    UserWalletModule,
    TransactionModule,
    AblyModule,
    TokenHoldingModule,
    PriceHistoryModule,
    FeedModule,
    TestModule,
    AgendaModule,
    MarketCapModule,
    TaskModule,
    FacadeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
