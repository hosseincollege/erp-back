import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate, fixtureUserId } from './context';

const accountNames = ['بازرگانی نمونهٔ البرز', 'فناوران آزمایشی سپهر', 'توزیع کالای باران', 'سازمان داده‌گستر', 'فروشگاه نمونهٔ شرق', 'تجهیزات صنعتی آزما', 'پخش بهارستان', 'راهکارهای نمونهٔ فردا'];
const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'NEW', 'CONTACTED', 'QUALIFIED', 'NEW', 'DISQUALIFIED', 'CONTACTED', 'NEW', 'QUALIFIED', 'NEW', 'CONTACTED', 'NEW', 'DISQUALIFIED', 'QUALIFIED', 'NEW', 'CONTACTED', 'NEW'] as const;

export async function seedCommerce(ctx: TestDataContext): Promise<TestDataCounts> {
  const accounts = [] as Array<{ id: string; name: string }>;
  for (const name of accountNames) {
    const existing = await ctx.db.account.findFirst({ where: { organizationId: ctx.organizationId, name }, select: { id: true, name: true } });
    accounts.push(existing ?? await ctx.db.account.create({ data: { organizationId: ctx.organizationId, name, industry: 'فناوری و بازرگانی', city: 'تهران', country: 'ایران', ownerId: fixtureUserId(ctx, accounts.length) } }));
  }

  const contacts = [] as Array<{ id: string; firstName: string; lastName: string }>;
  for (let index = 0; index < 10; index += 1) {
    const serial = String(index + 1).padStart(2, '0');
    const email = `crm-test-${serial}@example.invalid`;
    const existing = await ctx.db.contact.findFirst({ where: { organizationId: ctx.organizationId, email }, select: { id: true, firstName: true, lastName: true } });
    contacts.push(existing ?? await ctx.db.contact.create({ data: { organizationId: ctx.organizationId, accountId: accounts[index % accounts.length].id, firstName: ['آرمان', 'نگار', 'کیان', 'رها', 'پارسا'][index % 5], lastName: `آزمایشی ${serial}`, jobTitle: ['مدیر خرید', 'کارشناس فروش', 'مدیر مالی'][index % 3], email, phone: `02155510${serial}`, ownerId: ctx.userId } }));
  }

  for (let index = 0; index < leadStatuses.length; index += 1) {
    const serial = String(index + 1).padStart(2, '0');
    const topic = `سرنخ آزمایشی فروش ${serial}`;
    const existing = await ctx.db.lead.findFirst({ where: { organizationId: ctx.organizationId, topic }, select: { id: true } });
    if (!existing) {
      await ctx.db.lead.create({ data: {
        topic,
        firstName: ['آرمان', 'نگار', 'کیان', 'رها'][index % 4],
        lastName: `مشتری ${serial}`,
        companyName: accountNames[index % accountNames.length],
        jobTitle: 'مسئول خرید',
        email: `lead-test-${serial}@example.invalid`,
        phone: `02155520${serial}`,
        source: ['وب‌سایت', 'معرفی مشتری', 'نمایشگاه', 'تماس ورودی'][index % 4],
        estimatedRevenue: (index + 1) * 85000000,
        status: leadStatuses[index],
        disqualifyReason: leadStatuses[index] === 'DISQUALIFIED' ? (index % 2 === 0 ? 'NO_BUDGET' : 'UNRESPONSIVE') : null,
        disqualifyNotes: leadStatuses[index] === 'DISQUALIFIED' ? 'نمونه برای آزمون بستن سرنخ' : null,
        organizationId: ctx.organizationId,
        ownerId: fixtureUserId(ctx, index),
      } });
    }
  }

  const opportunityStates = ['OPEN', 'OPEN', 'WON', 'LOST', 'OPEN', 'WON'] as const;
  for (let index = 0; index < opportunityStates.length; index += 1) {
    const name = `فرصت آزمایشی ${String(index + 1).padStart(2, '0')}`;
    const existing = await ctx.db.opportunity.findFirst({ where: { organizationId: ctx.organizationId, name }, select: { id: true } });
    if (!existing) await ctx.db.opportunity.create({ data: {
      organizationId: ctx.organizationId,
      name,
      estimatedRevenue: (index + 3) * 125000000,
      actualRevenue: opportunityStates[index] === 'WON' ? (index + 3) * 120000000 : null,
      state: opportunityStates[index],
      stage: (['QUALIFY', 'DEVELOP', 'PROPOSE', 'CLOSE'] as const)[index % 4],
      closeReason: opportunityStates[index] === 'LOST' ? 'رقیب با پیشنهاد مناسب‌تر انتخاب شد' : null,
      estimatedCloseDate: fixtureDate(ctx.now, index - 15),
      actualCloseDate: opportunityStates[index] === 'OPEN' ? null : fixtureDate(ctx.now, index + 1),
      accountId: accounts[index % accounts.length].id,
      contactId: contacts[index % contacts.length].id,
      ownerId: fixtureUserId(ctx, index + 1),
    } });
  }

  return { accounts: accountNames.length, contacts: 10, leads: leadStatuses.length, opportunities: opportunityStates.length };
}
