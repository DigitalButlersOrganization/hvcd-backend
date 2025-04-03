import { Module } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PriceHistory,
  PriceHistorySchema,
} from './schemas/price-history.schema.js';

@Module({
  providers: [PriceHistoryService],
  exports: [PriceHistoryService],
  imports: [
    MongooseModule.forFeature([
      { name: PriceHistory.name, schema: PriceHistorySchema },
    ]),
  ],
})
export class PriceHistoryModule {}
