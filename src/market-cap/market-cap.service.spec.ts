import { Test, TestingModule } from '@nestjs/testing';
import { MarketCapService } from './market-cap.service.js';

describe('MarketCapService', () => {
  let service: MarketCapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketCapService],
    }).compile();

    service = module.get<MarketCapService>(MarketCapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
