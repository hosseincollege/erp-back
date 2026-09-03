/**
 * @file src/main.ts
 * @description ERP Pro backend bootstrap configuration: CORS, validation and server startup
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://erp-front-opal.vercel.app',
    'http://localhost:3005',
    'http://localhost:3000',
    'http://127.0.0.1:3005',
    'http://127.0.0.1:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Requests without an Origin header are allowed
      // for example, server-to-server requests and health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },

    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Accept',
      'Content-Type',
      'Authorization',
    ],

    credentials: false,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = Number(process.env.PORT) || 3006;

  await app.listen(port);

  logger.log(`ERP Pro API is running on port ${port}`);
}

void bootstrap();
