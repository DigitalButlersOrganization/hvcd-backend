import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateFeedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  betSize?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  sellSize?: number;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  wallets: Array<string>;
}
