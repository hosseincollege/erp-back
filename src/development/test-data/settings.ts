import type { TestDataContext, TestDataCounts } from './context';
import { fixtureUserId } from './context';

const provinces = [
  ['isfahan', 'اصفهان'], ['tehran', 'تهران'], ['east-azerbaijan', 'آذربایجان شرقی'], ['west-azerbaijan', 'آذربایجان غربی'],
  ['ardabil', 'اردبیل'], ['alborz', 'البرز'], ['ilam', 'ایلام'], ['bushehr', 'بوشهر'], ['charmahal-bakhtiari', 'چهارمحال و بختیاری'],
  ['south-khorasan', 'خراسان جنوبی'], ['razavi-khorasan', 'خراسان رضوی'], ['north-khorasan', 'خراسان شمالی'], ['khuzestan', 'خوزستان'],
  ['zanjan', 'زنجان'], ['semnan', 'سمنان'], ['sistan-baluchestan', 'سیستان و بلوچستان'], ['fars', 'فارس'], ['qazvin', 'قزوین'],
  ['qom', 'قم'], ['kurdistan', 'کردستان'], ['kerman', 'کرمان'], ['kermanshah', 'کرمانشاه'], ['kohgiluyeh-boyerahmad', 'کهگیلویه و بویراحمد'],
  ['golestan', 'گلستان'], ['gilan', 'گیلان'], ['lorestan', 'لرستان'], ['mazandaran', 'مازندران'], ['markazi', 'مرکزی'],
  ['hormozgan', 'هرمزگان'], ['hamadan', 'همدان'], ['yazd', 'یزد'],
] as const;
const branches = provinces.map(([provinceId, name]) => ({
  code: `DEMO-PROVINCE-${provinceId.toUpperCase()}`,
  name,
  address: name,
}));

const organizationIdentity = {
  name: 'Rahkam Pasargad',
  legalName: 'Rahkam Pasargad',
  logoUrl: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><path d="M28 29h17c10 0 16 7 16 16v10c0 9 5 15 15 15h2" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/><path d="M28 29h17c10 0 16 7 16 16v10c0 9 5 15 15 15h2" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/><rect x="14" y="15" width="27" height="27" rx="8" fill="#2563eb"/><rect x="65" y="56" width="24" height="24" rx="7" fill="#f59e0b"/><circle cx="76" cy="68" r="4" fill="#fff"/><circle cx="28" cy="29" r="4" fill="#dbeafe"/></svg>')}`,
};

function isLegacyDefaultLogo(value: string | null | undefined) {
  if (!value?.startsWith('data:image/svg+xml,')) return false;
  try {
    const svg = decodeURIComponent(value.slice('data:image/svg+xml,'.length));
    return svg.includes('M28 92 39 8h22') || svg.includes('rect x="12" y="12" width="76" height="76" rx="22" fill="#eaf2ff"');
  } catch {
    return false;
  }
}

function isGeneratedOrganizationName(value: string | null | undefined) {
  if (/\u0645\u062f\u06cc\u0631\s*\u0633\u06cc\u0633\u062a\u0645|system\s*admin/i.test(value ?? '')) return true;
  return !value?.trim() || /(?:demo|sample|test|erp\s*pro|rah[y]ar|رهکام پاسارگاد|راهکارهای هوشمند رهکام پاسارگاد)|شرکت نمونه|سازمان نمونه|نام شرکت|آزمایشی|تست/i.test(value);
}

