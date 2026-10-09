// Path: backend/src/supply/inventory.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  CreateWarehouseDto,
  CreateReceiptDto,
  CreateIssueDto,
  CreateTransferDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const activeProducts = await this.prisma.product.count({
      where: { organizationId, isActive: true },
    });

    const products = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      include: { balances: true },
    });

    let lowStockCount = 0;
    for (const product of products) {
      const totalQty = product.balances.reduce((sum, b) => sum + b.quantity, 0);
      if (totalQty <= product.minStockLevel) {
        lowStockCount++;
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayReceipts = await this.prisma.inventoryMovement.count({
      where: {
        organizationId,
        type: 'RECEIPT',
        createdAt: { gte: startOfToday },
      },
    });

    const todayIssues = await this.prisma.inventoryMovement.count({
      where: {
        organizationId,
        type: 'ISSUE',
        createdAt: { gte: startOfToday },
      },
    });

    return {
      activeProducts,
      lowStockCount,
      todayReceipts,
      todayIssues,
    };
  }

  async getProducts(organizationId: string) {
    return this.prisma.product.findMany({
      where: { organizationId },
      include: { balances: { include: { warehouse: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(organizationId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...dto,
        organizationId,
      },
    });
  }

  async getWarehouses(organizationId: string) {
    return this.prisma.warehouse.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWarehouse(organizationId: string, dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: {
        ...dto,
        organizationId,
      },
    });
  }

  async getBalances(organizationId: string) {
    return this.prisma.inventoryBalance.findMany({
      where: {
        warehouse: { organizationId },
      },
      include: {
        product: true,
        warehouse: true,
      },
    });
  }

  async getMovements(organizationId: string) {
    return this.prisma.inventoryMovement.findMany({
      where: { organizationId },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createReceipt(organizationId: string, dto: CreateReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId,
          type: 'RECEIPT',
          toWarehouseId: dto.warehouseId,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      });

      for (const item of dto.items) {
        await tx.inventoryBalance.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        });
      }

      return movement;
    });
  }

  async createIssue(organizationId: string, dto: CreateIssueDto) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          },
        });

        if (!balance || balance.quantity < item.quantity) {
          throw new BadRequestException(
            `موجودی کالا برای خروج کافی نیست (شناسه کالا: ${item.productId})`,
          );
        }
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId,
          type: 'ISSUE',
          fromWarehouseId: dto.warehouseId,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      });

      for (const item of dto.items) {
        await tx.inventoryBalance.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }

      return movement;
    });
  }

  async createTransfer(organizationId: string, dto: CreateTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('انبار مبدا و مقصد نمی‌توانند یکسان باشند');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.fromWarehouseId,
            },
          },
        });

        if (!balance || balance.quantity < item.quantity) {
          throw new BadRequestException(
            `موجودی در انبار مبدا کافی نیست (شناسه کالا: ${item.productId})`,
          );
        }
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId,
          type: 'TRANSFER',
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      });

      for (const item of dto.items) {
        // کسر از مبدا
        await tx.inventoryBalance.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.fromWarehouseId,
            },
          },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        // افزایش به مقصد
        await tx.inventoryBalance.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.toWarehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId: dto.toWarehouseId,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        });
      }

      return movement;
    });
  }
}
