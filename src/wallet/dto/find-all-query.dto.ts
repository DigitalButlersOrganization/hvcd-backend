import { WalletDocument } from '../schemas/wallet.schema.js';

export class FindAllQueryDto {
  walletIds?: WalletDocument[];
  period: number = 7;
  sort?: {
    by: string;
    order: 'asc' | 'desc';
  };
}
