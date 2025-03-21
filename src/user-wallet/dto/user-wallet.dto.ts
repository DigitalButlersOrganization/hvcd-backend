import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Trends } from '../enums/trends.enum.js';

export class UserWalletDto {
  @ApiProperty({
    example: '67daa980830e138424036e67',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    example: 'My wallet',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 5,
  })
  @IsNumber()
  @IsNotEmpty()
  balance: number;

  @ApiProperty({
    example: 10,
  })
  walletAge: number;

  @ApiProperty({
    example: {
      value: 10,
      trend: Trends.UP,
    },
  })
  winrate: {
    value: number;
    trend: Trends;
  };

  @ApiProperty({
    example: {
      value: 10,
      percent: 100,
      trend: Trends.UP,
    },
  })
  totalPnl: {
    value: number;
    percent: number;
    trend: Trends;
  };
}
