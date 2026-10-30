import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const user = { id: 'user-1', organizationId: 'org-1' };
  let getAllAndOverride: jest.Mock;
  let findMembership: jest.Mock;
  let guard: PermissionsGuard;

  const contextFor = (requestUser = user) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: requestUser }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    getAllAndOverride = jest.fn().mockReturnValue(['crm.read']);
    findMembership = jest.fn().mockResolvedValue({
      organization: { ownerId: 'owner-1' },
      roles: [
        {
          role: {
            key: 'SALES',
            permissions: [{ permission: { key: 'crm.read' } }],
          },
        },
      ],
    });
    guard = new PermissionsGuard(
      { getAllAndOverride } as unknown as Reflector,
      { organizationMember: { findFirst: findMembership } } as unknown as PrismaService,
    );
  });

  it('allows a member who has a required organization permission', async () => {
    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
    expect(findMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: user.id,
          organizationId: user.organizationId,
          status: 'ACTIVE',
          organization: { status: 'ACTIVE' },
        },
      }),
    );
  });

  it('denies a member who has none of the required permissions', async () => {
    findMembership.mockResolvedValueOnce({
      organization: { ownerId: 'owner-1' },
      roles: [{ role: { key: 'STAFF', permissions: [] } }],
    });

    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows an organization owner without an explicit permission assignment', async () => {
    findMembership.mockResolvedValueOnce({
      organization: { ownerId: user.id },
      roles: [],
    });

    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
  });

  it('allows organization administrators without an explicit permission assignment', async () => {
    findMembership.mockResolvedValueOnce({
      organization: { ownerId: 'owner-1' },
      roles: [{ role: { key: 'SUPER_ADMIN', permissions: [] } }],
    });

    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
  });

  it('fails closed when a guarded route has no permission metadata', async () => {
    getAllAndOverride.mockReturnValueOnce(undefined);

    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(findMembership).not.toHaveBeenCalled();
  });
});
