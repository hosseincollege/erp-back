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
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
    return this.settingsService.getOrganization(id);
  }

  @Put('organization/:id')
  async updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }
    return this.settingsService.updateOrganizationSettings(id, dto);
  }

  /**
   * ایمپورت عمومی سازمان (شرکت + شعب + دپارتمان‌ها).
   * شناسه سازمان از کاربر متصل استخراج شده و در صورت نبود سازمان فعال، خطای ۴۰۰ بازگردانده می‌شود.
   */
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

    return this.settingsService.importOrganizationData(organizationId, dto);
  }

  @Get('roles/:organizationId')
  async getRoles(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getRoles(organizationId);
  }

  @Put('roles/:organizationId')
  async saveRoles(
    @Param('organizationId') organizationId: string,
    @Body() roles: SaveRoleDto[],
  ) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.saveRoles(organizationId, roles);
  }

  @Get('branches/:organizationId')
  async getBranches(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getBranches(organizationId);
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

    return this.settingsService.updateBranch(id, dto);
  }

  @Delete('branches/:id')
  async deleteBranch(@Param('id') id: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه شعبه نامعتبر است.');
    }

    return this.settingsService.deleteBranch(id);
  }

  @Get('departments/:organizationId')
  async getDepartments(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getDepartments(organizationId);
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

    return this.settingsService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('شناسه دپارتمان نامعتبر است.');
    }

    return this.settingsService.deleteDepartment(id);
  }

  @Get('users/:organizationId')
  async getUsers(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.getUsers(organizationId);
  }

  @Get('export/:organizationId')
  async exportOrganization(@Param('organizationId') organizationId: string) {
    if (!organizationId || organizationId.trim() === '') {
      throw new BadRequestException('شناسه سازمان نامعتبر است.');
    }

    return this.settingsService.exportOrganizationData(organizationId);
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

    return this.settingsService.importOrganizationData(organizationId, dto);
  }
}
