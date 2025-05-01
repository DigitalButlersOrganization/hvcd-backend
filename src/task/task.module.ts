import { Module } from '@nestjs/common';
import { TaskService } from './task.service.js';
import { Task, TaskSchema } from './schemas/task.schema.js';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  providers: [TaskService],
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
  ],
  exports: [TaskService],
})
export class TaskModule {}
