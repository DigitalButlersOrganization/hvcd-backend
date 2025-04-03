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
    example: 'F19MQcxNeNFdEPSakkXvWqDyRShNJFkL61dfxBF7thJ8',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}
