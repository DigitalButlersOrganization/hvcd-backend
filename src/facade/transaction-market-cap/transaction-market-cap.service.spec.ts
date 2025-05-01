import { Test, TestingModule } from '@nestjs/testing';
import { TransactionMarketCapService } from './transaction-market-cap.service';

describe('TransactionMarketCapService', () => {
  let service: TransactionMarketCapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionMarketCapService],
    }).compile();

    service = module.get<TransactionMarketCapService>(TransactionMarketCapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
