import { Prisma } from '@prisma/client';
import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate, fixtureUserId } from './context';

const chart = [
  ['TEST-1001', 'صندوق آزمایشی', 'ASSET'],
  ['TEST-1002', 'بانک آزمایشی', 'ASSET'],
  ['TEST-2001', 'حساب‌های پرداختنی آزمایشی', 'LIABILITY'],
  ['TEST-3001', 'سرمایهٔ آزمایشی', 'EQUITY'],
  ['TEST-4001', 'درآمد فروش آزمایشی', 'REVENUE'],
  ['TEST-5001', 'هزینهٔ اداری آزمایشی', 'EXPENSE'],
] as const;

const invoiceStatuses = ['DRAFT', 'SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'DRAFT'] as const;

export async function seedAccounting(ctx: TestDataContext): Promise<TestDataCounts> {
  const accounts = await Promise.all(chart.map(([code, name, type]) => ctx.db.accountingAccount.upsert({
    where: { organizationId_code: { organizationId: ctx.organizationId, code } },
    create: { organizationId: ctx.organizationId, code, name, type },
    update: {},
  })));

  for (let index = 0; index < invoiceStatuses.length; index += 1) {
    const serial = String(index + 1).padStart(3, '0');
    const amount = new Prisma.Decimal((index + 1) * 12500000);
    const invoice = await ctx.db.accountingInvoice.upsert({
      where: { organizationId_documentNumber: { organizationId: ctx.organizationId, documentNumber: `TEST-INV-${serial}` } },
      create: {
        organizationId: ctx.organizationId,
        createdById: fixtureUserId(ctx, index),
        documentNumber: `TEST-INV-${serial}`,
        title: `فاکتور آزمایشی ${serial}`,
        description: 'دادهٔ آزمایشی برای بررسی گردش کار حسابداری',
        vendorName: ['تأمین‌گر نمونهٔ آریا', 'شرکت آزمایشی سپهر', 'فروشگاه داده‌نما'][index % 3],
        status: invoiceStatuses[index],
        priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)[index % 4],
        totalAmount: amount,
        currency: 'IRR',
        dueDate: fixtureDate(ctx.now, index - 10),
        lineItems: { create: [{ description: `قلم آزمایشی ${serial}`, quantity: 2, unitPrice: amount.div(2), taxRate: 9, total: amount }] },
        statusHistory: { create: [{ actedById: fixtureUserId(ctx, index + 1), status: invoiceStatuses[index], note: 'ثبت اولیهٔ دادهٔ آزمایشی' }] },
      },
      update: {},
      select: { id: true, status: true },
    });
    if (invoice.status === 'COMPLETED') {
      await ctx.db.accountingInvoicePayment.upsert({
        where: { id: `fixture-payment-${ctx.organizationId}-${serial}` },
        create: { id: `fixture-payment-${ctx.organizationId}-${serial}`, invoiceId: invoice.id, receivedById: fixtureUserId(ctx, index + 2), paidAmount: amount, method: 'BANK_TRANSFER', referenceNumber: `TEST-PAY-${serial}`, note: 'پرداخت آزمایشی' },
        update: {},
      });
    }
  }

  for (let index = 0; index < 6; index += 1) {
    const serial = String(index + 1).padStart(3, '0');
    const number = `TEST-VCH-${serial}`;
    const cash = accounts[0];
    const offset = accounts[index % 2 === 0 ? 5 : 4];
    await ctx.db.accountingVoucher.upsert({
      where: { organizationId_number: { organizationId: ctx.organizationId, number } },
      create: {
        organizationId: ctx.organizationId,
        createdById: fixtureUserId(ctx, index),
        number,
        date: fixtureDate(ctx.now, index * 4),
        description: `سند آزمایشی ${serial} برای آزمون دفتر روزنامه`,
        status: index < 3 ? 'POSTED' : 'DRAFT',
        lines: { create: [
          { accountId: cash.id, description: 'بدهکار آزمایشی', debit: 1000000 + index * 250000, credit: 0 },
          { accountId: offset.id, description: 'بستانکار آزمایشی', debit: 0, credit: 1000000 + index * 250000 },
        ] },
      },
      update: {},
    });
  }

  return { accounts: chart.length, invoices: invoiceStatuses.length, vouchers: 6, voucherLines: 12 };
}
