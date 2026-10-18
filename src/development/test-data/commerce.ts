import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate, fixtureUserId } from './context';

const accountFixtures = [
  ['بازرگانی نمونهٔ البرز', 'شرکت پخش البرز'],
  ['فناوران آزمایشی سپهر', 'فناوران سپهر'],
  ['توزیع کالای باران', 'بازرگانی باران'],
  ['سازمان داده‌گستر', 'گروه صنعتی آریا'],
  ['فروشگاه نمونهٔ شرق', 'فروشگاه زنجیره‌ای شرق'],
  ['تجهیزات صنعتی آزما', 'تجهیزات صنعتی پارس'],
  ['پخش بهارستان', 'پخش بهارستان'],
  ['راهکارهای نمونهٔ فردا', 'راهکارهای دیجیتال فردا'],
] as const;
const accountNames = accountFixtures.map(([, name]) => name);
const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'NEW', 'CONTACTED', 'QUALIFIED', 'NEW', 'DISQUALIFIED', 'CONTACTED', 'NEW', 'QUALIFIED', 'NEW', 'CONTACTED', 'NEW', 'DISQUALIFIED', 'QUALIFIED', 'NEW', 'CONTACTED', 'NEW'] as const;

export async function seedCommerce(ctx: TestDataContext): Promise<TestDataCounts> {
  const accounts = [] as Array<{ id: string; name: string }>;
  for (const [legacyName, name] of accountFixtures) {
    let existing = await ctx.db.account.findFirst({ where: { organizationId: ctx.organizationId, name }, select: { id: true, name: true } });
    if (!existing && legacyName !== name) {
      const legacy = await ctx.db.account.findFirst({ where: { organizationId: ctx.organizationId, name: legacyName }, select: { id: true } });
      if (legacy) existing = await ctx.db.account.update({ where: { id: legacy.id }, data: { name }, select: { id: true, name: true } });
    }
    accounts.push(existing ?? await ctx.db.account.create({ data: { organizationId: ctx.organizationId, name, industry: 'فناوری و بازرگانی', city: 'تهران', country: 'ایران', ownerId: fixtureUserId(ctx, accounts.length) } }));
  }

  const contacts = [] as Array<{ id: string; firstName: string; lastName: string }>;
  for (let index = 0; index < 10; index += 1) {
    const serial = String(index + 1).padStart(2, '0');
    const email = `contact-${serial}@alvand.example.com`;
    const legacyEmail = `crm-test-${serial}@example.invalid`;
    let existing = await ctx.db.contact.findFirst({ where: { organizationId: ctx.organizationId, email }, select: { id: true, firstName: true, lastName: true } });
    if (!existing) {
      const legacy = await ctx.db.contact.findFirst({ where: { organizationId: ctx.organizationId, email: legacyEmail }, select: { id: true, lastName: true } });
      if (legacy) existing = await ctx.db.contact.update({ where: { id: legacy.id }, data: { email, ...(legacy.lastName === `آزمایشی ${serial}` ? { lastName: ['احمدی', 'رضایی', 'کریمی', 'موسوی', 'جعفری'][index % 5] } : {}) }, select: { id: true, firstName: true, lastName: true } });
    }
    contacts.push(existing ?? await ctx.db.contact.create({ data: { organizationId: ctx.organizationId, accountId: accounts[index % accounts.length].id, firstName: ['آرمان', 'نگار', 'کیان', 'رها', 'پارسا'][index % 5], lastName: ['احمدی', 'رضایی', 'کریمی', 'موسوی', 'جعفری'][index % 5], jobTitle: ['مدیر خرید', 'کارشناس فروش', 'مدیر مالی'][index % 3], email, phone: `02155510${serial}`, ownerId: ctx.userId } }));
  }

  for (let index = 0; index < leadStatuses.length; index += 1) {
    const serial = String(index + 1).padStart(2, '0');
    const topic = `درخواست خرید تجهیزات اداری ${serial}`;
    const legacyTopic = `سرنخ آزمایشی فروش ${serial}`;
    let existing = await ctx.db.lead.findFirst({ where: { organizationId: ctx.organizationId, topic }, select: { id: true } });
    if (!existing) {
      const legacy = await ctx.db.lead.findFirst({ where: { organizationId: ctx.organizationId, topic: legacyTopic }, select: { id: true, lastName: true, email: true, disqualifyNotes: true } });
      if (legacy) {
        const legacyEmail = `lead-test-${serial}@example.invalid`;
        existing = await ctx.db.lead.update({ where: { id: legacy.id }, data: {
          topic,
          ...(legacy.lastName === `مشتری ${serial}` ? { lastName: ['احمدی', 'رضایی', 'کریمی', 'موسوی'][index % 4] } : {}),
          ...(legacy.email === legacyEmail ? { email: `sales-inquiry-${serial}@alvand.example.com` } : {}),
          ...(legacy.disqualifyNotes === 'نمونه برای آزمون بستن سرنخ' ? { disqualifyNotes: 'بودجه خرید در فصل جاری تصویب نشد.' } : {}),
        }, select: { id: true } });
      }
    }
    if (!existing) {
      await ctx.db.lead.create({ data: {
        topic,
        firstName: ['آرمان', 'نگار', 'کیان', 'رها'][index % 4],
        lastName: ['احمدی', 'رضایی', 'کریمی', 'موسوی'][index % 4],
        companyName: accountNames[index % accountNames.length],
        jobTitle: 'مسئول خرید',
        email: `sales-inquiry-${serial}@alvand.example.com`,
        phone: `02155520${serial}`,
        source: ['وب‌سایت', 'معرفی مشتری', 'نمایشگاه', 'تماس ورودی'][index % 4],
        estimatedRevenue: (index + 1) * 85000000,
        status: leadStatuses[index],
        disqualifyReason: leadStatuses[index] === 'DISQUALIFIED' ? (index % 2 === 0 ? 'NO_BUDGET' : 'UNRESPONSIVE') : null,
        disqualifyNotes: leadStatuses[index] === 'DISQUALIFIED' ? 'بودجه خرید در فصل جاری تصویب نشد.' : null,
        organizationId: ctx.organizationId,
        ownerId: fixtureUserId(ctx, index),
      } });
    }
  }

  const opportunityStates = ['OPEN', 'OPEN', 'WON', 'LOST', 'OPEN', 'WON'] as const;
  for (let index = 0; index < opportunityStates.length; index += 1) {
    const name = ['تأمین تجهیزات اداری شعب', 'توسعه قرارداد پخش منطقه‌ای', 'نوسازی تجهیزات انبار', 'تأمین رایانه‌های سازمانی', 'قرارداد خدمات پس از فروش', 'توسعه فروشگاه آنلاین'][index];
    let existing = await ctx.db.opportunity.findFirst({ where: { organizationId: ctx.organizationId, name }, select: { id: true } });
    if (!existing) {
      const legacyName = `فرصت آزمایشی ${String(index + 1).padStart(2, '0')}`;
      const legacy = await ctx.db.opportunity.findFirst({ where: { organizationId: ctx.organizationId, name: legacyName }, select: { id: true } });
      if (legacy) existing = await ctx.db.opportunity.update({ where: { id: legacy.id }, data: { name }, select: { id: true } });
    }
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
