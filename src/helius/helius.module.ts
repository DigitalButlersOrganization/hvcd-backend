import { Module } from '@nestjs/common';
import { HeliusService } from './helius.service.js';

@Module({
  providers: [HeliusService],
  exports: [HeliusService],
})
export class HeliusModule {}
