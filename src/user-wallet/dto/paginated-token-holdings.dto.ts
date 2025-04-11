import { PaginatedResult } from '../../shared/models/paginated-result.model.js';
import { TokenHoldingDto } from '../../token-holding/dto/token-holding-dto.js';
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedTokenHoldingsDto extends PaginatedResult<TokenHoldingDto> {
  @ApiProperty({
    type: [TokenHoldingDto],
  })
  declare items: TokenHoldingDto[];
}
