import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaginationDto } from '../../shared/dto/pagination.dto.js';
import { Order } from '../enums/order.enum.js';

export class FindAllQueryDto extends PaginationDto {
  @ApiProperty({
    example: 'search',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: 'balance',
    required: false,
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiProperty({
    example: Order.ASC,
    required: false,
  })
  @IsOptional()
  @IsString()
  order?: Order;
}
