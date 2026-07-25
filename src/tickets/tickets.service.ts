import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTicketDto: CreateTicketDto) {
    const count = await this.prisma.ticket.count();
    const ticketNumber = `TCK-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.ticket.create({
      data: {
        ticketNumber,
        title: createTicketDto.title,
        description: createTicketDto.description,
        customerId: createTicketDto.customerId,
        customerName: createTicketDto.customerName,
        customerPhone: createTicketDto.customerPhone,
        priority: createTicketDto.priority ?? 'MEDIUM',
        status: createTicketDto.status ?? 'OPEN',
        source: createTicketDto.source ?? 'PHONE',
      },
      include: {
        customer: true,
      },
    });
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
}
