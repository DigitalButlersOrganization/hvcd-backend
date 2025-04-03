import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HeliusService } from '../helius/helius.service.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { InjectModel } from '@nestjs/mongoose';
import { PriceHistory } from '../price-history/schemas/price-history.schema.js';
import { Model } from 'mongoose';
import { TransactionService } from '../transaction/transaction.service.js';
import { Wallet } from '../wallet/schemas/wallet.schema.js';

@Controller('test')
@ApiTags('Test')
@Injectable()
export class TestController {
  constructor(
    private readonly heliusService: HeliusService,
    private readonly priceHistoryService: PriceHistoryService,
    @InjectModel(PriceHistory.name)
    private readonly priceHistoryModel: Model<PriceHistory>,
    private readonly transactionService: TransactionService,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
  ) {}

  @Get()
  async test() {}

  @Get('price-history')
  async priceHistory() {
    let start = new Date('2025-03-28T00:00:00Z').getTime();
    let allKlines = [];
    let next = true;

    while (next) {
      const klines = await this.priceHistoryService.fetchKlines(
        'SOLUSDC',
        '1m',
        1000,
        start,
      );

      allKlines = [...allKlines, ...klines];

      if (klines.length < 1000) {
        next = false;
      } else {
        start = klines[klines.length - 1][0];
      }
    }

    const history = allKlines.map((kline) => ({
      price: kline[1],
      date: new Date(kline[0]),
    }));

    await this.priceHistoryModel.insertMany(history);
  }

  // @Get()
  // async test() {
  //   const address = 'F19MQcxNeNFdEPSakkXvWqDyRShNJFkL61dfxBF7thJ8';
  //   //const tokenAccounts =
  //   // await this.heliusService.getTokenAccountsByOwner(address);
  //   // const assets = await this.heliusService.getAllAssetsByOwner(address);
  // }
}
