/**
 * مسیر فایل:
 * backend/src/human-resources/human-resources.controller.ts
 *
 * هدف:
 * ارائه endpointهای مدیریت کارکنان و درخواست‌های مرخصی.
 *
 * همه endpointها توسط GlobalAuthGuard محافظت می‌شوند.
 * organizationId هرگز از body یا query خوانده نمی‌شود.
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  EmployeeStatus,
  EmploymentType,
  LeaveRequestStatus,
  LeaveType,
} from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateLeaveRequestStatusDto } from './dto/update-leave-request-status.dto';
import { HumanResourcesService } from './human-resources.service';

type CurrentAuthUser = {
  id: string;
  organizationId: string;
};

@Controller('human-resources')
export class HumanResourcesController {
  constructor(
    private readonly humanResourcesService: HumanResourcesService,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: CurrentAuthUser) {
    return this.humanResourcesService.getDashboard(user);
  }

  @Get('employees')
  getEmployees(
    @CurrentUser() user: CurrentAuthUser,
    @Query('search') search?: string,
    @Query('status') status?: EmployeeStatus,
    @Query('employmentType') employmentType?: EmploymentType,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.humanResourcesService.getEmployees(user, {
      search,
      status,
      employmentType,
      branchId,
      departmentId,
    });
  }

  @Get('employees/:id')
  getEmployeeById(
    @CurrentUser() user: CurrentAuthUser,
    @Param('id') employeeId: string,
  ) {
    return this.humanResourcesService.getEmployeeById(
      user,
      employeeId,
    );
  }

  @Post('employees')
  createEmployee(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.humanResourcesService.createEmployee(user, dto);
  }

  @Patch('employees/:id')
  updateEmployee(
    @CurrentUser() user: CurrentAuthUser,
    @Param('id') employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.humanResourcesService.updateEmployee(
      user,
      employeeId,
      dto,
    );
  }

  @Get('leave-requests')
  getLeaveRequests(
    @CurrentUser() user: CurrentAuthUser,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: LeaveRequestStatus,
    @Query('leaveType') leaveType?: LeaveType,
  ) {
    return this.humanResourcesService.getLeaveRequests(user, {
      employeeId,
      status,
      leaveType,
    });
  }

  @Get('leave-requests/:id')
  getLeaveRequestById(
    @CurrentUser() user: CurrentAuthUser,
    @Param('id') leaveRequestId: string,
  ) {
    return this.humanResourcesService.getLeaveRequestById(
      user,
      leaveRequestId,
    );
  }

  @Post('leave-requests')
  createLeaveRequest(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.humanResourcesService.createLeaveRequest(user, dto);
  }

  @Patch('leave-requests/:id/status')
  updateLeaveRequestStatus(
    @CurrentUser() user: CurrentAuthUser,
    @Param('id') leaveRequestId: string,
    @Body() dto: UpdateLeaveRequestStatusDto,
  ) {
    return this.humanResourcesService.updateLeaveRequestStatus(
      user,
      leaveRequestId,
      dto,
    );
  }
}
