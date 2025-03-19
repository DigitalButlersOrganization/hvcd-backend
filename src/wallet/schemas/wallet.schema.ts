import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserDocument } from '../../user/schemas/user.schema.js';
import mongoose from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({
  collection: 'wallets',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
})
export class Wallet {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  creationDate: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: UserDocument;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
