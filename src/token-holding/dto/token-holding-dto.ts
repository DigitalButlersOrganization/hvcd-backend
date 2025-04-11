import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class TokenHoldingDto {
  @ApiProperty({
    example: 'TRUMP',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 80,
  })
  @IsNumber()
  pnl: number;

  @ApiProperty({
    example: 40,
  })
  @IsNumber()
  roi: number;

  @ApiProperty({
    example: 100,
  })
  @IsNumber()
  betSize: number;

  @ApiProperty({
    example: 100,
  })
  @IsNumber()
  balanceMaxHoldings: number;

  @ApiProperty({
    example: 100,
  })
  mintAddress: string;
}
