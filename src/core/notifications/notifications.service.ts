import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { SystemService } from '../system/system.service';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto';

export type LocalizedNotificationText = Record<
  'fa' | 'en' | 'ar' | 'zh-CN' | 'fr' | 'es' | 'de' | 'ru' | 'ja' | 'pt-BR',
  string
>;

export type CreateNotificationInput = {
  organizationId: string;
  recipientUserId: string;
  source: string;
  eventKey: string;
  title: LocalizedNotificationText;
  body?: LocalizedNotificationText;
  href?: string;
  metadata?: Prisma.InputJsonObject;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly system: SystemService) {}

  async getAnnouncementAccess(user: AuthenticatedUser) {
    if (!user.organizationId) return { canManage: false };
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId: user.organizationId, userId: user.id, status: 'ACTIVE' },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, organization: { select: { ownerId: true } } },
    });
    if (!membership) return { canManage: false };
    const keys = membership.roles.flatMap((item) => item.role.permissions.map((rp) => rp.permission.key));
    const isOrganizationSuperAdmin = membership.roles.some(
      ({ role }) => role.key === 'SUPER_ADMIN',
    );
    return {
      canManage:
        membership.organization.ownerId === user.id ||
        isOrganizationSuperAdmin ||
        keys.includes('announcements.write') ||
        keys.includes('settings.write'),
    };
  }

  async listAnnouncements(user: AuthenticatedUser) {
    if (!user.organizationId) return [];
    const rows = await this.prisma.announcement.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: { notifications: { where: { recipientUserId: user.id }, select: { id: true, readAt: true }, take: 1 } },
    });
    return rows.map(({ notifications, ...row }) => ({ ...row, notificationId: notifications[0]?.id ?? null, readAt: notifications[0]?.readAt ?? null }));
  }

  async createAnnouncement(user: AuthenticatedUser, dto: CreateAnnouncementDto) {
    const access = await this.getAnnouncementAccess(user);
    if (!access.canManage || !user.organizationId) throw new ForbiddenException('Announcement management permission is required.');
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId, status: 'ACTIVE', organization: { status: 'ACTIVE' } },
      select: { userId: true },
    });
    const announcement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({ data: {
        organizationId: user.organizationId!, createdByUserId: user.id, title: dto.title,
        summary: dto.summary || null, body: dto.body, locale: dto.locale ?? 'fa',
        category: dto.category ?? 'general', priority: dto.priority ?? 'normal', isPinned: dto.isPinned ?? false,
      } });
      if (members.length) await tx.notification.createMany({ data: members.map(({ userId }) => ({
        organizationId: user.organizationId!, recipientUserId: userId, source: 'announcements',
        eventKey: 'announcement.published', announcementId: created.id,
        title: { [created.locale]: created.title }, body: { [created.locale]: created.summary || created.body },
        href: '/dashboard#announcements', metadata: { category: created.category, priority: created.priority, isPinned: created.isPinned },
      })) });
      return created;
    });
    await this.system.recordActivity({ organizationId: user.organizationId, userId: user.id, action: AuditAction.CREATE, entity: 'ANNOUNCEMENT', entityId: announcement.id, metadata: { title: announcement.title, category: announcement.category } });
    return { ...announcement, recipientCount: members.length };
  }

  async archiveAnnouncement(user: AuthenticatedUser, id: string) {
    const access = await this.getAnnouncementAccess(user);
    if (!access.canManage || !user.organizationId) throw new ForbiddenException('Announcement management permission is required.');
    const existing = await this.prisma.announcement.findFirst({ where: { id, organizationId: user.organizationId, isActive: true } });
    if (!existing) throw new NotFoundException('Announcement was not found.');
    const updated = await this.prisma.announcement.update({ where: { id }, data: { isActive: false } });
    await this.system.recordActivity({ organizationId: user.organizationId, userId: user.id, action: AuditAction.UPDATE, entity: 'ANNOUNCEMENT', entityId: id, metadata: { title: existing.title, archived: true } });
    return updated;
  }

  /** Module services should call this to persist a localized notification for one active organization member. */
  async createForUser(input: CreateNotificationInput) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.recipientUserId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundException('Notification recipient is not an active organization member.');
    }

    return this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        recipientUserId: input.recipientUserId,
        source: input.source,
        eventKey: input.eventKey,
        title: input.title as Prisma.InputJsonValue,
        body: input.body as Prisma.InputJsonValue | undefined,
        href: input.href,
        metadata: input.metadata,
      },
    });
  }

  async list(user: AuthenticatedUser, options: { unreadOnly?: boolean; limit?: number; cursor?: string } = {}) {
    const organizationId = user.organizationId;
    if (!organizationId) return { items: [], unreadCount: 0 };

    const requestedLimit = Number.isFinite(options.limit) ? options.limit ?? 50 : 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const baseWhere = {
      organizationId,
      recipientUserId: user.id,
      ...(options.unreadOnly ? { readAt: null } : {}),
    };
    const cursorRecord = options.cursor
      ? await this.prisma.notification.findFirst({
          where: {
            id: options.cursor,
            organizationId,
            recipientUserId: user.id,
          },
          select: { id: true, createdAt: true },
        })
      : null;
    const where = {
      ...baseWhere,
      ...(cursorRecord
        ? {
            OR: [
              { createdAt: { lt: cursorRecord.createdAt } },
              {
                createdAt: cursorRecord.createdAt,
                id: { lt: cursorRecord.id },
              },
            ],
          }
        : {}),
    };

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      this.prisma.notification.count({
        where: { organizationId, recipientUserId: user.id, readAt: null },
      }),
    ]);

    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    return {
      items: pageItems,
      unreadCount,
      nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null,
    };
  }

  async getSummary(user: AuthenticatedUser) {
    const organizationId = user.organizationId;
    if (!organizationId) return { items: [], unreadCount: 0 };

    const where = { organizationId, recipientUserId: user.id };
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.notification.count({
        where: { ...where, readAt: null },
      }),
    ]);

    return { items, unreadCount };
  }

  async markRead(user: AuthenticatedUser, id: string) {
    const where = {
      id,
      organizationId: user.organizationId ?? '',
      recipientUserId: user.id,
    };
    const item = await this.prisma.notification.findFirst({ where });
    if (!item) throw new NotFoundException('Notification was not found.');

    if (!item.readAt) {
      return this.prisma.notification.update({
        where: { id: item.id },
        data: { readAt: new Date() },
      });
    }

    return item;
  }

  async markAllRead(user: AuthenticatedUser) {
    if (!user.organizationId) return { updated: 0 };

    const result = await this.prisma.notification.updateMany({
      where: {
        organizationId: user.organizationId,
        recipientUserId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }
}
