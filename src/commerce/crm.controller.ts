import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeadStatus } from '@prisma/client';

import { CurrentUser } from '../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../core/auth/decorators/permission.decorator';
import { PermissionsGuard } from '../core/auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../core/auth/strategies/jwt.strategy';
import {
  CreateAccountDto,
  CreateContactDto,
  CreateLeadDto,
  DisqualifyLeadDto,
  UpdateAccountDto,
  UpdateContactDto,
  UpdateLeadStatusDto,
} from './dto/crm.dto';
import { CrmCustomersService } from './crm-customers.service';

@Controller('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmController {
  constructor(private readonly crm: CrmCustomersService) {}

  @Get('accounts')
  @RequirePermission('crm.read', 'crm.write')
  findAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.crm.findAllAccounts(this.organizationId(user));
  }

  @Post('accounts')
  @RequirePermission('crm.write')
  createAccount(
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.createAccount(this.organizationId(user), user.id, dto);
  }

  @Get('accounts/:id')
  @RequirePermission('crm.read', 'crm.write')
  findAccount(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crm.findAccountById(this.organizationId(user), id);
  }

  @Patch('accounts/:id')
  @RequirePermission('crm.write')
  updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.updateAccount(this.organizationId(user), id, dto);
  }

  @Get('contacts')
  @RequirePermission('crm.read', 'crm.write')
  findContacts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountId') accountId?: string,
  ) {
    return this.crm.findAllContacts(this.organizationId(user), accountId);
  }

  @Post('contacts')
  @RequirePermission('crm.write')
  createContact(
    @Body() dto: CreateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.createContact(this.organizationId(user), user.id, dto);
  }

  @Get('contacts/:id')
  @RequirePermission('crm.read', 'crm.write')
  findContact(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crm.findContactById(this.organizationId(user), id);
  }

  @Patch('contacts/:id')
  @RequirePermission('crm.write')
  updateContact(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.updateContact(this.organizationId(user), id, dto);
  }

  @Get('leads')
  @RequirePermission('crm.read', 'crm.write')
  findLeads(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status', new ParseEnumPipe(LeadStatus, { optional: true }))
    status?: LeadStatus,
  ) {
    return this.crm.findAllLeads(this.organizationId(user), status);
  }

  @Post('leads')
  @RequirePermission('crm.write')
  createLead(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.createLead(this.organizationId(user), user.id, dto);
  }

  @Get('leads/:id')
  @RequirePermission('crm.read', 'crm.write')
  findLead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crm.findLeadById(this.organizationId(user), id);
  }

  @Patch('leads/:id/status')
  @RequirePermission('crm.write')
  updateLeadStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.updateLeadStatus(this.organizationId(user), id, dto);
  }

  @Post('leads/:id/qualify')
  @RequirePermission('crm.write')
  qualifyLead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crm.qualifyLead(this.organizationId(user), user.id, id);
  }

  @Post('leads/:id/disqualify')
  @RequirePermission('crm.write')
  disqualifyLead(
    @Param('id') id: string,
    @Body() dto: DisqualifyLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.disqualifyLead(this.organizationId(user), id, dto);
  }

  @Get('opportunities')
  @RequirePermission('crm.read', 'crm.write')
  findOpportunities(@CurrentUser() user: AuthenticatedUser) {
    return this.crm.findAllOpportunities(this.organizationId(user));
  }

  private organizationId(user: AuthenticatedUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException(
        'برای استفاده از CRM ابتدا باید کاربر عضو یک سازمان فعال باشد.',
      );
    }
    return user.organizationId;
  }
}
