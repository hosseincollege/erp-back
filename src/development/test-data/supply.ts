import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate } from './context';

const warehouseFixtures = [
  ['TEST-MAIN', 'انبار مرکزی تهران', 'تهران'],
  ['TEST-RAW', 'انبار مواد اولیه کرج', 'کرج'],
  ['TEST-TRANSIT', 'مرکز توزیع قزوین', 'قزوین'],
] as const;
const productFixtures = [
  ['TEST-SKU-001', 'رایانه همراه Lenovo ThinkPad E14', 'دستگاه', 4],
  ['TEST-SKU-002', 'نمایشگر Dell P2422H، ۲۴ اینچ', 'عدد', 5],
  ['TEST-SKU-003', 'صفحه‌کلید بی‌سیم Logitech K270', 'عدد', 10],
  ['TEST-SKU-004', 'ماوس بی‌سیم Logitech M185', 'عدد', 10],
  ['TEST-SKU-005', 'کاغذ تحریر A4، بسته ۵۰۰ برگی', 'بسته', 12],
  ['TEST-SKU-006', 'کارتریج لیزری HP 107A', 'عدد', 3],
  ['TEST-SKU-007', 'صندلی اداری ارگونومیک مدل آریا', 'عدد', 2],
  ['TEST-SKU-008', 'تلفن تحت شبکه Yealink T31P', 'عدد', 5],
  ['TEST-SKU-009', 'کابل شبکه Cat6', 'متر', 20],
  ['TEST-SKU-010', 'روتر بی‌سیم TP-Link Archer C6', 'عدد', 2],
  ['TEST-SKU-011', 'حافظه USB سهند، ۳۲ گیگابایت', 'عدد', 8],
  ['TEST-SKU-012', 'پایه نمایشگر قابل تنظیم', 'عدد', 3],
] as const;

export async function seedSupply(ctx: TestDataContext): Promise<TestDataCounts> {
  const warehouses = [] as Array<{ id: string; code: string }>;
  for (const [code, name, location] of warehouseFixtures) {
    const legacyName = ({ 'TEST-MAIN': 'انبار آزمایشی مرکزی', 'TEST-RAW': 'انبار آزمایشی مواد اولیه', 'TEST-TRANSIT': 'انبار آزمایشی در مسیر' } as Record<string, string>)[code];
    const warehouse = await ctx.db.warehouse.upsert({
      where: { organizationId_code: { organizationId: ctx.organizationId, code } },
      create: { organizationId: ctx.organizationId, code, name, location },
      update: {},
      select: { id: true, code: true, name: true },
    });
    if (warehouse.name === legacyName) await ctx.db.warehouse.update({ where: { id: warehouse.id }, data: { name } });
    warehouses.push(warehouse);
  }
  const products = [] as Array<{ id: string; sku: string }>;
  for (const [sku, name, unit, minStockLevel] of productFixtures) {
    const legacyNames = ['لپ‌تاپ نمونهٔ سازمانی', 'نمایشگر آزمایشی ۲۴ اینچ', 'صفحه‌کلید نمونه', 'ماوس آزمایشی', 'کاغذ اداری آزمایشی', 'کارتریج نمونه', 'صندلی اداری آزمایشی', 'تلفن سازمانی نمونه', 'کابل شبکهٔ آزمایشی', 'روتر نمونهٔ آزمایشی', 'فلش حافظهٔ آزمایشی', 'پایهٔ نمایشگر نمونه'];
    const product = await ctx.db.product.upsert({
      where: { organizationId_sku: { organizationId: ctx.organizationId, sku } },
      create: { organizationId: ctx.organizationId, sku, name, unit, minStockLevel },
      update: {},
      select: { id: true, sku: true, name: true },
    });
    if (product.name === legacyNames[products.length]) await ctx.db.product.update({ where: { id: product.id }, data: { name } });
    products.push(product);
  }

  let balanceCount = 0;
  for (let index = 0; index < products.length; index += 1) {
    for (let warehouseIndex = 0; warehouseIndex < warehouses.length; warehouseIndex += 1) {
      const quantity = ((index * 7 + warehouseIndex * 5) % 31);
      await ctx.db.inventoryBalance.upsert({
        where: { productId_warehouseId: { productId: products[index].id, warehouseId: warehouses[warehouseIndex].id } },
        create: { productId: products[index].id, warehouseId: warehouses[warehouseIndex].id, quantity },
        update: {},
      });
      balanceCount += 1;
    }
  }

  const movementTypes = ['RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT'] as const;
  for (let index = 0; index < 12; index += 1) {
    const referenceNumber = `TEST-MOV-${String(index + 1).padStart(3, '0')}`;
    const existing = await ctx.db.inventoryMovement.findFirst({ where: { organizationId: ctx.organizationId, referenceNumber }, select: { id: true } });
    if (existing) {
      const legacyNote = `گردش آزمایشی شمارهٔ ${index + 1} برای بررسی ثبت و پیگیری موجودی`;
      const current = await ctx.db.inventoryMovement.findUnique({ where: { id: existing.id }, select: { notes: true } });
      if (current?.notes === legacyNote) await ctx.db.inventoryMovement.update({ where: { id: existing.id }, data: { notes: ['رسید خرید تجهیزات از تأمین‌کننده آریا.', 'تحویل اقلام به واحد فناوری اطلاعات.', 'انتقال موجودی به مرکز توزیع قزوین.', 'اصلاح شمارش دوره‌ای انبار.'][index % 4] } });
      continue;
    }
    const type = movementTypes[index % movementTypes.length];
    await ctx.db.inventoryMovement.create({ data: {
      organizationId: ctx.organizationId,
      type,
      referenceNumber,
      fromWarehouseId: type === 'ISSUE' || type === 'TRANSFER' ? warehouses[0].id : null,
      toWarehouseId: type === 'RECEIPT' || type === 'TRANSFER' ? warehouses[type === 'TRANSFER' ? 1 : 0].id : null,
      notes: ['رسید خرید تجهیزات از تأمین‌کننده آریا.', 'تحویل اقلام به واحد فناوری اطلاعات.', 'انتقال موجودی به مرکز توزیع قزوین.', 'اصلاح شمارش دوره‌ای انبار.'][index % 4],
      createdAt: fixtureDate(ctx.now, index + 1),
      items: { create: [{ productId: products[index % products.length].id, quantity: index + 1 }] },
    } });
  }
  return { warehouses: warehouses.length, products: products.length, balances: balanceCount, movements: 12 };
}
