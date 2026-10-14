import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../core/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/strategies/jwt.strategy';
import { DevelopmentService } from './development.service';

@Controller('development')
export class DevelopmentController {
  constructor(private readonly developmentService: DevelopmentService) {}

  @Get('accounts')
  listAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.developmentService.listAccounts(user);
  }

  @Post('accounts/:userId/switch')
  switchAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ) {
    return this.developmentService.switchAccount(user, targetUserId);
  }

  @Get('impersonation')
  getImpersonationContext(@CurrentUser() user: AuthenticatedUser) {
    return this.developmentService.getImpersonationContext(user);
  }

  @Post('impersonation/stop')
  stopImpersonation(@CurrentUser() user: AuthenticatedUser) {
    return this.developmentService.stopImpersonation(user);
  }

  @Get('test-data/status')
  getTestDataStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.developmentService.getTestDataStatus(user);
  }

  @Post('test-data/:moduleKey/apply')
  applyTestData(@CurrentUser() user: AuthenticatedUser, @Param('moduleKey') moduleKey: string) {
    return this.developmentService.applyTestData(user, moduleKey);
  }
}
