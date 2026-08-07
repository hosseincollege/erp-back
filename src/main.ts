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

  /**
   * اجازه ارتباط فرانت Next.js با بک‌اند NestJS در محیط توسعه.
   *
   * نمونه originهای مجاز:
   * - http://localhost:3005
   * - http://localhost:3000
   * - http://127.0.0.1:3005
   */
  app.enableCors({
    origin: (origin, callback) => {
      const isDevelopmentRequest =
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

      if (isDevelopmentRequest) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86_400,
  });

  /**
   * اعتبارسنجی و پاک‌سازی سراسری داده‌های ورودی DTO.
   */
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

  logger.log(`ERP Pro API is running on http://localhost:${port}`);
  logger.log(`Tickets endpoint: http://localhost:${port}/tickets`);
}

void bootstrap();
