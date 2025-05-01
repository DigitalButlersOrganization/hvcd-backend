import { TaskDocument } from './schemas/task.schema.js';
import { TaskDto } from './task.dto.js';

export class TaskMapper {
  static toDto(task: TaskDocument): TaskDto {
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      name: task.name,
      locked: task.locked,
      lockedAt: task.lockedAt,
    };
  }
}
