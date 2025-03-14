import { Test, TestingModule } from '@nestjs/testing';
import { RevokeRefreshTokenService } from './revoke-refresh-token.service.js';

describe('RevokeRefreshTokenService', () => {
  let service: RevokeRefreshTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevokeRefreshTokenService],
    }).compile();

    service = module.get<RevokeRefreshTokenService>(RevokeRefreshTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
