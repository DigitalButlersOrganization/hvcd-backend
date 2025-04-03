import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service.js';
import { CreateFeedDto } from './dto/create-feed.dto.js';
import { UpdateFeedDto } from './dto/update-feed.dto.js';
import { FeedDto } from './dto/feed.dto.js';

@Controller('feed')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post()
  async create(
    @Body() createFeedDto: CreateFeedDto,
    @Req() request: Request,
  ): Promise<FeedDto> {
    return await this.feedService.create(createFeedDto, request['user']);
  }

  @Patch(':id')
  async update(
    @Body() updateFeedDto: UpdateFeedDto,
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<FeedDto> {
    return await this.feedService.update(updateFeedDto, id, request['user']);
  }

  @Get()
  async findAll(@Req() request: Request): Promise<FeedDto[]> {
    return await this.feedService.findAll(request['user']);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<void> {
    return await this.feedService.remove(id, request['user']);
  }
}
