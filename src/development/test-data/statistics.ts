import type { TestDataContext, TestDataCounts } from './context';

/** Statistics has no write models; it reads the domain records seeded by other fixtures. */
export async function seedStatistics(ctx: TestDataContext): Promise<TestDataCounts> {
  const [invoices, leads, opportunities, employees, leaveRequests, products, movements, tickets] = await Promise.all([
    ctx.db.accountingInvoice.count({ where: { organizationId: ctx.organizationId, documentNumber: { startsWith: 'TEST-INV-' } } }),
    ctx.db.lead.count({ where: { organizationId: ctx.organizationId, topic: { startsWith: 'سرنخ آزمایشی فروش' } } }),
    ctx.db.opportunity.count({ where: { organizationId: ctx.organizationId, name: { startsWith: 'فرصت آزمایشی' } } }),
    ctx.db.employee.count({ where: { organizationId: ctx.organizationId, employeeCode: { startsWith: 'TEST-EMP-' } } }),
    ctx.db.leaveRequest.count({ where: { organizationId: ctx.organizationId, reason: { startsWith: 'درخواست مرخصی آزمایشی' } } }),
    ctx.db.product.count({ where: { organizationId: ctx.organizationId, sku: { startsWith: 'TEST-SKU-' } } }),
    ctx.db.inventoryMovement.count({ where: { organizationId: ctx.organizationId, referenceNumber: { startsWith: 'TEST-MOV-' } } }),
    ctx.db.ticket.count({ where: { organizationId: ctx.organizationId, subject: { startsWith: 'درخواست آزمایشی پشتیبانی' } } }),
  ]);
  return { invoices, leads, opportunities, employees, leaveRequests, products, movements, tickets };
}
