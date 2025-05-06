import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @ApiProperty({
    example: 1,
    default: 1,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    default: 10,
    minimum: 5,
    required: false,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  limit?: number = 10;
}
