import { WalletDocument } from '../schemas/wallet.schema.js';

enum SortParams {
  PNL = 'pnl',
  WINRATE = 'winrate',
  creationDate = 'creationDate',
  BALANCE = 'balance',
  NAME = 'name',
}

export class FindAllQueryDto {
  walletIds?: WalletDocument[];
  period: number;
  sort?: {
    by: SortParams;
    order: 'asc' | 'desc';
  };
}
