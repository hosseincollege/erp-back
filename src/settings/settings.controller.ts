// backend/src/settings/settings.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

import { SettingsService } from './settings.service';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';

import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

import { ImportOrganizationDto } from './dto/import-organization.dto';
import { SaveRoleDto } from './dto/save-role.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * دریافت آمار بازدیدکنندگان عمومی (بدون نیاز به احراز هویت)
   */
  @Public()
  @Get('public-stats')
  async getPublicStats() {
    return this.settingsService.getPublicStats();
  }

  /**
   * ثبت یک بازدید جدید بر اساس IP (عمومی)
   */
  @Public()
  @Post('public-track')
  async trackPublicVisit(@Req() req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return this.settingsService.trackVisit(ip.trim(), userAgent);
  }

  @Post('organization')
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.createOrganization(dto, user);
  }

  @Get('organization/:id')
  async getOrganization(@Param('id') id: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }
    return this.settingsService.getOrganization(id.trim());
  }

  @Put('organization/:id')
  async updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }
    return this.settingsService.updateOrganizationSettings(id.trim(), dto);
  }

  @Post('organization/import')
  async importOrganizationGeneral(
    @Body() dto: ImportOrganizationDto,
    @CurrentUser() user: any,
  ) {
    const organizationId: string | undefined =
      user?.organizationId ?? user?.organization?.id;

    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException(
        'شناسه سازمان معتبری برای کاربر یافت نشد. لطفاً ابتدا سازمان را ایجاد کنید یا وارد یک سازمان فعال شوید.',
      );
    }

    return this.settingsService.importOrganizationData(organizationId.trim(), dto);
  }

  @Get('roles/:organizationId')
  async getRoles(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getRoles(organizationId.trim());
  }

  @Put('roles/:organizationId')
  async saveRoles(
    @Param('organizationId') organizationId: string,
    @Body() roles: SaveRoleDto[],
  ) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    const payload = Array.isArray(roles) ? roles : (roles as any)?.roles || [];
    return this.settingsService.saveRoles(organizationId.trim(), payload);
  }

  @Get('branches/:organizationId')
  async getBranches(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getBranches(organizationId.trim());
  }

  @Post('branches')
  async createBranch(@Body() dto: CreateBranchDto) {
    if (!dto.organizationId || dto.organizationId.trim() === '') {
      throw new BadRequestException(
        'شناسه سازمان برای ایجاد شعبه الزامی است.',
      );
    }

    return this.settingsService.createBranch(dto);
  }

  @Put('branches/:id')
  async updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه شعبه نامعتبر است.');
    }

    return this.settingsService.updateBranch(id.trim(), dto);
  }

  @Delete('branches/:id')
  async deleteBranch(@Param('id') id: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه شعبه نامعتبر است.');
    }

    return this.settingsService.deleteBranch(id.trim());
  }

  @Get('departments/:organizationId')
  async getDepartments(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getDepartments(organizationId.trim());
  }

  @Post('departments')
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    if (!dto.organizationId || dto.organizationId.trim() === '') {
      throw new BadRequestException(
        'شناسه سازمان برای ایجاد دپارتمان الزامی است.',
      );
    }

    return this.settingsService.createDepartment(dto);
  }

  @Put('departments/:id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه دپارتمان نامعتبر است.');
    }

    return this.settingsService.updateDepartment(id.trim(), dto);
  }

  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه دپارتمان نامعتبر است.');
    }

    return this.settingsService.deleteDepartment(id.trim());
  }

  @Get('users/:organizationId')
  async getUsers(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getUsers(organizationId.trim());
  }

  /**
   * ذخیره و درون‌ریزی کاربران سازمان
   */
  @Put('users/:organizationId')
  async saveUsers(
    @Param('organizationId') organizationId: string,
    @Body() usersPayload: any,
  ) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    // استخراج ایمن لیست کاربران چه به صورت آرایه مستقیم و چه آبجکت
    let usersList: any[] = [];
    if (Array.isArray(usersPayload)) {
      usersList = usersPayload;
    } else if (usersPayload && Array.isArray(usersPayload.users)) {
      usersList = usersPayload.users;
    } else if (usersPayload && Array.isArray(usersPayload.data)) {
      usersList = usersPayload.data;
    }

    return this.settingsService.saveUsers(organizationId.trim(), usersList);
  }

  @Get('export/:organizationId')
  async exportOrganization(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.exportOrganizationData(organizationId.trim());
  }

  @Post('import/:organizationId')
  async importOrganization(
    @Param('organizationId') organizationId: string,
    @Body() dto: ImportOrganizationDto,
  ) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException(
        'شناسه سازمان در آدرس درخواست نامعتبر است.',
      );
    }

    return this.settingsService.importOrganizationData(organizationId.trim(), dto);
  }
}
