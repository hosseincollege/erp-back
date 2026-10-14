import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../core/auth/strategies/jwt.strategy';
import { PrismaService } from '../core/prisma/prisma.service';
import { isTestDataModuleKey, seedTestDataModule, TEST_DATA_MODULES } from './test-data';
import type { TestDataCounts } from './test-data/context';

@Injectable()
export class DevelopmentService {
  private readonly logger = new Logger(DevelopmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async getTestDataStatus(actor: AuthenticatedUser) {
    const { organizationId } = await this.requireAdministrator(actor);
    const runs = await this.prisma.developmentTestDataRun.findMany({ where: { organizationId } });
    const byModule = new Map(runs.map((run) => [run.moduleKey, run]));
    return {
      modules: TEST_DATA_MODULES.map((moduleKey) => {
        const run = byModule.get(moduleKey);
        const counts = (run?.recordCounts ?? {}) as Record<string, number>;
        return {
          moduleKey,
          applied: Boolean(run),
          appliedAt: run?.appliedAt.toISOString() ?? null,
          recordCounts: counts,
          totalRecords: Object.values(counts).reduce((total, value) => total + (typeof value === 'number' ? value : 0), 0),
        };
      }),
    };
  }

  async applyTestData(actor: AuthenticatedUser, moduleKeyValue: string) {
    const { organizationId } = await this.requireAdministrator(actor);
    if (!isTestDataModuleKey(moduleKeyValue)) {
      throw new NotFoundException('ماژول دادهٔ آزمایشی پیدا نشد.');
    }
    const moduleKey = moduleKeyValue;
    const organizationUsers = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        user: { status: 'ACTIVE' },
      },
      orderBy: { user: { username: 'asc' } },
      select: { userId: true },
    });
    const userIds = organizationUsers.map(({ userId }) => userId);
    return this.prisma.$transaction(async (db) => {
      const counts = await seedTestDataModule(moduleKey, {
        db,
        organizationId,
        userId: actor.id,
        userIds,
        now: new Date(),
      });
      const run = await db.developmentTestDataRun.upsert({
        where: { organizationId_moduleKey: { organizationId, moduleKey } },
        create: { organizationId, appliedById: actor.id, moduleKey, recordCounts: counts },
        update: { appliedById: actor.id, recordCounts: counts, appliedAt: new Date() },
      });
      return {
        moduleKey,
        applied: true,
        appliedAt: run.appliedAt.toISOString(),
        recordCounts: counts as TestDataCounts,
        totalRecords: Object.values(counts).reduce((total, value) => total + value, 0),
      };
    });
  }

  async listAccounts(actor: AuthenticatedUser) {
    const { organizationId, administratorId } = await this.requireAdministrator(actor, true);
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        user: { status: 'ACTIVE', id: { notIn: [actor.id, administratorId] } },
      },
      orderBy: { user: { username: 'asc' } },
      take: 200,
      select: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      accounts: memberships.map(({ user }) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.username,
      })),
    };
  }

  async switchAccount(actor: AuthenticatedUser, targetUserId: string) {
    const { organizationId, administratorId } = await this.requireAdministrator(actor, true);
    if (targetUserId === actor.id || targetUserId === administratorId) {
      throw new ForbiddenException('انتخاب حساب جاری برای جابه‌جایی مجاز نیست.');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: targetUserId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        user: { status: 'ACTIVE' },
      },
      select: {
        organizationId: true,
        user: { select: { id: true, username: true } },
      },
    });
    if (!membership) {
      throw new NotFoundException('حساب فعال موردنظر در سازمان پیدا نشد.');
    }

    this.logger.warn(
      `Account view started: actor=${administratorId} target=${membership.user.id} organization=${organizationId}`,
    );

    return {
      access_token: this.jwtService.sign({
        sub: membership.user.id,
        username: membership.user.username,
        organizationId,
        impersonatedBy: administratorId,
        impersonationOrganizationId: organizationId,
      }),
    };
  }

  async getImpersonationContext(user: AuthenticatedUser) {
    if (!user.impersonatedBy) return { isImpersonating: false as const };

    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.impersonatedBy },
        select: { id: true, username: true, firstName: true, lastName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, username: true, firstName: true, lastName: true },
      }),
    ]);

    return {
      isImpersonating: true as const,
      actor: actor
        ? {
            id: actor.id,
            username: actor.username,
            name: `${actor.firstName} ${actor.lastName}`.trim() || actor.username,
          }
        : null,
      target: target
        ? {
            id: target.id,
            username: target.username,
            name: `${target.firstName} ${target.lastName}`.trim() || target.username,
          }
        : null,
    };
  }

  async stopImpersonation(user: AuthenticatedUser) {
    const actorId = user.impersonatedBy;
    const organizationId = user.impersonationOrganizationId;
    if (!actorId || !organizationId) {
      throw new ForbiddenException('حالت جابه‌جایی حساب فعال نیست.');
    }

    const [actor, membership] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: actorId, status: 'ACTIVE' },
        select: { id: true, username: true },
      }),
      this.prisma.organizationMember.findFirst({
        where: {
          userId: actorId,
          organizationId,
          status: 'ACTIVE',
          organization: { status: 'ACTIVE' },
        },
        select: { organizationId: true },
      }),
    ]);
    if (!actor || !membership) {
      throw new UnauthorizedException(
        'حساب اصلی دیگر به این سازمان دسترسی فعال ندارد؛ دوباره وارد شوید.',
      );
    }

    this.logger.warn(
      `Account view ended: actor=${actor.id} target=${user.id} organization=${organizationId}`,
    );

    return {
      access_token: this.jwtService.sign({
        sub: actor.id,
        username: actor.username,
        organizationId,
      }),
    };
  }

  private async requireAdministrator(actor: AuthenticatedUser, allowImpersonation = false) {
    if (actor.impersonatedBy && !allowImpersonation) {
      throw new ForbiddenException(
        'در زمان مشاهده با حساب دیگر، امکان شروع جابه‌جایی تازه وجود ندارد.',
      );
    }
    const administratorId = actor.impersonatedBy ?? actor.id;
    const organizationId = actor.impersonatedBy
      ? actor.impersonationOrganizationId
      : actor.organizationId;
    if (!organizationId) {
      throw new ForbiddenException('حساب به سازمان فعالی متصل نیست.');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: administratorId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      select: {
        organization: { select: { ownerId: true } },
        roles: { select: { role: { select: { key: true } } } },
      },
    });
    if (!membership) {
      throw new ForbiddenException('عضویت فعال در سازمان لازم است.');
    }

    const isAdministrator =
      membership.organization.ownerId === administratorId ||
      membership.roles.some(({ role }) =>
        ['ADMIN', 'SUPER_ADMIN'].includes(role.key.toUpperCase()),
      );
    if (!isAdministrator) {
      throw new ForbiddenException(
        'جابه‌جایی حساب فقط برای مدیران سازمان فعال است.',
      );
    }

    return { organizationId, administratorId };
  }
}
