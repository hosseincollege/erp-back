import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permission.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

type AuthenticatedRequest = { user?: AuthenticatedUser };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      throw new ForbiddenException('Route permissions are not configured.');
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user?.id || !user.organizationId) {
      throw new ForbiddenException('Active organization membership is required.');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId: user.organizationId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      select: {
        organization: { select: { ownerId: true } },
        roles: {
          select: {
            role: {
              select: {
                key: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Active organization membership is required.');
    }

    const isAdministrator =
      membership.organization.ownerId === user.id ||
      membership.roles.some(({ role }) =>
        ['ADMIN', 'SUPER_ADMIN'].includes(role.key.toUpperCase()),
      );
    const permissionKeys = new Set(
      membership.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    );

    if (
      !isAdministrator &&
      !requiredPermissions.some((permission) => permissionKeys.has(permission))
    ) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    return true;
  }
}
