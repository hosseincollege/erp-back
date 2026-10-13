import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../core/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/strategies/jwt.strategy';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: string,
  ) {
    return this.reportsService.getOverview(user, period);
  }
}
