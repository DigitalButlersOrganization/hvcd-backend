import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import qs from 'qs';

@Injectable()
export class HeliusService {
  private helius: Connection;

  constructor(private readonly configService: ConfigService) {
    this.helius = new Connection(
      this.configService.get<string>('HELIUS_SOLANA_RPC'),
    );
  }

  async getBalance(wallet: string): Promise<number> {
    const pk = new PublicKey(wallet);
    const balance = await this.helius.getBalance(pk);

    return balance / LAMPORTS_PER_SOL;
  }

  async getAccountInfo(wallet: string) {
    const pk = new PublicKey(wallet);
    const accountInfo = await this.helius.getAccountInfo(pk);

    if (!accountInfo) {
      throw new BadRequestException('Invalid address');
    }

    return accountInfo;
  }

  async getTransactionHistory(wallet: string, before: string = null) {
    const heliusSolanaApi = this.configService.get<string>('HELIUS_SOLANA_API');
    const heliusApiKey = this.configService.get<string>('HELIUS_API_KEY');
    const query = qs.stringify({
      'api-key': heliusApiKey,
      before: before,
    });

    const response = await fetch(
      `${heliusSolanaApi}v0/addresses/${wallet}/transactions?${query}`,
      {
        method: 'GET',
      },
    );

    return await response.json();
  }
}
