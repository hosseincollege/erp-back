import {
  Controller,
  Body,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('filter') filter?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.notificationsService.list(user, {
      unreadOnly: filter === 'unread',
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getSummary(user);
  }

  @Get('announcements/access')
  getAnnouncementAccess(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getAnnouncementAccess(user);
  }

  @Get('announcements')
  listAnnouncements(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listAnnouncements(user);
  }

  @Post('announcements')
  createAnnouncement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.notificationsService.createAnnouncement(user, dto);
  }

  @Patch('announcements/:id/archive')
  archiveAnnouncement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.archiveAnnouncement(user, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(user, id);
  }
}
