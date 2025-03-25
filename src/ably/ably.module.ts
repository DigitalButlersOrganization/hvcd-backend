import { Module } from '@nestjs/common';
import { AblyService } from './ably.service.js';

@Module({
  providers: [AblyService],
  exports: [AblyService],
})
export class AblyModule {}
