import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Feed, FeedDocument } from './schemas/feed.schema.js';
import { Model } from 'mongoose';
import { FeedDto } from './dto/feed.dto.js';
import { FeedMapper } from './feed.mapper.js';
import { CreateFeedDto } from './dto/create-feed.dto.js';
import { UpdateFeedDto } from './dto/update-feed.dto.js';
import { UserWalletService } from '../user-wallet/user-wallet.service.js';
import { UserWalletDocument } from '../user-wallet/schemas/user-wallet.schema.js';
import transliterate from '@sindresorhus/transliterate';

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Feed.name) private readonly feedModel: Model<Feed>,
    private readonly userWalletService: UserWalletService,
  ) {}

  async create(createFeedDto: CreateFeedDto, userId: string) {
    const code = this.getCode(createFeedDto.name);

    if (code === 'all') {
      throw new BadRequestException(
        `The name "${createFeedDto.name}" is reserved and cannot be used.`,
      );
    }

    let feed = await this.feedModel.findOne({
      name: createFeedDto.name,
      user: userId,
    });

    if (feed) {
      throw new BadRequestException(
        `The name "${createFeedDto.name}" is already taken.`,
      );
    }

    if (createFeedDto.wallets && createFeedDto.wallets.length) {
      const userWallets = await this.userWalletService.findMany({
        user: userId,
        _id: { $in: createFeedDto.wallets },
      });

      createFeedDto.wallets = userWallets.map(
        (wallet: UserWalletDocument) => wallet.id,
      );
    }

    feed = await this.feedModel.create({
      ...createFeedDto,
      code,
      user: userId,
    });

    return FeedMapper.toDto(feed);
  }

  async update(updateFeedDto: UpdateFeedDto, id: string, userId: string) {
    let feed: FeedDocument = await this.feedModel.findOne({
      _id: id,
      user: userId,
    });

    if (!feed) {
      throw new NotFoundException('Feed not found');
    }

    const code = this.getCode(updateFeedDto.name);

    if (code === 'all') {
      throw new BadRequestException(
        `The name "${updateFeedDto.name}" is reserved and cannot be used.`,
      );
    }

    if (feed.name !== updateFeedDto.name) {
      const existingFeed = await this.feedModel.findOne({
        name: updateFeedDto.name,
        user: userId,
      });

      if (existingFeed) {
        throw new BadRequestException(
          `The name "${updateFeedDto.name}" is already taken.`,
        );
      }
    }

    if (updateFeedDto.wallets && updateFeedDto.wallets.length) {
      const userWallets = await this.userWalletService.findMany({
        user: userId,
        _id: { $in: updateFeedDto.wallets },
      });

      feed.wallets = userWallets.map((wallet: UserWalletDocument) => wallet.id);
    }

    feed.name = updateFeedDto.name;
    feed.betSize = updateFeedDto.betSize;
    feed.sellSize = updateFeedDto.sellSize;
    await feed.save();

    return FeedMapper.toDto(feed);
  }

  async remove(id: string, userId: string) {
    const result = await this.feedModel.deleteOne({ _id: id, user: userId });

    if (!result.deletedCount) {
      throw new NotFoundException('Feed not found');
    }
  }

  async findAll(userId: string): Promise<FeedDto[]> {
    const feeds: FeedDocument[] = await this.feedModel.find({
      user: userId,
    });

    return feeds.map(FeedMapper.toDto);
  }

  async feedElements() {}

  private getCode(name: string) {
    return transliterate(name).toLowerCase().replace(/ /g, '_');
  }
}
