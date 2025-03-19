import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateWalletDto {
  @ApiProperty({
    example: 'Wallet name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
