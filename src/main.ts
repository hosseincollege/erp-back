import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // تنظیمات اصلاح شده CORS
  app.enableCors({
    origin: [
      'http://localhost:3005', 
      'https://erp-front-opal.vercel.app' // آدرس فرانت‌اَند ورسل تو
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true, // امنیت بیشتر برای MVP
    }),
  );

  // در محیط Vercel پورت خودکار مدیریت می‌شود
  await app.listen(process.env.PORT || 3006);
}
bootstrap();
