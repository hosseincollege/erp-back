import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(createTicketDto: CreateTicketDto, userId: string) {
    const lastTicket = await this.prisma.ticket.aggregate({
      _max: {
        ticketNumber: true,
      },
    });

    const nextTicketNumber = (lastTicket._max.ticketNumber || 0) + 1;

    return this.prisma.ticket.create({
      data: {
        ticketNumber: nextTicketNumber,
        organizationId: createTicketDto.organizationId,
        subject: createTicketDto.subject,
        description: createTicketDto.description,
        type: createTicketDto.type,
        priority: createTicketDto.priority || 'MEDIUM',
        visibility: createTicketDto.visibility,
        category: createTicketDto.category,
        dueAt: createTicketDto.dueAt ? new Date(createTicketDto.dueAt) : undefined,
        creatorId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(filters: { status?: string; priority?: string; search?: string } = {}) {
    const { status, priority, search } = filters;

    return this.prisma.ticket.findMany({
      where: {
        AND: [
          status ? { status: status as any } : {},
          priority ? { priority: priority as any } : {},
          search
            ? {
                OR: [
                  { subject: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      include: {
        creator: {
          select: {
            username: true,
          },
        },
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
        creator: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`تیکت با کد ${id} یافت نشد.`);
    }

    return ticket;
  }
}
