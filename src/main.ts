/**
 * @file src/main.ts
 * @description ERP Pro backend bootstrap configuration for local and Vercel
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';

import { AppModule } from './app.module';

const server: Express = express();

let initializationPromise: Promise<void> | null = null;

const allowedOrigins = [
  'https://erp-front-opal.vercel.app',
  'http://localhost:3000',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3005',
];

function isOriginAllowed(origin: string): boolean {
  return (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app')
  );
}

async function createNestApp(expressInstance: Express): Promise<void> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Requests such as server-to-server calls may not have an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, isOriginAllowed(origin));
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
}

function initializeNestApp(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = createNestApp(server).catch((error) => {
      // Allow a later request to retry initialization.
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

// Vercel sets VERCEL=1. Outside Vercel, start a regular HTTP server.
if (process.env.VERCEL !== '1') {
  void (async () => {
    const logger = new Logger('Bootstrap');

    try {
      await initializeNestApp();

      const port = Number(process.env.PORT) || 3006;

      server.listen(port, () => {
        logger.log(`ERP Pro API is running on port ${port}`);
      });
    } catch (error) {
      logger.error('Failed to start ERP Pro API', error);
      process.exitCode = 1;
    }
  })();
}

// Vercel Serverless Function handler
export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await initializeNestApp();
    server(req, res);
  } catch (error) {
    const logger = new Logger('VercelHandler');
    logger.error('Failed to initialize ERP Pro API', error);

    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}
