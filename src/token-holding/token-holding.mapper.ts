import { TokenHoldingDocument } from './schemas/token-holding.schema.js';

export class TokenHoldingMapper {
  static toDto(tokenHolding: TokenHoldingDocument) {
    if (!tokenHolding) {
      return null;
    }

    return {
      id: tokenHolding.id,
      name: tokenHolding.name,
      mintAddress: tokenHolding.mintAddress,
      pnl: 10,
      roi: 10,
      betSize: 1000,
      balanceMaxHoldings: 1000,
      balance: tokenHolding.balance,
      icon: tokenHolding.icon,
    };
  }
}
