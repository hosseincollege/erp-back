// Path: backend/src/app.module.ts
// این فایل ماژول‌های اصلی برنامه NestJS را ثبت می‌کند.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountingModule } from './accounting/accounting.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommerceModule } from './commerce/commerce.module';
import { AuthModule } from './core/auth/auth.module';
import { HumanResourcesModule } from './human-resources/human-resources.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { SetupModule } from './core/setup/setup.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { SystemModule } from './core/system/system.module';
import { SupplyModule } from './supply/supply.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    SetupModule,
    AccountingModule,
    CommerceModule,
    HumanResourcesModule,
    SupplyModule,
    ReportsModule,
    SettingsModule,
    SupportModule,
    NotificationsModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
