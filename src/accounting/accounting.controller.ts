/**
 * مسیر فایل:
 * backend/src/accounting/accounting.controller.ts
 *
 * هدف:
 * ارائه endpointهای واقعی حسابداری برای فاکتور، وضعیت و پرداخت.
 *
 * همه endpointها به‌صورت خودکار توسط GlobalAuthGuard محافظت می‌شوند.
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
  AccountingInvoiceStatus,
  AccountingPriority,
} from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccountingService } from './accounting.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RegisterInvoicePaymentDto } from './dto/register-invoice-payment.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';

type CurrentAuthUser = {
  id: string;
  organizationId: string;
};

@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
  ) {}

  /**
   * دریافت خلاصه وضعیت حسابداری سازمان جاری
   */
  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: CurrentAuthUser,
  ) {
    return this.accountingService.getDashboard(user);
  }

  /**
   * دریافت فهرست فاکتورهای سازمان جاری
   */
  @Get('invoices')
  getInvoices(
    @CurrentUser() user: CurrentAuthUser,
    @Query('search') search?: string,
    @Query('status') status?: AccountingInvoiceStatus,
    @Query('priority') priority?: AccountingPriority,
    @Query('moduleType') moduleType?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.accountingService.getInvoices(user, {
      search,
      status,
      priority,
      moduleType,
      branchId,
      departmentId,
    });
  }

  /**
   * دریافت جزئیات یک فاکتور
   */
  @Get('invoices/:id')
  getInvoiceById(
    @CurrentUser() user: CurrentAuthUser,
    @Param('id') invoiceId: string,
  ) {
    return this.accountingService.getInvoiceById(
      user,
      invoiceId,
    );
  }

  /**
   * ایجاد فاکتور جدید
   */
  @Post('invoices')
  createInvoice(
    @CurrentUser() user: CurrentAuthUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.accountingService.createInvoice(
      user,
      dto,
    );
  }

  /**
   * تغییر وضعیت فاکتور و ثبت تاریخچه وضعیت
   */
  @Patch('invoices/:id/status')
  updateInvoiceStatus(
    @CurrentUser() user: CurrentAuthUser,
    @Param('id') invoiceId: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.accountingService.updateInvoiceStatus(
      user,
      invoiceId,
      dto,
    );
  }

  /**
   * ثبت پرداخت برای فاکتور
   */
  @Post('invoices/:id/payments')
  registerInvoicePayment(
    @CurrentUser() user: CurrentAuthUser,
    @Param('id') invoiceId: string,
    @Body() dto: RegisterInvoicePaymentDto,
  ) {
    return this.accountingService.registerInvoicePayment(
      user,
      invoiceId,
      dto,
    );
  }
}
