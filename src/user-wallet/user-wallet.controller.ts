import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UserWalletService } from './user-wallet.service.js';
import { CreateUserWalletDto } from './dto/create-user-wallet.dto.js';
import { UserWalletDto } from './dto/user-wallet.dto.js';
import { UpdateUserWalletDto } from './dto/update-user-wallet.dto.js';
import { PaginationDto } from '../shared/dto/pagination.dto.js';
import { PaginatedUserWalletDto } from './dto/paginated-user-wallet.dto.js';
import { FindQueryDto } from './dto/find-query.dto.js';

@Controller('user-wallet')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UserWalletController {
  constructor(private readonly userWalletService: UserWalletService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new wallet',
  })
  @ApiBody({
    type: CreateUserWalletDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The record has been successfully created.',
    type: UserWalletDto,
  })
  async create(
    @Body() createUserWalletDto: CreateUserWalletDto,
    @Req() request: Request,
  ): Promise<UserWalletDto> {
    return await this.userWalletService.create(
      createUserWalletDto,
      request['user'],
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a wallet',
  })
  @ApiBody({
    type: UpdateUserWalletDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been successfully updated.',
    type: UserWalletDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserWalletDto: UpdateUserWalletDto,
    @Req() request: Request,
  ): Promise<UserWalletDto> {
    return await this.userWalletService.update(
      id,
      updateUserWalletDto,
      request['user'],
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a wallet',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been successfully retrieved.',
    type: UserWalletDto,
  })
  async findOne(@Param('id') id: string, @Req() request: Request) {
    return await this.userWalletService.findOne(id, request['user']);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all wallets',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The recordset has been successfully retrieved.',
    type: PaginatedUserWalletDto,
  })
  async findAll(@Query() findQueryDto: FindQueryDto, @Req() request: Request) {
    return await this.userWalletService.findAll(request['user'], findQueryDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a wallet',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The record has been successfully deleted.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() request: Request) {
    return await this.userWalletService.remove(id, request['user']);
  }
}
