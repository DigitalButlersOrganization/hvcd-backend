export interface ITransaction {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers: Array<ITokenTransfer>;
  nativeTransfers: Array<INativeTransfer>;
  accountData: Array<IAccountData>;
}

interface ITokenTransfer {
  fromTokenAccount: string;
  toTokenAccount: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

interface INativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

interface IAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: [];
}
