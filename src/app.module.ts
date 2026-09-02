// Path: backend/src/app.module.ts
// این فایل ماژول‌های اصلی برنامه NestJS را ثبت می‌کند؛ SettingsModule برای فعال‌شدن APIهای تنظیمات اضافه شده است.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountingModule } from './accounting/accounting.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HumanResourcesModule } from './human-resources/human-resources.module';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { SetupModule } from './setup/setup.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    TicketsModule,
    SetupModule,
    AccountingModule,
    HumanResourcesModule,
    InventoryModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
