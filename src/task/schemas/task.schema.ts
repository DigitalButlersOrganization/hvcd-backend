import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TaskDocument = HydratedDocument<Task>;

@Schema({
  collection: 'tasks',
  versionKey: false,
  autoIndex: true,
  timestamps: true,
})
export class Task {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: false })
  locked: boolean;

  @Prop()
  lockedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
