import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Ably from 'ably';
import { TokenDetails, TokenParams } from 'ably';

@Injectable()
export class AblyService {
  private readonly ably: Ably.Realtime;

  constructor(private readonly configService: ConfigService) {
    const ablyApiKey = this.configService.get<string>('ABLY_API_KEY');

    if (ablyApiKey) {
      this.ably = new Ably.Realtime({
        key: this.configService.get<string>('ABLY_API_KEY'),
      });
    }
  }

  /**
   * Creates or gets a channel from Ably service
   *
   * @param channelName
   */
  getChannel(channelName: string): Ably.RealtimeChannel {
    return this.ably.channels.get(channelName);
  }

  /**
   * Requests an access token from Ably services for chat rooms
   *
   * @param chatRoomKeys - chat room key from the db
   */
  async generateTokenRequest(chatRoomKeys: string[]): Promise<TokenDetails> {
    const capability = chatRoomKeys.reduce((acc, chatRoomKey) => {
      acc[chatRoomKey] = ['subscribe', 'publish'];

      return acc;
    }, {});

    const tokenParams: TokenParams = {
      capability: JSON.stringify(capability),
    };

    return await this.ably.auth.requestToken(tokenParams);
  }
}
