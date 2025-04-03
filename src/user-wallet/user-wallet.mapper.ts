import { UserWalletDto } from './dto/user-wallet.dto.js';
import { UserWalletDocument } from './schemas/user-wallet.schema.js';
import { Trends } from './enums/trends.enum.js';
import { TokenHoldingDocument } from '../token-holding/schemas/token-holding.schema.js';

export class UserWalletMapper {
  static toDto(userWallet: UserWalletDocument): UserWalletDto {
    if (!userWallet) {
      return null;
    }

    let tokenHoldings = [];
    if (userWallet.wallet.tokenHoldings) {
      tokenHoldings = userWallet.wallet.tokenHoldings.map(
        (tokenHolding: TokenHoldingDocument) => {
          return {
            mintAddress: tokenHolding.mintAddress,
            balance: tokenHolding.balance,
            name: tokenHolding.name,
            icon: tokenHolding.icon,
          };
        },
      );
    }

    return {
      id: userWallet.id,
      name: userWallet.name,
      publicAddress: userWallet.wallet.publicAddress,
      balance: userWallet.wallet.balance,
      creationDate: userWallet.wallet.creationDate,
      winrate: {
        value: 10,
        trend: Trends.UP,
      },
      totalPnl: {
        value: 10,
        percent: 100,
        trend: Trends.UP,
      },
      tokenHoldings: tokenHoldings,
    };
  }
}
