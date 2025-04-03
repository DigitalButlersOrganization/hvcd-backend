import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';
import qs from 'qs';
import axios, { AxiosInstance } from 'axios';
import { ITransaction } from './interfaces/transaction.interface.js';

@Injectable()
export class HeliusService {
  private helius: Connection;
  private client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.helius = new Connection(
      this.configService.get<string>('HELIUS_SOLANA_RPC'),
    );

    this.client = axios.create({
      baseURL: this.configService.get<string>('HELIUS_SOLANA_RPC'),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getBalance(wallet: string): Promise<number> {
    const pk = new PublicKey(wallet);
    return await this.helius.getBalance(pk);
  }

  async getAccountInfo(wallet: string) {
    const response = await this.post('getAccountInfo', [
      wallet,
      {
        encoding: 'base58',
      },
    ]);

    const accountInfo = response.value;

    if (!accountInfo) {
      throw new BadRequestException('Invalid address');
    }

    return accountInfo;
  }

  async getTokenAccountsByOwner(wallet: string) {
    return await this.post('getTokenAccountsByOwner', [
      wallet,
      {
        programId: this.configService.get<string>('HELIUS_PROGRAM_ID'),
      },
      {
        encoding: 'jsonParsed',
      },
    ]);
  }

  async getAssetsByOwner(wallet: string, page: number = 1) {
    const response = await fetch(
      this.configService.get<string>('HELIUS_SOLANA_RPC'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'text',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: wallet,
            page: page,
            limit: 50,
            sortBy: {
              sortBy: 'created',
              sortDirection: 'asc',
            },
            options: {
              showUnverifiedCollections: true,
              showCollectionMetadata: true,
              showGrandTotal: true,
              showFungible: true,
              showNativeBalance: true,
              showInscription: true,
              showZeroBalance: true,
            },
          },
        }),
      },
    );

    return (await response.json()).result.items;
  }

  async getAllAssetsByOwner(wallet: string) {
    let assets = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getAssetsByOwner(wallet, page);
      assets = assets.concat(response);
      hasMore = response.length === 50;
      page++;
      return response;
    }

    return assets;
  }

  async getSignaturesForAddress(wallet: string) {
    const response = await this.post('getSignaturesForAddress', [wallet]);

    return response.result;
  }

  async getTransaction(tx: string) {
    const response = await this.post('getTransaction', [tx]);

    return response.result;
  }

  async getTransactionHistory(
    wallet: string,
    before: string = null,
  ): Promise<ITransaction[]> {
    const heliusSolanaApi = this.configService.get<string>('HELIUS_SOLANA_API');
    const heliusApiKey = this.configService.get<string>('HELIUS_API_KEY');
    const params = {
      'api-key': heliusApiKey,
      type: 'SWAP',
    };

    if (before) {
      params['before'] = before;
    }

    const query = qs.stringify(params);

    const response = await fetch(
      `${heliusSolanaApi}v0/addresses/${wallet}/transactions?${query}`,
      {
        method: 'GET',
      },
    );

    return await response.json();
  }

  private async post(method: string, params?: any[]): Promise<any> {
    const response = await this.client.post('', {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    });

    return response.data.result;
  }
}
