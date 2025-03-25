import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto.js';

export class FindQueryDto extends PaginationDto {
  @ApiProperty({
    example: 'search',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
