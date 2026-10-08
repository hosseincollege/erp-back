// Path: backend/src/settings/settings.module.ts
// این ماژول ارائه‌دهنده‌ها، کنترلر و وابستگی‌های مربوط به تنظیمات عمومی سیستم را پیکربندی می‌کند.

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { OrganizationLogoStorageService } from './organization-logo-storage.service';
import { DepartmentStructureController } from './department-structure.controller';
import { DepartmentStructureService } from './department-structure.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController, DepartmentStructureController],
  providers: [
    SettingsService,
    OrganizationLogoStorageService,
    DepartmentStructureService,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
