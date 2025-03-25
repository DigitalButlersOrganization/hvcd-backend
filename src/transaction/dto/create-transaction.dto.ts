import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  fee: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feePayer: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
