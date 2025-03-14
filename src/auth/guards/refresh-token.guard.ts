import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookies(request);

    if (token === null) {
      throw new ForbiddenException('Access denied.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      request['user'] = payload.sub;
    } catch {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }

  private extractTokenFromCookies(request: Request): string | null {
    return request.cookies.refreshToken;
  }
}
