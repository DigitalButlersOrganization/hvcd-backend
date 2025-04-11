import { UserWalletDto } from './dto/user-wallet.dto.js';
import { UserWalletDocument } from './schemas/user-wallet.schema.js';
import { Trends } from './enums/trends.enum.js';

export class UserWalletMapper {
  static toDto(userWallet: UserWalletDocument): UserWalletDto {
    if (!userWallet) {
      return null;
    }

    return {
      id: userWallet.id,
      name: userWallet.name,
      publicAddress: userWallet.wallet.publicAddress,
      balance: userWallet.wallet.balance,
      creationDate: userWallet.wallet.creationDate,
      wallet: userWallet.wallet.id,
      winrate: {
        value: 10,
        trend: Trends.UP,
      },
      totalPnl: {
        value: 10,
        percent: 100,
        trend: Trends.UP,
      },
    };
  }
}
