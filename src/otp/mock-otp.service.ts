import { Injectable } from '@nestjs/common';
import { IOtpService } from './otp-service.interface.js';

const MOCK_OTP_CODE = '426785';

@Injectable()
export class MockOtpService implements IOtpService {
  serviceSid: string;

  setServiceSid(serviceSid: string): void {
    this.serviceSid = serviceSid;
  }

  async sendCode(phone: string): Promise<void> {
    Promise.resolve(phone);
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    return Promise.resolve(code === MOCK_OTP_CODE);
  }
}
