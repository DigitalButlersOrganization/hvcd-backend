import { Controller, Get, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionService } from './transaction.service.js';

@Controller('transactions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all transactions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All transactions',
  })
  async findAll(@Req() request: Request) {
    return await this.transactionService.findAll(request['user']);
  }
}
