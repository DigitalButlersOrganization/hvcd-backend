import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type RevokeRefreshTokenDocument = HydratedDocument<RevokeRefreshToken>;

@Schema({
  collection: 'revokeRefreshTokens',
  versionKey: false,
  autoIndex: true,
  timestamps: true,
})
export class RevokeRefreshToken {
  @Prop({ required: true })
  token: string;
}

export const RevokeRefreshTokenSchema =
  SchemaFactory.createForClass(RevokeRefreshToken);
