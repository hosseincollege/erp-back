// Path: backend/src/settings/settings.module.ts
// این ماژول ارائه‌دهنده‌ها، کنترلر و وابستگی‌های مربوط به تنظیمات عمومی سیستم را پیکربندی می‌کند.

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
