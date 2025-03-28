import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HeliusService } from '../helius/helius.service.js';

@Controller('test')
@ApiTags('Test')
@Injectable()
export class TestController {
  constructor(private readonly heliusService: HeliusService) {}

  @Get()
  async test() {
    const address = 'F19MQcxNeNFdEPSakkXvWqDyRShNJFkL61dfxBF7thJ8';
    const tokenAccounts =
      await this.heliusService.getTokenAccountsByOwner(address);
    const assets = await this.heliusService.getAllAssetsByOwner(address);

    return assets;
  }
}
