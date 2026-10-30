// src/support/tickets/tickets.service.ts

/**
 * @file backend/src/support/tickets/tickets.service.ts
 * @description سرویس مدیریت تیکت‌ها و پرونده‌های پشتیبانی (Case Management) منطبق بر استانداردهای Dynamics CRM.
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, ResolveTicketDto } from './dto/update-ticket.dto';
import { Prisma, TicketStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/strategies/jwt.strategy';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService, private projects: ProjectsService) {}

  async create(createTicketDto: CreateTicketDto, user: AuthenticatedUser) {
    const project = await this.projects.assertSupportProjectAccess(user, createTicketDto.projectId, true);
    const lastTicket = await this.prisma.ticket.aggregate({
      where: { organizationId: project.organizationId },
      _max: {
        ticketNumber: true,
      },
    });

    const nextTicketNumber = (lastTicket._max.ticketNumber || 0) + 1;

    return this.prisma.ticket.create({
      data: {
        organizationId: project.organizationId,
        projectId: project.id,
        ticketNumber: nextTicketNumber,
        subject: createTicketDto.subject,
        description: createTicketDto.description,
        type: createTicketDto.type,
        priority: createTicketDto.priority || 'MEDIUM',
        visibility: createTicketDto.visibility,
        category: createTicketDto.category,
        dueAt: createTicketDto.dueAt
          ? new Date(createTicketDto.dueAt)
          : undefined,
        creatorId: user.id,
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

  async findAll(
    user: AuthenticatedUser,
    filters: {
      status?: string;
      priority?: string;
      search?: string;
      accountId?: string;
      contactId?: string;
      projectId?: string;
    } = {},
  ) {
    const { status, priority, search, accountId, contactId, projectId } = filters;
    const accessibleProjects = await this.projects.findSupportProjects(user);
    if (projectId) await this.projects.assertSupportProjectAccess(user, projectId);

    return this.prisma.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        AND: [
          projectId
            ? { projectId }
            : {
                OR: [
                  { projectId: { in: accessibleProjects.map(({ id }) => id) } },
                  { projectId: null, creatorId: user.id },
                ],
              },
          status ? { status: status as any } : {},
          priority ? { priority: priority as any } : {},
          accountId ? { accountId } : {},
          contactId ? { contactId } : {},
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
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            messages: true,
            childTickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForUser(id: string, user: AuthenticatedUser) {
    const projects = await this.projects.findSupportProjects(user);
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, projectId: true, creatorId: true },
    });
    if (!ticket) throw new NotFoundException('تیکت مورد نظر یافت نشد.');
    if (ticket.projectId) {
      await this.projects.assertSupportProjectAccess(user, ticket.projectId);
    } else if (ticket.creatorId !== user.id) {
      throw new NotFoundException('تیکت مورد نظر یافت نشد.');
    }
    const details = await this.findOne(id);
    const project = projects.find((item) => item.id === ticket.projectId);
    return { ...details, canEdit: ticket.projectId ? !!project && project.supportRole !== 'VIEWER' : ticket.creatorId === user.id };
  }

  private async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        parentTicket: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
          },
        },
        childTickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`تیکت با کد ${id} یافت نشد.`);
    }

    return ticket;
  }

  async updateForUser(id: string, dto: UpdateTicketDto, user: AuthenticatedUser) {
    const ticket = await this.findOneForUser(id, user);
    if (ticket.projectId) await this.projects.assertSupportProjectAccess(user, ticket.projectId, true);
    else if (ticket.creatorId !== user.id) throw new NotFoundException('Ticket not found.');
    if (dto.projectId) await this.projects.assertSupportProjectAccess(user, dto.projectId, true);
    if (dto.assigneeId) {
      const assignee = await this.prisma.organizationMember.findFirst({
        where: { organizationId: user.organizationId!, userId: dto.assigneeId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!assignee) throw new BadRequestException('مسئول تیکت باید عضو فعال همین سازمان باشد.');
    }
    const nextAssigneeId = dto.assigneeId === undefined ? ticket.assigneeId : dto.assigneeId;
    const nextProjectId = dto.projectId ?? ticket.projectId;
    if (nextAssigneeId && nextProjectId && (dto.assigneeId !== undefined || dto.projectId !== undefined)) {
      await this.projects.assertSupportProjectAccess({ ...user, id: nextAssigneeId }, nextProjectId, true);
    }
    if (dto.accountId && !(await this.prisma.account.findFirst({ where: { id: dto.accountId, organizationId: user.organizationId! }, select: { id: true } }))) {
      throw new BadRequestException('طرف حساب در این سازمان یافت نشد.');
    }
    if (dto.contactId && !(await this.prisma.contact.findFirst({ where: { id: dto.contactId, organizationId: user.organizationId! }, select: { id: true } }))) {
      throw new BadRequestException('مخاطب در این سازمان یافت نشد.');
    }
    if (dto.parentTicketId) {
      const visited = new Set([id]);
      let parentId: string | null = dto.parentTicketId;
      while (parentId) {
        if (visited.has(parentId)) throw new BadRequestException('ارتباط تیکت‌ها نباید چرخه ایجاد کند.');
        visited.add(parentId);
        const parent = await this.findOneForUser(parentId, user);
        if (parent.projectId !== (dto.projectId ?? ticket.projectId)) throw new BadRequestException('تیکت مادر باید متعلق به همین پروژه باشد.');
        parentId = parent.parentTicketId;
      }
    }
    if (dto.projectId && dto.projectId !== ticket.projectId && (ticket.parentTicketId || ticket.childTickets.length)) {
      throw new BadRequestException('پروژه تیکت دارای ارتباط مادر یا فرزند قابل تغییر نیست.');
    }
    const status = dto.status ?? ticket.status;
    const resolution = dto.resolution?.trim() ?? ticket.resolution;
    if (status === TicketStatus.RESOLVED && !resolution?.trim()) throw new BadRequestException('شرح نتیجه رسیدگی الزامی است.');
    const changedStatus = status !== ticket.status;
    return this.prisma.ticket.update({
      where: { id, organizationId: user.organizationId, updatedAt: ticket.updatedAt },
      data: {
        ...dto,
        resolution: dto.resolution === undefined ? undefined : resolution,
        dueAt: dto.dueAt === null ? null : dto.dueAt ? new Date(dto.dueAt) : undefined,
        targetResolveAt: dto.targetResolveAt === null ? null : dto.targetResolveAt ? new Date(dto.targetResolveAt) : undefined,
        resolvedAt: changedStatus ? (status === TicketStatus.RESOLVED ? new Date() : status === TicketStatus.CLOSED ? ticket.resolvedAt : null) : undefined,
        closedAt: changedStatus ? (status === TicketStatus.CLOSED ? new Date() : null) : undefined,
      },
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException('تیکت هم‌زمان تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.');
      }
      throw error;
    });
  }

  /**
   * شبیه‌سازی فرآیند Resolve Case در Dynamics CRM
   */
  async resolveForUser(id: string, dto: ResolveTicketDto, user: AuthenticatedUser) {
    const ticket = await this.findOneForUser(id, user);

    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('این تیکت قبلاً حل یا بسته شده است.');
    }

    return this.updateForUser(id, {
        status: TicketStatus.RESOLVED,
        resolution: dto.resolution,
        billableHours: dto.billableHours,
    }, user);
  }

  /**
   * شبیه‌سازی فرآیند ادغام پرونده‌ها (Merge Cases) در Dynamics CRM:
   * تیکت‌های فرزند به تیکت اصلی متصل شده و وضعیت آن‌ها به روز می‌شود.
   */
  async mergeTickets(targetTicketId: string, sourceTicketIds: string[]) {
    await this.findOne(targetTicketId);

    return this.prisma.ticket.updateMany({
      where: {
        id: { in: sourceTicketIds },
      },
      data: {
        parentTicketId: targetTicketId,
        status: TicketStatus.CLOSED,
        resolution: `ادغام شده با تیکت اصلی شماره هدف`,
      },
    });
  }
}
