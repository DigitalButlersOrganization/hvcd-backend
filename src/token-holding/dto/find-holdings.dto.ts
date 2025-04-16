import { PaginationDto } from '../../shared/dto/pagination.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

enum SortFields {
  PNL = 'pnl',
  ROI = 'roi',
  BET_SIZE = 'betSize',
  BALANCE_MAX_HOLDINGS = 'balanceMaxHoldings',
}

enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

class Sort {
  @IsEnum(SortFields)
  by: SortFields;

  @IsEnum(SortOrder)
  order: SortOrder;
}

export class FindHoldingsDto extends PaginationDto {
  @ApiProperty({
    required: false,
    example: 'TRUMP',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: {
      by: SortFields.PNL,
      order: SortOrder.DESC,
    },
    required: false,
    description: 'Sorting parameters',
    enum: {
      by: Object.values(SortFields),
      order: Object.values(SortOrder),
    },
  })
  @IsOptional()
  @IsObject()
  sort: Sort;

  @ApiProperty({
    example: 7,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  period: number;
}
