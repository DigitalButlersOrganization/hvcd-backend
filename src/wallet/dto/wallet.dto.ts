import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class WalletDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicAddress: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  creationDate: Date;
}
