import { Test, TestingModule } from '@nestjs/testing';
import { AblyService } from './ably.service.js';
import { ConfigService } from '@nestjs/config';

describe('AblyService', () => {
  let service: AblyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AblyService, ConfigService],
    }).compile();

    service = module.get<AblyService>(AblyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
