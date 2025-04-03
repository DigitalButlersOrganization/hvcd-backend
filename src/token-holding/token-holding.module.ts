import { Module } from '@nestjs/common';
import { TokenHoldingService } from './token-holding.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TokenHolding,
  TokenHoldingSchema,
} from './schemas/token-holding.schema.js';
import { HeliusModule } from '../helius/helius.module.js';
import { TokenHoldingController } from './token-holding.controller.js';

@Module({
  providers: [TokenHoldingService],
  imports: [
    MongooseModule.forFeature([
      { name: TokenHolding.name, schema: TokenHoldingSchema },
    ]),
    HeliusModule,
  ],
  exports: [TokenHoldingService],
  controllers: [TokenHoldingController],
})
export class TokenHoldingModule {}
