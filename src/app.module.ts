/**
 * مسیر فایل:
 * backend/src/app.module.ts
 *
 * هدف:
 * ماژول ریشه بک‌اند ERP Pro با ثبت ماژول‌های اصلی سیستم،
 * از جمله ماژول فاکتور، گردش وضعیت، پرداخت حسابداری
 * و ماژول منابع انسانی.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountingModule } from './accounting/accounting.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HumanResourcesModule } from './human-resources/human-resources.module';
import { PrismaModule } from './prisma/prisma.module';
import { SetupModule } from './setup/setup.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    /**
     * بارگذاری متغیرهای محیطی در کل برنامه
     * تا JWT_SECRET، DATABASE_URL و سایر تنظیمات
     * در همه ماژول‌ها در دسترس باشند.
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

    /**
     * ماژول بررسی وضعیت راه‌اندازی اولیه سیستم
     */
    SetupModule,

    /**
     * ماژول فاکتور، پرداخت و گردش تأیید حسابداری
     */
    AccountingModule,

    /**
     * ماژول مدیریت کارکنان و درخواست‌های مرخصی
     */
    HumanResourcesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
