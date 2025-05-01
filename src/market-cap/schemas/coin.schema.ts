import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CoinDocument = HydratedDocument<Coin>;

@Schema({
  collection: 'coins',
  timestamps: true,
  versionKey: false,
  autoIndex: true,
  _id: false,
})
export class Coin {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  mint: string;
}

export const CoinSchema = SchemaFactory.createForClass(Coin);
