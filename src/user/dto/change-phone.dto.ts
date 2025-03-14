import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChangePhoneDto {
  @ApiProperty({
    example: '+375291111111',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/)
  newPhone: string;

  @ApiProperty({
    example: '426785',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  code: string;
}
