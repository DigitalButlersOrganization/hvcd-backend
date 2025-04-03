import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserDocument } from '../../user/schemas/user.schema.js';
import mongoose from 'mongoose';
import { WalletDocument } from '../../wallet/schemas/wallet.schema.js';

export type UserWalletDocument = HydratedDocument<UserWallet>;

@Schema({
  collection: 'userWallets',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
})
export class UserWallet {
  @Prop({ required: true })
  name: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  wallet: WalletDocument;

  @Prop({ required: true })
  publicAddress: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: UserDocument;
}

export const UserWalletSchema = SchemaFactory.createForClass(UserWallet);
