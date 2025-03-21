import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserWalletDto {
  @ApiProperty({
    example: 'My wallet',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'CTXZhvzSKjR1ojk8z1oLjzYPb83mQcDEADNLhGtjuYs7',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}
