import { RefreshTokenGuard } from './refresh-token.guard.js';
import { JwtService } from '@nestjs/jwt';

describe('RefreshTokenGuard', () => {
  it('should be defined', () => {
    expect(new RefreshTokenGuard(new JwtService())).toBeDefined();
  });
});
