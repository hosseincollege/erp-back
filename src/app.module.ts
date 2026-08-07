/**
 * @file src/app.module.ts
 * @type backend
 * @description ماژول ریشه‌ی بک‌اند ERP Pro با ثبت ماژول‌های اصلی سیستم
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    /**
     * بارگذاری متغیرهای محیطی در کل برنامه
     * تا JWT_SECRET، DATABASE_URL و سایر تنظیمات
     * در همه‌ی ماژول‌ها در دسترس باشند.
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    /**
     * دسترسی سراسری به PrismaService
     */
    PrismaModule,

    /**
     * زیرساخت احراز هویت، JWT، گارد سراسری
     * و کنترل دسترسی مبتنی بر نقش
     */
    AuthModule,

    /**
     * ماژول مدیریت تیکت‌ها
     */
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
