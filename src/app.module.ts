import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { OtpModule } from './otp/otp.module.js';
import { WalletModule } from './wallet/wallet.module.js';
import { HeliusModule } from './helius/helius.module.js';

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
    AuthModule,
    UserModule,
    OtpModule,
    WalletModule,
    HeliusModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
