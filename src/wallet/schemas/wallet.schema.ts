import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ _id: false })
class ImportStatus {
  @Prop({ default: null })
  lastTransaction: string;

  @Prop({ default: null })
  lastUpdatingAt: Date;

  @Prop({ default: false })
  done: boolean;

  @Prop({ default: false })
  isImporting: boolean;
}

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

  @Prop({
    type: ImportStatus,
    default: () => ({
      lastTransaction: null,
      lastUpdatingAt: null,
      done: false,
      isImporting: false,
    }),
  })
  importStatus: ImportStatus;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
