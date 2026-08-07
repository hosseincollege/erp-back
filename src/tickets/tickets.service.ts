/**
 * @file src/tickets/tickets.service.ts
 * @description Ticket service for ERP Pro backend
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketPriority, TicketSource, TicketStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTicketDto: CreateTicketDto, currentUserId: string) {
    const ticketNumber = this.generateTicketNumber();

    const data: Prisma.TicketCreateInput = {
      ticketNumber,
      title: createTicketDto.title.trim(),
      description: createTicketDto.description.trim(),
      customerName: createTicketDto.customerName?.trim() || null,
      customerPhone: createTicketDto.customerPhone?.trim() || null,
      priority: createTicketDto.priority as TicketPriority,
      status: TicketStatus.OPEN,
      source: createTicketDto.source as TicketSource,
      ...(createTicketDto.customerId
        ? {
            customer: {
              connect: {
                id: createTicketDto.customerId,
              },
            },
          }
        : {}),
    };

    const createdTicket = await this.prisma.ticket.create({
      data,
      include: {
        customer: true,
      },
    });

    return {
      success: true,
      data: {
        ...createdTicket,
        creatorId: currentUserId,
      },
    };
  }

  async findAll() {
    return this.prisma.ticket.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('تیکت مورد نظر یافت نشد.');
    }

    return {
      success: true,
      data: ticket,
    };
  }

  private generateTicketNumber() {
    const now = new Date();

    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const randomPart = Math.floor(1000 + Math.random() * 9000);

    return `TKT-${year}${month}${day}-${randomPart}`;
  }
}
