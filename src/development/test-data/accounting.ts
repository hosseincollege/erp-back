import { Prisma } from '@prisma/client';
import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate, fixtureUserId } from './context';

const chart = [
  ['TEST-1001', 'صندوق اصلی شرکت', 'ASSET'],
  ['TEST-1002', 'حساب جاری بانک ملت', 'ASSET'],
  ['TEST-2001', 'حساب‌های پرداختنی تجاری', 'LIABILITY'],
  ['TEST-3001', 'سرمایه شرکت', 'EQUITY'],
  ['TEST-4001', 'درآمد فروش کالا', 'REVENUE'],
  ['TEST-5001', 'هزینه‌های اداری و پشتیبانی', 'EXPENSE'],
] as const;

const invoiceStatuses = ['DRAFT', 'SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'DRAFT'] as const;

export async function seedAccounting(ctx: TestDataContext): Promise<TestDataCounts> {
  const accounts = await Promise.all(chart.map(([code, name, type]) => ctx.db.accountingAccount.upsert({
    where: { organizationId_code: { organizationId: ctx.organizationId, code } },
    create: { organizationId: ctx.organizationId, code, name, type },
    update: {},
  })));
  const legacyAccountNames = ['صندوق آزمایشی', 'بانک آزمایشی', 'حساب‌های پرداختنی آزمایشی', 'سرمایهٔ آزمایشی', 'درآمد فروش آزمایشی', 'هزینهٔ اداری آزمایشی'];
  for (let index = 0; index < accounts.length; index += 1) {
    if (accounts[index].name === legacyAccountNames[index]) await ctx.db.accountingAccount.update({ where: { id: accounts[index].id }, data: { name: chart[index][1] } });
  }

  for (let index = 0; index < invoiceStatuses.length; index += 1) {
    const serial = String(index + 1).padStart(3, '0');
    const amount = new Prisma.Decimal((index + 1) * 12500000);
    const invoice = await ctx.db.accountingInvoice.upsert({
      where: { organizationId_documentNumber: { organizationId: ctx.organizationId, documentNumber: `TEST-INV-${serial}` } },
      create: {
        organizationId: ctx.organizationId,
        createdById: fixtureUserId(ctx, index),
        documentNumber: `TEST-INV-${serial}`,
        title: `فاکتور خرید کالا ${serial}`,
        description: 'خرید تجهیزات و ملزومات موردنیاز شعب و واحدهای سازمانی.',
        vendorName: ['تأمین تجهیزات آریا', 'فناوران سپهر', 'بازرگانی داده‌نما'][index % 3],
        status: invoiceStatuses[index],
        priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)[index % 4],
        totalAmount: amount,
        currency: 'IRR',
        dueDate: fixtureDate(ctx.now, index - 10),
        lineItems: { create: [{ description: 'تجهیزات و ملزومات اداری', quantity: 2, unitPrice: amount.div(2), taxRate: 9, total: amount }] },
        statusHistory: { create: [{ actedById: fixtureUserId(ctx, index + 1), status: invoiceStatuses[index], note: 'فاکتور برای بررسی و تأیید در سامانه ثبت شد.' }] },
      },
      update: {},
      select: { id: true, status: true, title: true, description: true, vendorName: true },
    });
    const legacyTitle = `فاکتور آزمایشی ${serial}`;
    const legacyVendor = ['تأمین‌گر نمونهٔ آریا', 'شرکت آزمایشی سپهر', 'فروشگاه داده‌نما'][index % 3];
    const invoiceTextUpdate: { title?: string; description?: string; vendorName?: string } = {};
    if (invoice.title === legacyTitle) invoiceTextUpdate.title = `فاکتور خرید کالا ${serial}`;
    if (invoice.description === 'دادهٔ آزمایشی برای بررسی گردش کار حسابداری') invoiceTextUpdate.description = 'خرید تجهیزات و ملزومات موردنیاز شعب و واحدهای سازمانی.';
    if (invoice.vendorName === legacyVendor) invoiceTextUpdate.vendorName = ['تأمین تجهیزات آریا', 'فناوران سپهر', 'بازرگانی داده‌نما'][index % 3];
    if (Object.keys(invoiceTextUpdate).length) await ctx.db.accountingInvoice.update({ where: { id: invoice.id }, data: invoiceTextUpdate });
    await ctx.db.accountingInvoiceLineItem.updateMany({ where: { invoiceId: invoice.id, description: `قلم آزمایشی ${serial}` }, data: { description: 'تجهیزات و ملزومات اداری' } });
    await ctx.db.accountingInvoiceStatusHistory.updateMany({ where: { invoiceId: invoice.id, note: 'ثبت اولیهٔ دادهٔ آزمایشی' }, data: { note: 'فاکتور برای بررسی و تأیید در سامانه ثبت شد.' } });
    if (invoice.status === 'COMPLETED') {
      const payment = await ctx.db.accountingInvoicePayment.upsert({
        where: { id: `fixture-payment-${ctx.organizationId}-${serial}` },
        create: { id: `fixture-payment-${ctx.organizationId}-${serial}`, invoiceId: invoice.id, receivedById: fixtureUserId(ctx, index + 2), paidAmount: amount, method: 'BANK_TRANSFER', referenceNumber: `PAY-1405-${serial}`, note: 'تسویه از طریق حواله بانکی.' },
        update: {},
        select: { id: true, note: true, referenceNumber: true },
      });
      if (payment.note === 'پرداخت آزمایشی' || payment.referenceNumber === `TEST-PAY-${serial}`) {
        await ctx.db.accountingInvoicePayment.update({ where: { id: payment.id }, data: { ...(payment.note === 'پرداخت آزمایشی' ? { note: 'تسویه از طریق حواله بانکی.' } : {}), ...(payment.referenceNumber === `TEST-PAY-${serial}` ? { referenceNumber: `PAY-1405-${serial}` } : {}) } });
      }
    }
  }

  for (let index = 0; index < 6; index += 1) {
    const serial = String(index + 1).padStart(3, '0');
    const number = `TEST-VCH-${serial}`;
    const cash = accounts[0];
    const offset = accounts[index % 2 === 0 ? 5 : 4];
    const voucher = await ctx.db.accountingVoucher.upsert({
      where: { organizationId_number: { organizationId: ctx.organizationId, number } },
      create: {
        organizationId: ctx.organizationId,
        createdById: fixtureUserId(ctx, index),
        number,
        date: fixtureDate(ctx.now, index * 4),
        description: `ثبت خرید تجهیزات اداری شماره ${serial}`,
        status: index < 3 ? 'POSTED' : 'DRAFT',
        lines: { create: [
          { accountId: cash.id, description: 'بهای خرید تجهیزات', debit: 1000000 + index * 250000, credit: 0 },
          { accountId: offset.id, description: 'پرداخت از حساب بانکی', debit: 0, credit: 1000000 + index * 250000 },
        ] },
      },
      update: {},
      select: { id: true, description: true },
    });
    const legacyDescription = `سند آزمایشی ${serial} برای آزمون دفتر روزنامه`;
    if (voucher.description === legacyDescription) await ctx.db.accountingVoucher.update({ where: { id: voucher.id }, data: { description: `ثبت خرید تجهیزات اداری شماره ${serial}` } });
    await ctx.db.accountingVoucherLine.updateMany({ where: { voucherId: voucher.id, description: 'بدهکار آزمایشی' }, data: { description: 'بهای خرید تجهیزات' } });
    await ctx.db.accountingVoucherLine.updateMany({ where: { voucherId: voucher.id, description: 'بستانکار آزمایشی' }, data: { description: 'پرداخت از حساب بانکی' } });
  }

  return { accounts: chart.length, invoices: invoiceStatuses.length, vouchers: 6, voucherLines: 12 };
}
