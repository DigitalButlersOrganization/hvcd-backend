import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateFeedDto {
  @ApiProperty({
    required: true,
    example: 'Feed 1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  betSize?: number;

  @ApiProperty({
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  sellSize?: number;

  @ApiProperty({
    example: ['67daa980830e138424036e67'],
  })
  @IsArray()
  @IsOptional()
  wallets: Array<string>;
}
