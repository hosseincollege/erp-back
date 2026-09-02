// Path: backend/src/settings/settings.service.ts

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import {
  ImportDepartmentItemDto,
  ImportOrganizationDto,
} from './dto/import-organization.dto';
import { SaveRoleDto } from './dto/save-role.dto';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(dto: CreateOrganizationDto, user: AuthenticatedUser) {
    if (!user?.id) {
      throw new ForbiddenException('کاربر احراز هویت نشده است.');
    }

    if (!user.isSystemUser) {
      throw new ForbiddenException(
        'فقط سوپرادمین سیستم می‌تواند سازمان اولیه را ایجاد کند.',
      );
    }

    const existingMembership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (existingMembership) {
      throw new ConflictException('این کاربر از قبل عضو یک سازمان فعال است.');
    }

    const existingOrganization = await this.prisma.organization.findUnique({
      where: {
        slug: dto.slug,
      },
      select: {
        id: true,
      },
    });

    if (existingOrganization) {
      throw new ConflictException('این شناسه سازمان قبلاً استفاده شده است.');
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          legalName: dto.legalName,
          nationalId: dto.nationalId,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          logoUrl: dto.logoUrl,
          ownerId: user.id,
          status: 'ACTIVE',
        },
      });

      const membership = await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      return {
        organization,
        membership,
        organizationId: organization.id,
      };
    });
  }

  async getOrganization(id: string) {
    return this.getOrganizationSettings(id);
  }

  async getOrganizationSettings(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        branches: true,
        departments: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`سازمان با شناسه ${id} یافت نشد.`);
    }

    return organization;
  }

  async getRoles(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [
          { organizationId },
          { isSystemRole: true },
        ],
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      key: role.key,
      description: role.description ?? '',
      isSystemRole: role.isSystemRole,
      userCount: role._count.members,
      permissions: role.permissions.map((rp) => rp.permission.key),
    }));
  }

  async saveRoles(organizationId: string, rolesDto: SaveRoleDto[]) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });

      if (!org) {
        throw new NotFoundException(`سازمان با شناسه ${organizationId} یافت نشد.`);
      }

      const processedRoleIds: string[] = [];

      for (const item of rolesDto) {
        const roleKey =
          item.key || item.name.trim().toLowerCase().replace(/\s+/g, '_');

        let role;

        if (item.id) {
          role = await tx.role.update({
            where: { id: item.id },
            data: {
              name: item.name,
              description: item.description,
            },
          });
        } else {
          const existingRole = await tx.role.findFirst({
            where: {
              organizationId,
              key: roleKey,
            },
          });

          if (existingRole) {
            role = await tx.role.update({
              where: { id: existingRole.id },
              data: {
                name: item.name,
                description: item.description,
              },
            });
          } else {
            role = await tx.role.create({
              data: {
                organizationId,
                name: item.name,
                key: roleKey,
                description: item.description,
              },
            });
          }
        }

        processedRoleIds.push(role.id);

        if (Array.isArray(item.permissions)) {
          await tx.rolePermission.deleteMany({
            where: { roleId: role.id },
          });

          if (item.permissions.length > 0) {
            const matchedPerms = await tx.permission.findMany({
              where: { key: { in: item.permissions } },
            });

            if (matchedPerms.length > 0) {
              await tx.rolePermission.createMany({
                data: matchedPerms.map((p) => ({
                  roleId: role.id,
                  permissionId: p.id,
                })),
              });
            }
          }
        }
      }

      await tx.role.deleteMany({
        where: {
          organizationId,
          isSystemRole: false,
          id: { notIn: processedRoleIds },
        },
      });

      return this.getRoles(organizationId);
    });
  }

  async getUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: {
        memberships: {
          some: {
            organizationId,
          },
        },
      },
      include: {
        memberships: {
          where: { organizationId },
          include: {
            organization: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOrganizationSettings(
    id: string,
    dto: UpdateOrganizationSettingsDto,
  ) {
    await this.getOrganizationSettings(id);

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.nationalId !== undefined && { nationalId: dto.nationalId }),
        ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber }),
        ...(dto.economicCode !== undefined && { economicCode: dto.economicCode }),
        ...(dto.taxOffice !== undefined && { taxOffice: dto.taxOffice }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.fiscalYearStart !== undefined && { fiscalYearStart: dto.fiscalYearStart }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async getBranches(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
    });
  }

  async createBranch(dto: CreateBranchDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException(
        `سازمان با شناسه ${dto.organizationId} یافت نشد.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isMain) {
        await tx.branch.updateMany({
          where: { organizationId: dto.organizationId, isMain: true },
          data: { isMain: false },
        });
      }

      return tx.branch.create({
        data: {
          name: dto.name,
          code: dto.code,
          address: dto.address,
          phone: dto.phone,
          email: dto.email,
          postalCode: dto.postalCode,
          isMain: dto.isMain ?? false,
          isActive: dto.isActive ?? true,
          organizationId: dto.organizationId,
        },
      });
    });
  }

  async updateBranch(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!branch) {
      throw new NotFoundException(`شعبه با شناسه ${id} یافت نشد.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isMain === true) {
        await tx.branch.updateMany({
          where: {
            organizationId: branch.organizationId,
            isMain: true,
            id: { not: id },
          },
          data: { isMain: false },
        });
      }

      return tx.branch.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
          ...(dto.isMain !== undefined && { isMain: dto.isMain }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    });
  }

  async deleteBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException(`شعبه با شناسه ${id} یافت نشد.`);
    }

    await this.prisma.$transaction([
      this.prisma.department.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      }),
      this.prisma.branch.delete({
        where: { id },
      }),
    ]);

    return { message: 'شعبه با موفقیت حذف شد.', id };
  }

  async getDepartments(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: { branch: true },
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException(
        `سازمان با شناسه ${dto.organizationId} یافت نشد.`,
      );
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, organizationId: dto.organizationId },
        select: { id: true },
      });

      if (!branch) {
        throw new NotFoundException(
          'شعبه انتخاب‌شده متعلق به این سازمان نیست یا وجود ندارد.',
        );
      }
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
        organizationId: dto.organizationId,
        branchId: dto.branchId,
      },
    });
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!department) {
      throw new NotFoundException(`دپارتمان با شناسه ${id} یافت نشد.`);
    }

    if (dto.branchId !== undefined && dto.branchId !== null) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          organizationId: department.organizationId,
        },
        select: { id: true },
      });

      if (!branch) {
        throw new NotFoundException(
          'شعبه انتخاب‌شده متعلق به سازمان دپارتمان نیست یا وجود ندارد.',
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteDepartment(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(`دپارتمان با شناسه ${id} یافت نشد.`);
    }

    await this.prisma.department.delete({
      where: { id },
    });

    return { message: 'دپارتمان با موفقیت حذف شد.', id };
  }

  async exportOrganizationData(organizationId: string) {
    return this.getOrganizationSettings(organizationId);
  }

  async importOrganizationData(
    organizationId: string,
    dto: ImportOrganizationDto,
  ) {
    await this.getOrganizationSettings(organizationId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.organization) {
        await tx.organization.update({
          where: { id: organizationId },
          data: {
            ...(dto.organization.name !== undefined && { name: dto.organization.name }),
            ...(dto.organization.legalName !== undefined && { legalName: dto.organization.legalName }),
            ...(dto.organization.nationalId !== undefined && { nationalId: dto.organization.nationalId }),
            ...(dto.organization.registrationNumber !== undefined && { registrationNumber: dto.organization.registrationNumber }),
            ...(dto.organization.economicCode !== undefined && { economicCode: dto.organization.economicCode }),
            ...(dto.organization.taxOffice !== undefined && { taxOffice: dto.organization.taxOffice }),
            ...(dto.organization.phone !== undefined && { phone: dto.organization.phone }),
            ...(dto.organization.email !== undefined && { email: dto.organization.email }),
            ...(dto.organization.website !== undefined && { website: dto.organization.website }),
            ...(dto.organization.address !== undefined && { address: dto.organization.address }),
            ...(dto.organization.postalCode !== undefined && { postalCode: dto.organization.postalCode }),
            ...(dto.organization.currency !== undefined && { currency: dto.organization.currency }),
            ...(dto.organization.fiscalYearStart !== undefined && { fiscalYearStart: dto.organization.fiscalYearStart }),
            ...(dto.organization.logoUrl !== undefined && { logoUrl: dto.organization.logoUrl }),
          },
        });
      }

      // نگاشت نام به شناسه شعب
      const branchIdByName = new Map<string, string>();
      const warnings: string[] = [];

      if (dto.branches && dto.branches.length > 0) {
        const mainBranches = dto.branches.filter((b) => b.isMain === true);
        if (mainBranches.length > 1) {
          throw new ConflictException('فقط یک شعبه می‌تواند به عنوان شعبه اصلی (isMain) مشخص شود.');
        }

        for (const branch of dto.branches) {
          const data = {
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone,
            email: branch.email,
            postalCode: branch.postalCode,
            isMain: branch.isMain ?? false,
            isActive: branch.isActive ?? true,
          };

          let savedBranch;
          if (branch.id) {
            savedBranch = await tx.branch.upsert({
              where: { id: branch.id },
              update: data,
              create: { ...data, id: branch.id, organizationId },
            });
          } else {
            savedBranch = await tx.branch.upsert({
              where: {
                organizationId_code: {
                  organizationId,
                  code: branch.code,
                },
              },
              update: data,
              create: { ...data, organizationId },
            });
          }
          branchIdByName.set(branch.name, savedBranch.id);
        }

        // تضمین وجود دقیقا یک شعبه اصلی در سازمان
        if (mainBranches.length === 0) {
          const firstBranchId = branchIdByName.values().next().value;
          if (firstBranchId) {
            await tx.branch.update({
              where: { id: firstBranchId },
              data: { isMain: true },
            });
          }
        } else {
          const designatedMainId = branchIdByName.get(mainBranches[0].name);
          if (designatedMainId) {
            await tx.branch.updateMany({
              where: {
                organizationId,
                isMain: true,
                id: { not: designatedMainId },
              },
              data: { isMain: false },
            });
          }
        }
      } else {
        const existing = await tx.branch.findMany({
          where: { organizationId },
          select: { id: true, name: true },
        });
        for (const b of existing) branchIdByName.set(b.name, b.id);
      }

      const resolveBranchId = (
        dept: ImportDepartmentItemDto,
      ): string | null => {
        if (dept.branchId) return dept.branchId;
        if (dept.branchName) {
          const resolved = branchIdByName.get(dept.branchName);
          if (!resolved) {
            warnings.push(
              `شعبه «${dept.branchName}» برای دپارتمان «${dept.name}» یافت نشد؛ دپارتمان بدون انتساب شعبه ذخیره شد.`,
            );
          }
          return resolved ?? null;
        }
        return null;
      };

      // پردازش دپارتمان‌ها
      if (dto.departments && dto.departments.length > 0) {
        for (const dept of dto.departments) {
          const branchId = resolveBranchId(dept);
          const data = {
            name: dept.name,
            code: dept.code,
            branchId,
            isActive: dept.isActive ?? true,
          };

          if (dept.id) {
            await tx.department.upsert({
              where: { id: dept.id },
              update: data,
              create: { ...data, id: dept.id, organizationId },
            });
          } else {
            await tx.department.upsert({
              where: {
                organizationId_code: {
                  organizationId,
                  code: dept.code,
                },
              },
              update: data,
              create: { ...data, organizationId },
            });
          }
        }
      }

      const result = await tx.organization.findUnique({
        where: { id: organizationId },
        include: {
          branches: true,
          departments: { include: { branch: true } },
        },
      });

      return { ...result, warnings };
    });
  }
}
