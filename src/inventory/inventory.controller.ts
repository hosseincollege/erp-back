// Path: backend/src/inventory/inventory.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateProductDto,
  CreateWarehouseDto,
  CreateReceiptDto,
  CreateIssueDto,
  CreateTransferDto,
} from './dto/inventory.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  private resolveOrgId(user: any, headerOrgId?: string): string {
    return user?.organizationId || headerOrgId || 'default-org';
  }

  @Get('summary')
  async getSummary(
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.getSummary(orgId);
    return { success: true, data };
  }

  @Get('products')
  async getProducts(
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.getProducts(orgId);
    return { success: true, data };
  }

  @Post('products')
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.createProduct(orgId, dto);
    return { success: true, data };
  }

  @Get('warehouses')
  async getWarehouses(
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.getWarehouses(orgId);
    return { success: true, data };
  }

  @Post('warehouses')
  async createWarehouse(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.createWarehouse(orgId, dto);
    return { success: true, data };
  }

  @Get('balances')
  async getBalances(
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.getBalances(orgId);
    return { success: true, data };
  }

  @Get('movements')
  async getMovements(
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.getMovements(orgId);
    return { success: true, data };
  }

  @Post('receipts')
  async createReceipt(
    @Body() dto: CreateReceiptDto,
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.createReceipt(orgId, dto);
    return { success: true, data };
  }

  @Post('issues')
  async createIssue(
    @Body() dto: CreateIssueDto,
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.createIssue(orgId, dto);
    return { success: true, data };
  }

  @Post('transfers')
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: any,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const data = await this.inventoryService.createTransfer(orgId, dto);
    return { success: true, data };
  }
}
