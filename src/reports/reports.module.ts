import { Module } from '@nestjs/common';
import { PrismaModule } from '../core/prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Cross-module reporting endpoints, scoped to the authenticated organization
 * and filtered by the user's existing module permissions.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
