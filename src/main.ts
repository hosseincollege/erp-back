/**
 * @file src/main.ts
 * @description ERP Pro backend bootstrap configuration
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://erp-front-opal.vercel.app',
    'http://localhost:3000',
    'http://localhost:3005',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3005',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // درخواست‌های بدون هدر Origin (مانند curl و health check)
      if (!origin) {
        return callback(null, true);
      }

      // بررسی دامنه‌های مجاز و تمام زیردامنه‌های vercel.app مربوط به پروژه
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
    credentials: true,
    optionsSuccessStatus: 204,
    preflightContinue: false,
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
