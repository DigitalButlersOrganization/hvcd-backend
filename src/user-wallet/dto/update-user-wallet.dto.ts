import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserWalletDto {
  @ApiProperty({
    example: 'Wallet name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
