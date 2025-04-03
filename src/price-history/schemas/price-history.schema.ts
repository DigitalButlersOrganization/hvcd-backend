import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PriceHistoryDocument = HydratedDocument<PriceHistory>;

@Schema({
  collection: 'priceHistory',
  versionKey: false,
  timestamps: true,
  autoIndex: true,
})
export class PriceHistory {
  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  date: Date;
}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);
