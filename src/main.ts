/**
 * @file src/main.ts
 * @description ERP Pro backend bootstrap configuration for Local and Vercel Serverless
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';

import { AppModule } from './app.module';

const server: Express = express();
let isInitialized = false;

const allowedOrigins = [
  'https://erp-front-opal.vercel.app',
  'http://localhost:3000',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3005',
];

async function createNestApp(expressInstance: Express) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
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

  await app.init();
  return app;
}

// برای اجرای لوکال با دستوراتی مثل npm run start:dev
if (process.env.NODE_ENV !== 'production') {
  void (async () => {
    const logger = new Logger('Bootstrap');
    await createNestApp(server);
    isInitialized = true;
    const port = Number(process.env.PORT) || 3006;
    server.listen(port, () => {
      logger.log(`ERP Pro API is running on port ${port}`);
    });
  })();
}

// هندلر اصلی Vercel Serverless
export default async function handler(req: Request, res: Response) {
  if (!isInitialized) {
    await createNestApp(server);
    isInitialized = true;
  }
  server(req, res);
}
