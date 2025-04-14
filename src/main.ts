import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import * as expressBasicAuth from 'express-basic-auth';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4040);
  const username = configService.get<string>('SWAGGER_BASIC_USERNAME');
  const auth = expressBasicAuth.default({
    users: { [username]: configService.get<string>('SWAGGER_BASIC_PASSWORD') },
    challenge: true,
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.use('/api/docs', auth);
  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('HVCD')
    .setDescription('HVCD')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      docExpansion: 'none',
    },
  });

  app.use(cookieParser());
  app.use(compression());
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: [
      configService.get<string>('FRONT_URI'),
      'https://db-hvcd-platform-dev.up.railway.app',
    ],
    credentials: true,
  });

  await app.listen(port);
}

bootstrap();
