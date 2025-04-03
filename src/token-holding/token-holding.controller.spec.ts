import { Test, TestingModule } from '@nestjs/testing';
import { TokenHoldingController } from './token-holding.controller.js';

describe('TokenHoldingController', () => {
  let controller: TokenHoldingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokenHoldingController],
    }).compile();

    controller = module.get<TokenHoldingController>(TokenHoldingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
