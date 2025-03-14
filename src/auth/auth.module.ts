import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { UserModule } from '../user/user.module.js';
import { OtpModule } from '../otp/otp.module.js';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './guards/auth.guard.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RevokeRefreshToken,
  RevokeRefreshTokenSchema,
} from './schemas/revoke-refresh-token.schema.js';
import { RevokeRefreshTokenService } from './services/revoke-refresh-token.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RevokeRefreshTokenService],
  imports: [
    UserModule,
    OtpModule,
    JwtModule.register({
      global: true,
      publicKey: readFileSync(path.resolve('./secrets/public-key.pem'), 'utf8'),
      privateKey: readFileSync(
        path.resolve('./secrets/private-key.pem'),
        'utf8',
      ),
      signOptions: { expiresIn: '1d', algorithm: 'ES256' },
    }),
    MongooseModule.forFeature([
      { name: RevokeRefreshToken.name, schema: RevokeRefreshTokenSchema },
    ]),
  ],
})
export class AuthModule {}
