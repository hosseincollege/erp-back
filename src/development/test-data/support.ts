import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate, fixtureUserId } from './context';

const ticketStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'OPEN', 'RESOLVED', 'OPEN', 'CLOSED', 'IN_PROGRESS', 'OPEN', 'CANCELLED', 'WAITING_FOR_CUSTOMER', 'OPEN', 'RESOLVED', 'OPEN'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const types = ['SUPPORT', 'INCIDENT', 'REQUEST', 'QUESTION', 'COMPLAINT'] as const;
const ticketSubjects = [
  'عدم تطبیق تعداد اقلام در سفارش سازمانی',
  'درخواست فعال‌سازی دسترسی به پرتال مشتریان',
  'کندی شبکه در شعبه کرج',
  'اصلاح گزارش فروش ماهانه',
  'پیگیری وضعیت ارسال سفارش شماره ۴۸۲۱',
] as const;
const customerNames = ['شرکت پخش البرز', 'فناوران سپهر', 'بازرگانی باران', 'گروه صنعتی آریا'] as const;
const ticketDescriptions = [
  'مشتری اعلام کرده تعداد اقلام فاکتور با محموله تحویل‌شده مطابقت ندارد؛ لطفاً سفارش و رسید انبار بررسی شود.',
  'کاربر واحد فروش برای مشاهده وضعیت سفارش‌های مشتریان سازمانی به دسترسی پرتال نیاز دارد.',
  'در ساعات ابتدایی روز ارتباط چند کاربر شعبه کرج با سامانه قطع و وصل می‌شود؛ گزارش شبکه پیوست پرونده است.',
  'جمع فروش شعبه اصفهان در گزارش ماهانه با خروجی دفتر مالی اختلاف دارد؛ بازه اول تا پایان ماه بررسی شود.',
  'مشتری درباره زمان تحویل سفارش خود پیگیری کرده است؛ آخرین وضعیت ارسال و زمان تقریبی اعلام شود.',
] as const;
const initialTicketMessage = 'پرونده دریافت شد؛ موضوع با واحد مربوطه بررسی و نتیجه در همین درخواست اعلام می‌شود.';

export async function seedSupport(ctx: TestDataContext): Promise<TestDataCounts> {
  const projectStatuses = ['ACTIVE', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
  const projectNames = [
    ['بهینه‌سازی فرایند ثبت سفارش', 'یکپارچه‌سازی ثبت سفارش و پیگیری تحویل برای مشتریان سازمانی.'],
    ['راه‌اندازی پرتال خدمات مشتریان', 'طراحی پرتال خدمات و انتقال درخواست‌های مشتریان به گردش کار واحد پشتیبانی.'],
    ['نوسازی زیرساخت شعب', 'ارتقای تجهیزات شبکه و آماده‌سازی زیرساخت شعب تهران و کرج.'],
    ['استقرار گزارش‌های مالی', 'تجمیع گزارش‌های درآمد، هزینه و جریان نقدینگی برای پایان دوره مالی.'],
  ] as const;
  const projects = [] as Array<{ id: string }>;
  for (let index = 0; index < projectNames.length; index += 1) {
    const serial = String(index + 1).padStart(3, '0');
    const code = `PRJ-${ctx.organizationId.toUpperCase()}-${serial}`;
    const [name, description] = projectNames[index];
    const project = await ctx.db.project.upsert({
      where: { code },
      create: { organizationId: ctx.organizationId, code, name, description, status: projectStatuses[index] },
      update: {},
      select: { id: true },
    });
    projects.push(project);
    const memberIds = ctx.userIds.length ? ctx.userIds : [ctx.userId];
    for (let memberIndex = 0; memberIndex < memberIds.length; memberIndex += 1) {
      await ctx.db.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: memberIds[memberIndex] } },
        create: { projectId: project.id, userId: memberIds[memberIndex], role: memberIndex === 0 ? 'MANAGER' : 'MEMBER' },
        update: {},
      });
    }
  }

  for (let index = 0; index < ticketStatuses.length; index += 1) {
    const ticketNumber = 970001 + index;
    const status = ticketStatuses[index];
    const subject = `${ticketSubjects[index % ticketSubjects.length]} - ${customerNames[Math.floor(index / ticketSubjects.length)]}`;
    const description = ticketDescriptions[index % ticketDescriptions.length];
    const ticketKey = { organizationId_ticketNumber: { organizationId: ctx.organizationId, ticketNumber } };
    const existing = await ctx.db.ticket.findUnique({ where: ticketKey, select: { id: true, subject: true, description: true, projectId: true } });
    if (existing) {
      const legacySubject = `درخواست آزمایشی پشتیبانی ${String(index + 1).padStart(2, '0')}`;
      const legacyDescription = `شرح نمونه برای بررسی فهرست، جزئیات، فیلترها و گردش کار پشتیبانی. مورد ${index + 1} از ۲۰.`;
      if (existing.subject === legacySubject && existing.description === legacyDescription && !existing.projectId) {
        await ctx.db.ticket.update({ where: { id: existing.id }, data: { subject, description, projectId: projects[index % projects.length].id } });
        await ctx.db.ticketMessage.updateMany({
          where: { ticketId: existing.id, body: 'پیام اولیهٔ آزمایشی برای بررسی گفت‌وگوی تیکت.' },
          data: { body: initialTicketMessage },
        });
      }
      continue;
    }
    await ctx.db.ticket.create({
      data: {
        organizationId: ctx.organizationId,
        creatorId: fixtureUserId(ctx, index),
        assigneeId: index % 3 === 0 ? null : fixtureUserId(ctx, index + 1),
        ticketNumber,
        projectId: projects[index % projects.length].id,
        subject,
        description,
        type: types[index % types.length],
        status,
        priority: priorities[index % priorities.length],
        visibility: index % 4 === 0 ? 'CUSTOMER' : 'INTERNAL',
        category: ['حساب کاربری', 'پرداخت', 'انبار', 'گزارش'][index % 4],
        dueAt: fixtureDate(ctx.now, index - 3),
        resolution: status === 'RESOLVED' || status === 'CLOSED' ? 'اطلاعات سفارش با رسید انبار تطبیق داده شد و نتیجه برای مشتری ارسال شد.' : null,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? fixtureDate(ctx.now, 1) : null,
        closedAt: status === 'CLOSED' ? fixtureDate(ctx.now, 1) : null,
        messages: { create: [{ authorId: fixtureUserId(ctx, index + 2), body: initialTicketMessage, isInternal: index % 2 === 0 }] },
      },
    });
  }
  return { projects: projects.length, tickets: ticketStatuses.length, ticketMessages: ticketStatuses.length };
}
