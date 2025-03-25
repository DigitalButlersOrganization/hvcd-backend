import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({
  collection: 'wallets',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
})
export class Wallet {
  @Prop({ required: true, unique: true })
  publicAddress: string;

  @Prop({ required: true })
  creationDate: Date;

  @Prop({ required: true })
  balance: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
