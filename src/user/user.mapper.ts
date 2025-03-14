import { UserDocument } from './schemas/user.schema.js';
import { UserDto } from './dto/user.dto.js';

export class UserMapper {
  static toDto(user: UserDocument): UserDto {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
    };
  }
}
