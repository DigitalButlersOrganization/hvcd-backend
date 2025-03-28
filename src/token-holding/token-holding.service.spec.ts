import { Test, TestingModule } from '@nestjs/testing';
import { TokenHoldingService } from './token-holding.service.js';

describe('TokenHoldingService', () => {
  let service: TokenHoldingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenHoldingService],
    }).compile();

    service = module.get<TokenHoldingService>(TokenHoldingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
