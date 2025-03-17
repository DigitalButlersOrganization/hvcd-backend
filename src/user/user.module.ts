import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema.js';
import { UserController } from './user.controller.js';
import { OtpModule } from '../otp/otp.module.js';

@Module({
  providers: [UserService],
  exports: [UserService],
  imports: [
    OtpModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
})
export class UserModule {}
