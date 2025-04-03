import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TokenHolding } from './schemas/token-holding.schema.js';
import { Model } from 'mongoose';
import { HeliusService } from '../helius/helius.service.js';

@Injectable()
export class TokenHoldingService {
  constructor(
    @InjectModel(TokenHolding.name)
    private readonly tokenHoldingModel: Model<TokenHolding>,
    private readonly heliusService: HeliusService,
  ) {}

  async import(walletId: string, walletAddress: string) {
    const assets = await this.heliusService.getAllAssetsByOwner(walletAddress);

    console.log(assets);
    const tokenHoldings = assets.map((asset) => ({
      mintAddress: asset.id,
      balance: asset.token_info.balance,
      name: asset.content.metadata?.name,
      icon: asset.content.files[0]?.cdn_uri || '',
      wallet: walletId,
    }));

    await this.tokenHoldingModel.insertMany(tokenHoldings);
  }
}
