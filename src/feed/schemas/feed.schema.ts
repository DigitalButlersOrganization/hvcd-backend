import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { WalletDocument } from '../../wallet/schemas/wallet.schema.js';
import { UserDocument } from '../../user/schemas/user.schema.js';

export type FeedDocument = HydratedDocument<Feed>;

@Schema({
  collection: 'feeds',
  timestamps: true,
  versionKey: false,
  autoIndex: true,
})
export class Feed {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop()
  betSize: number;

  @Prop()
  sellSize: number;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Wallet',
    required: true,
  })
  wallets: Array<WalletDocument>;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: UserDocument;
}

export const FeedSchema = SchemaFactory.createForClass(Feed);
