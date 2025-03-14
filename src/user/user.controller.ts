import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { UserDto } from './dto/user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ChangePhoneDto } from './dto/change-phone.dto.js';

@Controller('user')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@Req() request: Request): Promise<UserDto> {
    return await this.userService.findById(request['user']);
  }

  @Patch()
  @ApiBody({
    type: UpdateUserDto,
    description: 'Update user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Success',
  })
  async update(@Body() updateUserDto: UpdateUserDto, @Req() request: Request) {
    return await this.userService.update(updateUserDto, request['user']);
  }

  @Patch('phone')
  async changePhone(
    @Body() changePhoneDto: ChangePhoneDto,
    @Req() request: Request,
  ) {
    return await this.userService.changePhone(changePhoneDto, request['user']);
  }
}
