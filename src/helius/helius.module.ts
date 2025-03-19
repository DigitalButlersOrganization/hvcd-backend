import { Module } from '@nestjs/common';
import { HeliusService } from './helius.service.js';

@Module({
  providers: [HeliusService],
})
export class HeliusModule {}
