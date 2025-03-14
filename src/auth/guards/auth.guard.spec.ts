import { AuthGuard } from './auth.guard.js';
import { JwtService } from '@nestjs/jwt';

describe('AuthGuard', () => {
  let jwtService: JwtService;
  beforeEach(() => {
    jwtService = new JwtService();
  });

  it('should be defined', () => {
    expect(new AuthGuard(jwtService)).toBeDefined();
  });
});
