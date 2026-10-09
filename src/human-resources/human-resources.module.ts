/**
 * مسیر فایل:
 * backend/src/human-resources/human-resources.module.ts
 *
 * هدف:
 * ثبت controller و service ماژول منابع انسانی.
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../core/notifications/notifications.module';
import { HumanResourcesController } from './human-resources.controller';
import { HumanResourcesService } from './human-resources.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [HumanResourcesController],
  providers: [HumanResourcesService],
  exports: [HumanResourcesService],
})
export class HumanResourcesModule {}
