// File: backend/src/settings/settings.controller.ts

import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization/:id')
  async getOrganization(@Param('id') id: string) {
    return this.settingsService.getOrganizationSettings(id);
  }

  @Put('organization/:id')
  async updateOrganization(@Param('id') id: string, @Body() data: any) {
    return this.settingsService.updateOrganizationSettings(id, data);
  }

  @Get('branches/:organizationId')
  async getBranches(@Param('organizationId') orgId: string) {
    return this.settingsService.getBranches(orgId);
  }

  @Post('branches')
  async createBranch(@Body() data: any) {
    return this.settingsService.createBranch(data);
  }

  @Put('branches/:id')
  async updateBranch(@Param('id') id: string, @Body() data: any) {
    return this.settingsService.updateBranch(id, data);
  }

  @Get('departments/:organizationId')
  async getDepartments(@Param('organizationId') orgId: string) {
    return this.settingsService.getDepartments(orgId);
  }

  @Post('departments')
  async createDepartment(@Body() data: any) {
    return this.settingsService.createDepartment(data);
  }

  @Put('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body() data: any) {
    return this.settingsService.updateDepartment(id, data);
  }
}
