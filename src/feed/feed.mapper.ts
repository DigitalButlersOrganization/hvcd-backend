import { FeedDocument } from './schemas/feed.schema.js';
import { FeedDto } from './dto/feed.dto.js';

export class FeedMapper {
  static toDto(feed: FeedDocument): FeedDto {
    if (!feed) {
      return null;
    }

    return {
      id: feed.id,
      name: feed.name,
    };
  }
}
