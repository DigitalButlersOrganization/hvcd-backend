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
  @Prop({ required: true })
  signature: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  wallet: WalletDocument;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
