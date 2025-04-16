import mongoose, { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { WalletDocument } from '../../wallet/schemas/wallet.schema.js';

export type TokenHoldingDocument = HydratedDocument<TokenHolding>;

@Schema({
  collection: 'tokenHoldings',
  autoIndex: true,
  versionKey: false,
  timestamps: true,
})
export class TokenHolding {
  @Prop({ required: true })
  mintAddress: string;

  @Prop({ required: true })
  balance: number;

  @Prop({ required: true })
  pricePerToken: number;

  @Prop({ required: true })
  totalPrice: number;

  @Prop()
  name: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  wallet: WalletDocument;

  @Prop()
  icon: string;
}

export const TokenHoldingSchema = SchemaFactory.createForClass(TokenHolding);
