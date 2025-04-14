import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class BaseUserWalletDto {
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
    example: '8VWcrZN4nLjhVDdtAnKtbJ6wPtzpFJjGvUU1rBPL5jQf',
  })
  @IsString()
  @IsNotEmpty()
  publicAddress: string;

  @ApiProperty({
    example: 5,
  })
  @IsNumber()
  @IsNotEmpty()
  balance: number;

  @ApiProperty({
    example: '67daa980830e138424036e68',
  })
  wallet: string;
}
