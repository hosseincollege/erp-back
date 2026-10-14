import type { TestDataContext, TestDataCounts } from './context';
import { fixtureUserId } from './context';

const branches = [
  ['TEST-CENTRAL', 'شعبهٔ آزمایشی مرکزی', 'تهران، خیابان نمونه'],
  ['TEST-NORTH', 'شعبهٔ آزمایشی شمال', 'تهران، منطقهٔ شمال'],
  ['TEST-SOUTH', 'شعبهٔ آزمایشی جنوب', 'تهران، منطقهٔ جنوب'],
] as const;
const departments = [
  ['TEST-OPS', 'واحد عملیات آزمایشی', 0],
  ['TEST-SALES', 'واحد فروش آزمایشی', 1],
  ['TEST-FIN', 'واحد مالی آزمایشی', 0],
  ['TEST-HR', 'واحد منابع انسانی آزمایشی', 0],
  ['TEST-SUPPORT', 'واحد پشتیبانی آزمایشی', 2],
] as const;

export async function seedSettings(ctx: TestDataContext): Promise<TestDataCounts> {
  const savedBranches = [] as Array<{ id: string }>;
  for (const [code, name, address] of branches) {
    savedBranches.push(await ctx.db.branch.upsert({
      where: { organizationId_code: { organizationId: ctx.organizationId, code } },
      create: { organizationId: ctx.organizationId, code, name, address, isMain: code === 'TEST-CENTRAL' },
      update: {},
      select: { id: true },
    }));
  }
  for (const [code, name, branchIndex] of departments) {
    await ctx.db.department.upsert({
      where: { organizationId_code: { organizationId: ctx.organizationId, code } },
      create: { organizationId: ctx.organizationId, branchId: savedBranches[branchIndex].id, code, name },
      update: {},
    });
  }

  const announcements = [
    ['اطلاعیهٔ آزمایشی: نگهداری سامانه', 'نمونهٔ اطلاعیهٔ فعال و سنجش نمایش اعلان‌ها.'],
    ['اطلاعیهٔ آزمایشی: برنامهٔ آموزش', 'نمونهٔ اطلاعیه برای آزمون متن و دسته‌بندی.'],
    ['اطلاعیهٔ آزمایشی: پایان دورهٔ مالی', 'یادآوری نمونه برای آزمون اطلاعیه‌های مهم.'],
  ] as const;
  for (let index = 0; index < announcements.length; index += 1) {
    const [title, body] = announcements[index];
    const existing = await ctx.db.announcement.findFirst({ where: { organizationId: ctx.organizationId, title }, select: { id: true } });
    if (!existing) await ctx.db.announcement.create({ data: {
      organizationId: ctx.organizationId,
      createdByUserId: fixtureUserId(ctx, index),
      title,
      summary: 'اطلاعیهٔ ساختگی برای آزمایش محیط توسعه',
      body,
      locale: 'fa',
      category: ['general', 'training', 'finance'][index],
      priority: index === 2 ? 'high' : 'normal',
      isPinned: index === 0,
      isActive: true,
    } });
  }
  return { branches: branches.length, departments: departments.length, announcements: announcements.length };
}
