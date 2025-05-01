import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type MarketCapDocument = HydratedDocument<MarketCap>;

@Schema({
  collection: 'marketCaps',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
})
export class MarketCap {
  @Prop({ required: true })
  coinGeckoId: string;

  @Prop({ required: true })
  date: string;

  @Prop()
  marketCap?: number;
}

export const MarketCapSchema = SchemaFactory.createForClass(MarketCap);
MarketCapSchema.index({ coinGeckoId: 1, date: 1 }, { unique: true });
