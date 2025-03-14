import { Injectable } from '@nestjs/common';
import Twilio from 'twilio';
import { ConfigService } from '@nestjs/config';
import { IOtpService } from './otp-service.interface.js';

@Injectable()
export class OtpService implements IOtpService {
  private twilio: Twilio.Twilio;
  private serviceSid: string;

  constructor(configService: ConfigService) {
    this.twilio = Twilio(
      configService.get<string>('TWILIO_ACCOUNT_SID'),
      configService.get<string>('TWILIO_TOKEN'),
    );
  }

  setServiceSid(serviceSid: string) {
    this.serviceSid = serviceSid;
  }

  async sendCode(phone: string): Promise<void> {
    await this.twilio.verify.v2
      .services(this.serviceSid)
      .verifications.create({ to: phone, channel: 'sms' });
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const response = await this.twilio.verify.v2
      .services(this.serviceSid)
      .verificationChecks.create({ to: phone, code: code });

    return Promise.resolve(response.valid);
  }
}
