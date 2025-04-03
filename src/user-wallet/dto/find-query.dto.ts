import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaginationDto } from '../../shared/dto/pagination.dto.js';
import { SortParams } from '../../wallet/enums/sort-params.enum.js';

export class FindQueryDto extends PaginationDto {
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: {
      by: 'pnl',
      order: 'asc',
    },
    required: false,
  })
  @IsOptional()
  sort: {
    by: SortParams;
    order: 'asc' | 'desc';
  };

  @ApiProperty({
    example: 7,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  period: number;
}
