import { PaginatedResult } from '../../shared/models/paginated-result.model.js';
import { UserWalletDto } from './user-wallet.dto.js';
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedUserWalletDto extends PaginatedResult<UserWalletDto> {
  @ApiProperty({
    type: [UserWalletDto],
  })
  declare items: UserWalletDto[];
}
