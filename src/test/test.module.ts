import { Module } from '@nestjs/common';
import { TestController } from './test.controller.js';
import { HeliusModule } from '../helius/helius.module.js';

@Module({
  controllers: [TestController],
  imports: [HeliusModule],
})
export class TestModule {}
