/**
 * مسیر فایل:
 * backend/src/accounting/accounting.service.ts
 *
 * هدف:
 * منطق تجاری ماژول حسابداری:
 * - ایجاد فاکتور و محاسبه امن مبلغ‌ها در سرور
 * - فهرست و جزئیات فاکتورهای سازمان جاری
 * - گردش وضعیت و ثبت تاریخچه
 * - ثبت پرداخت و تشخیص تسویه کامل
 *
 * اصل امنیتی:
 * همه queryها به organizationId کاربر لاگین‌شده محدود هستند.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AccountingInvoiceStatus,
  AccountingPriority,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RegisterInvoicePaymentDto } from './dto/register-invoice-payment.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';

type CurrentAuthUser = {
  id: string;
  organizationId: string;
};

type InvoiceListQuery = {
  search?: string;
  status?: AccountingInvoiceStatus;
  priority?: AccountingPriority;
  moduleType?: string;
  branchId?: string;
  departmentId?: string;
};


const invoiceInclude = {
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  lineItems: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  payments: {
    orderBy: {
      paidAt: 'desc',
    },
  },
  statusHistory: {
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      actedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  },
} satisfies Prisma.AccountingInvoiceInclude;

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: CurrentAuthUser) {
    const now = new Date();

    const [
      totalInvoices,
      pendingReview,
      approved,
      rejected,
      overdue,
      invoicesWithPayments,
    ] = await Promise.all([
      this.prisma.accountingInvoice.count({
        where: { organizationId: user.organizationId },
      }),
      this.prisma.accountingInvoice.count({
        where: {
          organizationId: user.organizationId,
          status: {
            in: [
              AccountingInvoiceStatus.PENDING_REVIEW,
              AccountingInvoiceStatus.SUBMITTED,
            ],
          },
        },
      }),
      this.prisma.accountingInvoice.count({
        where: {
          organizationId: user.organizationId,
          status: AccountingInvoiceStatus.APPROVED,
        },
      }),
      this.prisma.accountingInvoice.count({
        where: {
          organizationId: user.organizationId,
          status: AccountingInvoiceStatus.REJECTED,
        },
      }),
      this.prisma.accountingInvoice.count({
        where: {
          organizationId: user.organizationId,
          dueDate: { lt: now },
          status: {
            notIn: [
              AccountingInvoiceStatus.COMPLETED,
              AccountingInvoiceStatus.CANCELLED,
              AccountingInvoiceStatus.REJECTED,
            ],
          },
        },
      }),
      this.prisma.accountingInvoice.findMany({
        where: { organizationId: user.organizationId },
        select: {
          totalAmount: true,
          payments: {
            select: {
              paidAmount: true,
            },
          },
        },
      }),
    ]);

    const paid = invoicesWithPayments.filter((invoice) => {
      const totalAmount = Number(invoice.totalAmount);
      const paidAmount = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.paidAmount),
        0,
      );

      return paidAmount >= totalAmount && totalAmount > 0;
    }).length;

    return {
      totalInvoices,
      pendingReview,
      approved,
      rejected,
      paid,
      overdue,
    };
  }

  async getInvoices(
    user: CurrentAuthUser,
    query: InvoiceListQuery,
  ) {
    const where: Prisma.AccountingInvoiceWhereInput = {
      organizationId: user.organizationId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority as Prisma.EnumAccountingPriorityFilter;
    }

    if (query.moduleType) {
      where.moduleType = query.moduleType;
    }

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      where.OR = [
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const invoices = await this.prisma.accountingInvoice.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invoices.map((invoice) => this.toListItem(invoice));
  }

  async getInvoiceById(
    user: CurrentAuthUser,
    invoiceId: string,
  ) {
    const invoice = await this.findInvoiceOrThrow(
      user.organizationId,
      invoiceId,
    );

    return this.toDetail(invoice);
  }

  async createInvoice(
    user: CurrentAuthUser,
    dto: CreateInvoiceDto,
  ) {
    if (!dto.lineItems?.length) {
      throw new BadRequestException(
        'حداقل یک ردیف برای فاکتور لازم است.',
      );
    }

    await this.ensureBranchAndDepartmentBelongToOrganization(
      user.organizationId,
      dto.branchId,
      dto.departmentId,
    );

    const normalizedItems = dto.lineItems.map((item, index) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const taxRate = Number(item.taxRate ?? 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `تعداد ردیف ${index + 1} باید بیشتر از صفر باشد.`,
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException(
          `قیمت واحد ردیف ${index + 1} معتبر نیست.`,
        );
      }

      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        throw new BadRequestException(
          `نرخ مالیات ردیف ${index + 1} باید بین صفر تا صد باشد.`,
        );
      }

      const total = this.roundMoney(
        quantity * unitPrice * (1 + taxRate / 100),
      );

      return {
        description: item.description.trim(),
        quantity,
        unitPrice,
        taxRate,
        total,
      };
    });

    const totalAmount = this.roundMoney(
      normalizedItems.reduce((sum, item) => sum + item.total, 0),
    );

    if (totalAmount <= 0) {
      throw new BadRequestException(
        'مبلغ نهایی فاکتور باید بیشتر از صفر باشد.',
      );
    }

    const documentNumber = await this.generateDocumentNumber(
      user.organizationId,
    );

    const invoice = await this.prisma.accountingInvoice.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        branchId: dto.branchId || null,
        departmentId: dto.departmentId || null,
        documentNumber,
        title: dto.title.trim(),
        vendorName: dto.vendorName?.trim() || null,
        description: dto.description?.trim() || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        currency: dto.currency?.trim().toUpperCase() || 'IRR',
        priority: dto.priority ?? 'MEDIUM',
        status: AccountingInvoiceStatus.PENDING_REVIEW,
        totalAmount,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        lineItems: {
          create: normalizedItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            total: item.total,
          })),
        },
        statusHistory: {
          create: {
            actedById: user.id,
            status: AccountingInvoiceStatus.PENDING_REVIEW,
            note: 'فاکتور ایجاد شد و در انتظار بررسی است.',
          },
        },
      },
      include: invoiceInclude,
    });

    return this.toDetail(invoice);
  }

  async updateInvoiceStatus(
    user: CurrentAuthUser,
    invoiceId: string,
    dto: UpdateInvoiceStatusDto,
  ) {
    await this.findInvoiceOrThrow(user.organizationId, invoiceId);

    const invoice = await this.prisma.accountingInvoice.update({
      where: { id: invoiceId },
      data: {
        status: dto.status,
        statusHistory: {
          create: {
            actedById: user.id,
            status: dto.status,
            note: dto.note?.trim() || null,
          },
        },
      },
      include: invoiceInclude,
    });

    return this.toDetail(invoice);
  }

  async registerInvoicePayment(
    user: CurrentAuthUser,
    invoiceId: string,
    dto: RegisterInvoicePaymentDto,
  ) {
    const invoice = await this.findInvoiceOrThrow(
      user.organizationId,
      invoiceId,
    );

    const newPaymentAmount = Number(dto.paidAmount);

    if (!Number.isFinite(newPaymentAmount) || newPaymentAmount <= 0) {
      throw new BadRequestException(
        'مبلغ پرداخت باید بیشتر از صفر باشد.',
      );
    }

    const alreadyPaid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.paidAmount),
      0,
    );

    const totalAmount = Number(invoice.totalAmount);
    const remainingAmount = this.roundMoney(totalAmount - alreadyPaid);

    if (newPaymentAmount > remainingAmount) {
      throw new BadRequestException(
        'مبلغ پرداخت نمی‌تواند بیشتر از مانده فاکتور باشد.',
      );
    }

    const isFullyPaid =
      this.roundMoney(alreadyPaid + newPaymentAmount) >= totalAmount;

    const updatedInvoice = await this.prisma.accountingInvoice.update({
      where: { id: invoiceId },
      data: {
        payments: {
          create: {
            receivedById: user.id,
            paidAmount: newPaymentAmount,
            paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
            method: dto.method ?? 'BANK_TRANSFER',
            referenceNumber: dto.referenceNumber?.trim() || null,
            note: dto.note?.trim() || null,
            metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          },
        },
        ...(isFullyPaid
          ? {
              status: AccountingInvoiceStatus.COMPLETED,
              statusHistory: {
                create: {
                  actedById: user.id,
                  status: AccountingInvoiceStatus.COMPLETED,
                  note: 'فاکتور به‌طور کامل تسویه شد.',
                },
              },
            }
          : {}),
      },
      include: invoiceInclude,
    });

    return this.toDetail(updatedInvoice);
  }

  private async findInvoiceOrThrow(
    organizationId: string,
    invoiceId: string,
  ) {
    const invoice = await this.prisma.accountingInvoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: invoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException(
        'فاکتور موردنظر یافت نشد یا به سازمان شما تعلق ندارد.',
      );
    }

    return invoice;
  }

  private async ensureBranchAndDepartmentBelongToOrganization(
    organizationId: string,
    branchId?: string,
    departmentId?: string,
  ) {
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          organizationId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!branch) {
        throw new BadRequestException(
          'شعبه انتخاب‌شده معتبر نیست یا به سازمان شما تعلق ندارد.',
        );
      }
    }

    if (departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: departmentId,
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          branchId: true,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'دپارتمان انتخاب‌شده معتبر نیست یا به سازمان شما تعلق ندارد.',
        );
      }

      if (branchId && department.branchId && department.branchId !== branchId) {
        throw new BadRequestException(
          'دپارتمان انتخاب‌شده به شعبه انتخاب‌شده تعلق ندارد.',
        );
      }
    }
  }

  private async generateDocumentNumber(organizationId: string) {
    const datePart = new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll('-', '');

    const prefix = `INV-${datePart}-`;

    const count = await this.prisma.accountingInvoice.count({
      where: {
        organizationId,
        documentNumber: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toListItem(invoice: {
    id: string;
    documentNumber: string;
    title: string;
    description: string | null;
    moduleType: string;
    status: string;
    priority: string;
    totalAmount: Prisma.Decimal;
    currency: string;
    vendorName: string | null;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    branch?: { name: string } | null;
    department?: { name: string } | null;
  }) {
    return {
      id: invoice.id,
      documentNumber: invoice.documentNumber,
      title: invoice.title,
      description: invoice.description,
      moduleType: invoice.moduleType,
      status: invoice.status.toLowerCase(),
      priority: invoice.priority,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      vendorName: invoice.vendorName,
      branchName: invoice.branch?.name ?? null,
      departmentName: invoice.department?.name ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  private toDetail(invoice: Prisma.AccountingInvoiceGetPayload<{
    include: typeof invoiceInclude;
  }>) {
    return {
      ...this.toListItem(invoice),

      createdBy: {
        id: invoice.createdBy.id,
        fullName:
          `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`.trim() ||
          null,
        username: invoice.createdBy.username,
      },

      assignedTo: null,

      lineItems: invoice.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        total: Number(item.total),
      })),

      statusHistory: invoice.statusHistory.map((history) => ({
        id: history.id,
        status: history.status.toLowerCase(),
        note: history.note,
        actedBy: {
          id: history.actedBy.id,
          fullName:
            `${history.actedBy.firstName} ${history.actedBy.lastName}`.trim() ||
            null,
          username: history.actedBy.username,
        },
        createdAt: history.createdAt.toISOString(),
      })),

      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        paidAmount: Number(payment.paidAmount),
        paidAt: payment.paidAt.toISOString(),
        method: payment.method?.toLowerCase() ?? null,
        referenceNumber: payment.referenceNumber,
        note: payment.note,
        createdAt: payment.createdAt.toISOString(),
      })),

      metadata: invoice.metadata,
    };
  }
}
