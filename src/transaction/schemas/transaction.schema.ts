import mongoose, { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { WalletDocument } from '../../wallet/schemas/wallet.schema.js';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({
  collection: 'transactions',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
})
export class Transaction {
  @Prop({ required: true, unique: true })
  signature: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  wallet: WalletDocument;

  @Prop({ required: true })
  from: string;

  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  fee: number;

  @Prop({ required: true })
  feePayer: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  date: Date;

  @Prop()
  description: string;

  @Prop()
  type: string;

  @Prop()
  source: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
