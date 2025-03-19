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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateWalletDto } from './dto/create-wallet.dto.js';
import { WalletService } from './wallet.service.js';
import { UpdateWalletDto } from './dto/update-wallet.dto.js';
import { WalletDto } from './dto/wallet.dto.js';

@Controller('wallet')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new wallet',
  })
  @ApiBody({
    type: CreateWalletDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The record has been successfully created.',
    type: WalletDto,
  })
  async create(
    @Body() createWalletDto: CreateWalletDto,
    @Req() request: Request,
  ): Promise<WalletDto> {
    return await this.walletService.create(createWalletDto, request['user']);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a wallet',
  })
  @ApiBody({
    type: UpdateWalletDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been successfully updated.',
    type: WalletDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @Req() request: Request,
  ): Promise<WalletDto> {
    return await this.walletService.update(
      id,
      updateWalletDto,
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
    type: WalletDto,
  })
  async findOne(@Param('id') id: string, @Req() request: Request) {
    return await this.walletService.findOne(id, request['user']);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all wallets',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The recordset has been successfully retrieved.',
    type: [WalletDto],
  })
  async findAll(@Req() request: Request) {
    return await this.walletService.findAll(request['user']);
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
    return await this.walletService.remove(id, request['user']);
  }
}
