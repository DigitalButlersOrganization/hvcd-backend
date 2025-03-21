import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResult<T> {
  @ApiProperty({ description: 'Items', isArray: true })
  items: T[];

  @ApiProperty({ description: 'Total records number', example: 10 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Current limit on page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total page number', example: 10 })
  totalPages: number;
}
