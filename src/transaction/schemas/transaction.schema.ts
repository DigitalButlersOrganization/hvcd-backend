import mongoose, { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { WalletDocument } from '../../wallet/schemas/wallet.schema.js';
import { TransactionActions } from '../enums/transaction-actions.enum.js';

export type TransactionDocument = HydratedDocument<Transaction>;

class Transfer {
  mint: string;
  amount: number;
  price: number;
  priceAmount: number;
}

@Schema({
  collection: 'transactions',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
})
export class Transaction {
  @Prop()
  description: string;

  @Prop()
  type: string;

  @Prop()
  source: string;

  @Prop({ required: true })
  fee: number;

  @Prop({ required: true })
  feePayer: string;

  @Prop({ required: true, unique: true })
  signature: string;

  @Prop({ required: true })
  from: Transfer;

  @Prop({ required: true })
  to: Transfer;

  @Prop({ required: true })
  date: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  wallet: WalletDocument;

  @Prop()
  action: TransactionActions;

  @Prop()
  tradableTokenMint: string;

  @Prop({ default: null })
  marketCap: number;

  @Prop()
  pnl: number;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  roi: number | string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
