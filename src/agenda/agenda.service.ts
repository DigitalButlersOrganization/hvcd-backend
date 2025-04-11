import { Inject, Injectable } from '@nestjs/common';
import { Agenda } from 'agenda';

@Injectable()
export class AgendaService {
  constructor(@Inject('AGENDA') private readonly agenda: Agenda) {}

  async scheduleTask(jobName: string, data: any, when: Date | string = 'now') {
    await this.agenda.schedule(when, jobName, data);
  }

  defineTask(jobName: string, handler: (job: any) => Promise<void>) {
    this.agenda.define(jobName, async (job) => {
      await handler(job);
    });
  }
}