export async function seedSettings(ctx: TestDataContext): Promise<TestDataCounts> {
  const organization = await ctx.db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true, legalName: true, logoUrl: true },
  });
  if (organization) {
    const identityUpdate: { name?: string; legalName?: string; logoUrl?: string } = {};
    if (isGeneratedOrganizationName(organization.name)) identityUpdate.name = organizationIdentity.name;
    if (isGeneratedOrganizationName(organization.legalName)) identityUpdate.legalName = organizationIdentity.legalName;
    if (!organization.logoUrl || isLegacyDefaultLogo(organization.logoUrl)) identityUpdate.logoUrl = organizationIdentity.logoUrl;
    if (Object.keys(identityUpdate).length) {
      await ctx.db.organization.update({ where: { id: ctx.organizationId }, data: identityUpdate });
    }
  }

  await ctx.db.organizationSettings.upsert({
    where: { organizationId: ctx.organizationId },
    create: {
      organizationId: ctx.organizationId,
      accentPreset: 'blue',
      accentLightColor: '#60a5fa',
      accentDarkColor: '#3b82f6',
      backgroundStyle: 'GRAY',
      calendar: 'persian',
      timezone: 'Asia/Tehran',
    },
    update: {},
  });

  const savedBranches = [] as Array<{ id: string }>;
  for (const { code, name, address } of branches) {
    const branch = await ctx.db.branch.upsert({
      where: { organizationId_code: { organizationId: ctx.organizationId, code } },
      create: { organizationId: ctx.organizationId, code, name, address, isMain: code === 'DEMO-PROVINCE-TEHRAN' },
      update: {},
      select: { id: true, name: true, address: true },
    });
    savedBranches.push(branch);
  }

  const organizationalUnits = [
    { branchId: savedBranches[0].id, code: 'DEMO-UNIT-ISFAHAN-OPERATIONS', name: 'عملیات استان اصفهان' },
    { branchId: savedBranches[0].id, code: 'DEMO-UNIT-ISFAHAN-SUPPORT', name: 'پشتیبانی استان اصفهان' },
    { branchId: savedBranches[1].id, code: 'DEMO-UNIT-TEHRAN-OPERATIONS', name: 'عملیات استان تهران' },
    { branchId: savedBranches[1].id, code: 'DEMO-UNIT-TEHRAN-SUPPORT', name: 'پشتیبانی استان تهران' },
  ];
  for (const unit of organizationalUnits) {
    await ctx.db.department.upsert({
      where: { organizationId_code: { organizationId: ctx.organizationId, code: unit.code } },
      create: { organizationId: ctx.organizationId, ...unit },
      update: {},
    });
  }

  const announcements = [
    ['برنامه نگهداری سامانه در پنجشنبه شب', 'به‌روزرسانی زیرساخت از ساعت ۲۲ تا ۲۳ انجام می‌شود؛ لطفاً عملیات مالی را پیش از این زمان ثبت کنید.'],
    ['دوره آموزشی سامانه فروش', 'کارگاه کار با فرایند ثبت سفارش و پیگیری مشتریان روز دوشنبه ساعت ۱۰ در شعبه کرج برگزار می‌شود.'],
    ['مهلت ارسال اسناد پایان دوره مالی', 'واحدهای مالی تا پایان روز ۲۵ اسفند اسناد هزینه و درآمد را برای بررسی نهایی ارسال کنند.'],
  ] as const;
  for (let index = 0; index < announcements.length; index += 1) {
    const [title, body] = announcements[index];
    const legacyTitles = ['اطلاعیهٔ آزمایشی: نگهداری سامانه', 'اطلاعیهٔ آزمایشی: برنامهٔ آموزش', 'اطلاعیهٔ آزمایشی: پایان دورهٔ مالی'];
    let existing = await ctx.db.announcement.findFirst({ where: { organizationId: ctx.organizationId, title }, select: { id: true } });
    if (!existing) {
      const legacy = await ctx.db.announcement.findFirst({ where: { organizationId: ctx.organizationId, title: legacyTitles[index] }, select: { id: true, summary: true, body: true } });
      if (legacy) existing = await ctx.db.announcement.update({ where: { id: legacy.id }, data: {
        title,
        ...(legacy.summary === 'اطلاعیهٔ ساختگی برای آزمایش محیط توسعه' ? { summary: 'اطلاع‌رسانی سازمانی درباره برنامه‌های جاری شرکت' } : {}),
        ...([{ body: 'نمونهٔ اطلاعیهٔ فعال و سنجش نمایش اعلان‌ها.' }, { body: 'نمونهٔ اطلاعیه برای آزمون متن و دسته‌بندی.' }, { body: 'یادآوری نمونه برای آزمون اطلاعیه‌های مهم.' }][index].body === legacy.body ? { body } : {}),
      }, select: { id: true } });
    }
    if (!existing) await ctx.db.announcement.create({ data: {
      organizationId: ctx.organizationId,
      createdByUserId: fixtureUserId(ctx, index),
      title,
      summary: 'اطلاع‌رسانی سازمانی درباره برنامه‌های جاری شرکت',
      body,
      locale: 'fa',
      category: ['general', 'training', 'finance'][index],
      priority: index === 2 ? 'high' : 'normal',
      isPinned: index === 0,
      isActive: true,
      allowLikes: true,
      allowReactions: true,
      allowComments: true,
      allowMentions: true,
      branchId: index === 1 ? savedBranches[1].id : null,
    } });
  }
  return { organizationSettings: 1, branches: branches.length, departments: organizationalUnits.length, announcements: announcements.length };
}
