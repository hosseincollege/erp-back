// File: backend/src/settings/settings.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationSettings(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        branches: true,
        departments: true,
      },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async updateOrganizationSettings(id: string, data: any) {
    return this.prisma.organization.update({
      where: { id },
      data: {
        name: data.name,
        legalName: data.legalName,
        nationalId: data.nationalId,
        phone: data.phone,
        email: data.email,
        address: data.address,
        logoUrl: data.logoUrl,
        status: data.status,
      },
    });
  }

  async getBranches(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
    });
  }

  async createBranch(data: any) {
    return this.prisma.branch.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        isActive: data.isActive ?? true,
        organizationId: data.organizationId,
      },
    });
  }

  async updateBranch(id: string, data: any) {
    return this.prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        isActive: data.isActive,
      },
    });
  }

  async getDepartments(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: {
        branch: true,
      },
    });
  }

  async createDepartment(data: any) {
    return this.prisma.department.create({
      data: {
        name: data.name,
        code: data.code,
        isActive: data.isActive ?? true,
        organizationId: data.organizationId,
        branchId: data.branchId,
      },
    });
  }

  async updateDepartment(id: string, data: any) {
    return this.prisma.department.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        isActive: data.isActive,
        branchId: data.branchId,
      },
    });
  }
}
