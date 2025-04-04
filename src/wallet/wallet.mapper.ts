import { WalletDto } from './dto/wallet.dto.js';
import { WalletDocument } from './schemas/wallet.schema.js';

export class WalletMapper {
  static toDto(wallet: WalletDocument): WalletDto {
    return {
      id: wallet.id,
      publicAddress: wallet.publicAddress,
      creationDate: wallet.creationDate,
    };
  }
}
