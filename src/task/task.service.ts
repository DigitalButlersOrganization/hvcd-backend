import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task } from './schemas/task.schema.js';
import { Model } from 'mongoose';
import { TaskMapper } from './task.mapper.js';
import { TaskDto } from './task.dto.js';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<Task>,
  ) {}

  async findOrCrete(name: string): Promise<TaskDto> {
    let task = await this.taskModel.findOne({ name });

    if (!task) {
      task = await this.taskModel.create({ name });
    }

    return TaskMapper.toDto(task);
  }

  async acquireLock(name: string): Promise<void> {
    await this.taskModel.updateOne(
      {
        name,
        locked: false,
      },
      {
        locked: true,
        lockedAt: new Date(),
      },
    );
  }

  async releaseLock(name: string): Promise<void> {
    await this.taskModel.updateOne(
      {
        name,
        locked: true,
      },
      {
        locked: false,
        lockedAt: null,
      },
    );
  }
}
