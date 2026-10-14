import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate, fixtureUserId } from './context';

const ticketStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'OPEN', 'RESOLVED', 'OPEN', 'CLOSED', 'IN_PROGRESS', 'OPEN', 'CANCELLED', 'WAITING_FOR_CUSTOMER', 'OPEN', 'RESOLVED', 'OPEN'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const types = ['SUPPORT', 'INCIDENT', 'REQUEST', 'QUESTION', 'COMPLAINT'] as const;

export async function seedSupport(ctx: TestDataContext): Promise<TestDataCounts> {
  for (let index = 0; index < ticketStatuses.length; index += 1) {
    const ticketNumber = 970001 + index;
    const status = ticketStatuses[index];
    await ctx.db.ticket.upsert({
      where: { organizationId_ticketNumber: { organizationId: ctx.organizationId, ticketNumber } },
      create: {
        organizationId: ctx.organizationId,
        creatorId: fixtureUserId(ctx, index),
        assigneeId: index % 3 === 0 ? null : fixtureUserId(ctx, index + 1),
        ticketNumber,
        subject: `درخواست آزمایشی پشتیبانی ${String(index + 1).padStart(2, '0')}`,
        description: `شرح نمونه برای بررسی فهرست، جزئیات، فیلترها و گردش کار پشتیبانی. مورد ${index + 1} از ۲۰.`,
        type: types[index % types.length],
        status,
        priority: priorities[index % priorities.length],
        visibility: index % 4 === 0 ? 'CUSTOMER' : 'INTERNAL',
        category: ['حساب کاربری', 'پرداخت', 'انبار', 'گزارش'][index % 4],
        dueAt: fixtureDate(ctx.now, index - 3),
        resolution: status === 'RESOLVED' || status === 'CLOSED' ? 'راهکار نمونه ثبت و درخواست آزمایشی حل شد.' : null,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? fixtureDate(ctx.now, 1) : null,
        closedAt: status === 'CLOSED' ? fixtureDate(ctx.now, 1) : null,
        messages: { create: [{ authorId: fixtureUserId(ctx, index + 2), body: 'پیام اولیهٔ آزمایشی برای بررسی گفت‌وگوی تیکت.', isInternal: index % 2 === 0 }] },
      },
      update: {},
    });
  }
  return { tickets: ticketStatuses.length, ticketMessages: ticketStatuses.length };
}
