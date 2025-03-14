import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '67d19e5dd392172fae243c06',
    required: true,
  })
  id: string;

  @IsString()
  @ApiProperty({
    example: 'John',
    required: true,
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '+375291111111',
    required: true,
  })
  phone: string;
}
