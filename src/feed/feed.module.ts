import { Module } from '@nestjs/common';
import { FeedService } from './feed.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Feed, FeedSchema } from './schemas/feed.schema.js';
import { UserWalletModule } from '../user-wallet/user-wallet.module.js';
import { FeedController } from './feed.controller.js';

@Module({
  providers: [FeedService],
  imports: [
    MongooseModule.forFeature([{ name: Feed.name, schema: FeedSchema }]),
    UserWalletModule,
  ],
  controllers: [FeedController],
})
export class FeedModule {}
