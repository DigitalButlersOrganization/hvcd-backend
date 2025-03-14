import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RevokeRefreshToken } from '../schemas/revoke-refresh-token.schema.js';
import { Model } from 'mongoose';

@Injectable()
export class RevokeRefreshTokenService {
  constructor(
    @InjectModel(RevokeRefreshToken.name)
    private readonly revokeRefreshTokenModel: Model<RevokeRefreshToken>,
  ) {}

  async revokeTokenExists(token: string): Promise<boolean> {
    const exists = await this.revokeRefreshTokenModel.exists({ token }).exec();

    return !!exists;
  }

  async create(token: string): Promise<void> {
    if (await this.revokeTokenExists(token)) {
      throw new ForbiddenException('Access denied.');
    }

    await this.revokeRefreshTokenModel.create({ token });
  }
}
