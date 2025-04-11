import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service.js';
import { Agenda } from 'agenda';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'AGENDA',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const agenda = new Agenda({
          db: {
            address: configService.get<string>('MONGODB_URI'),
          },
          processEvery: '1 second',
          maxConcurrency: 10,
        });
        await agenda.start();
        return agenda;
      },
    },
    AgendaService,
  ],
  exports: [AgendaService],
})
export class AgendaModule {}
