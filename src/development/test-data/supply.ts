import type { TestDataContext, TestDataCounts } from './context';
import { fixtureDate } from './context';

const warehouseFixtures = [
  ['TEST-MAIN', 'انبار آزمایشی مرکزی', 'تهران'],
  ['TEST-RAW', 'انبار آزمایشی مواد اولیه', 'کرج'],
  ['TEST-TRANSIT', 'انبار آزمایشی در مسیر', 'قزوین'],
] as const;
const productFixtures = [
  ['TEST-SKU-001', 'لپ‌تاپ نمونهٔ سازمانی', 'دستگاه', 4],
  ['TEST-SKU-002', 'نمایشگر آزمایشی ۲۴ اینچ', 'عدد', 5],
  ['TEST-SKU-003', 'صفحه‌کلید نمونه', 'عدد', 10],
  ['TEST-SKU-004', 'ماوس آزمایشی', 'عدد', 10],
  ['TEST-SKU-005', 'کاغذ اداری آزمایشی', 'بسته', 12],
  ['TEST-SKU-006', 'کارتریج نمونه', 'عدد', 3],
  ['TEST-SKU-007', 'صندلی اداری آزمایشی', 'عدد', 2],
  ['TEST-SKU-008', 'تلفن سازمانی نمونه', 'عدد', 5],
  ['TEST-SKU-009', 'کابل شبکهٔ آزمایشی', 'متر', 20],
  ['TEST-SKU-010', 'روتر نمونهٔ آزمایشی', 'عدد', 2],
  ['TEST-SKU-011', 'فلش حافظهٔ آزمایشی', 'عدد', 8],
  ['TEST-SKU-012', 'پایهٔ نمایشگر نمونه', 'عدد', 3],
] as const;

export async function seedSupply(ctx: TestDataContext): Promise<TestDataCounts> {
  const warehouses = [] as Array<{ id: string; code: string }>;
  for (const [code, name, location] of warehouseFixtures) {
    warehouses.push(await ctx.db.warehouse.upsert({
      where: { organizationId_code: { organizationId: ctx.organizationId, code } },
      create: { organizationId: ctx.organizationId, code, name, location },
      update: {},
      select: { id: true, code: true },
    }));
  }
  const products = [] as Array<{ id: string; sku: string }>;
  for (const [sku, name, unit, minStockLevel] of productFixtures) {
    products.push(await ctx.db.product.upsert({
      where: { organizationId_sku: { organizationId: ctx.organizationId, sku } },
      create: { organizationId: ctx.organizationId, sku, name, unit, minStockLevel },
      update: {},
      select: { id: true, sku: true },
    }));
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
    if (existing) continue;
    const type = movementTypes[index % movementTypes.length];
    await ctx.db.inventoryMovement.create({ data: {
      organizationId: ctx.organizationId,
      type,
      referenceNumber,
      fromWarehouseId: type === 'ISSUE' || type === 'TRANSFER' ? warehouses[0].id : null,
      toWarehouseId: type === 'RECEIPT' || type === 'TRANSFER' ? warehouses[type === 'TRANSFER' ? 1 : 0].id : null,
      notes: `گردش آزمایشی شمارهٔ ${index + 1} برای بررسی ثبت و پیگیری موجودی`,
      createdAt: fixtureDate(ctx.now, index + 1),
      items: { create: [{ productId: products[index % products.length].id, quantity: index + 1 }] },
    } });
  }
  return { warehouses: warehouses.length, products: products.length, balances: balanceCount, movements: 12 };
}
