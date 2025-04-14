import { UserWalletDto } from './dto/user-wallet.dto.js';
import { UserWalletDocument } from './schemas/user-wallet.schema.js';

export class UserWalletMapper {
  static toDto(userWallet: UserWalletDocument): UserWalletDto {
    if (!userWallet) {
      return null;
    }

    // TODO winrate and pnl
    return {
      id: userWallet.id,
      name: userWallet.name,
      publicAddress: userWallet.wallet.publicAddress,
      balance: userWallet.wallet.balance,
      creationDate: userWallet.wallet.creationDate,
      wallet: userWallet.wallet.id,
      winrate: null,
      totalPnl: null,
    };
  }
}
