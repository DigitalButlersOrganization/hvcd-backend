import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';
import qs from 'qs';
import axios, { AxiosInstance } from 'axios';

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
    const pk = new PublicKey(wallet);
    const accountInfo = await this.helius.getParsedAccountInfo(pk);

    if (!accountInfo) {
      throw new BadRequestException('Invalid address');
    }

    return accountInfo;
  }

  async getTokenAccountsByOwner(wallet: string) {
    const response = await this.post('getTokenAccountsByOwner', [
      wallet,
      {
        programId: this.configService.get<string>('HELIUS_PROGRAM_ID'),
      },
      {
        encoding: 'jsonParsed',
      },
    ]);

    return response.result;
  }

  async getSignaturesForAddress(wallet: string) {
    const response = await this.post('getSignaturesForAddress', [wallet]);

    return response.result;
  }

  async getTransaction(tx: string) {
    const response = await this.post('getTransaction', [tx]);

    return response.result;
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

    const transactions = await response.json();

    return transactions.map((transaction) => ({
      signature: transaction.signature,
      from: transaction.nativeTransfers[0].fromUserAccount,
      to: transaction.nativeTransfers[0].toUserAccount,
      fee: transaction.fee,
      feePayer: transaction.feePayer,
      amount: transaction.nativeTransfers[0].amount,
      date: new Date(transaction.timestamp * 1000),
      description: transaction.description,
    }));
  }

  private async post(method: string, params?: any[]): Promise<any> {
    const response = await this.client.post('', {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    });

    return response.data;
  }
}
