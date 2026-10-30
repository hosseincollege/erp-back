import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TicketsService } from './tickets.service';
import { ResolveTicketDto, UpdateTicketDto } from './dto/update-ticket.dto';
import type { AuthenticatedUser } from '../../core/auth/strategies/jwt.strategy';

describe('Ticket access and lifecycle', () => {
  const user = { id: 'user-a', organizationId: 'org-a' } as AuthenticatedUser;
  let service: TicketsService;
  let prisma: any;
  let projects: any;
  const ticket = {
    id: 'ticket-a', organizationId: 'org-a', projectId: 'project-a', creatorId: user.id,
    assigneeId: null, parentTicketId: null, childTickets: [], status: 'OPEN',
    resolution: null, resolvedAt: null, closedAt: null, updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    prisma = {
      ticket: { findFirst: jest.fn().mockResolvedValue(ticket), findUnique: jest.fn().mockResolvedValue(ticket), update: jest.fn().mockResolvedValue(ticket) },
      organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
      account: { findFirst: jest.fn().mockResolvedValue(null) },
      contact: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    projects = {
      findSupportProjects: jest.fn().mockResolvedValue([{ id: 'project-a', supportRole: 'MEMBER' }]),
      assertSupportProjectAccess: jest.fn().mockResolvedValue({ id: 'project-a' }),
    };
    service = new TicketsService(prisma, projects);
  });

  it('scopes the initial ticket lookup to the active organization', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    await expect(service.findOneForUser('foreign-ticket', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign-ticket', organizationId: 'org-a' } }));
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('does not write when the project grants read-only access', async () => {
    projects.assertSupportProjectAccess.mockImplementation(async (_user: unknown, _id: string, write: boolean) => {
      if (write) throw new ForbiddenException();
      return {};
    });
    await expect(service.updateForUser(ticket.id, { priority: 'HIGH' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('rejects an assignee outside the active organization', async () => {
    await expect(service.updateForUser(ticket.id, { assigneeId: 'foreign-user' }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org-a', userId: 'foreign-user', status: 'ACTIVE' } }));
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it.each(['accountId', 'contactId'] as const)('rejects a foreign %s', async (field) => {
    await expect(service.updateForUser(ticket.id, { [field]: 'foreign-record' }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('rejects self-parenting and resolution without a summary', async () => {
    await expect(service.updateForUser(ticket.id, { parentTicketId: ticket.id }, user)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateForUser(ticket.id, { status: 'RESOLVED', resolution: '   ' }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('records the resolution time and allows a due date to be cleared', async () => {
    await service.updateForUser(ticket.id, { status: 'RESOLVED', resolution: ' fixed ', dueAt: null }, user);
    expect(prisma.ticket.update).toHaveBeenCalledWith({
      where: { id: ticket.id, organizationId: 'org-a', updatedAt: ticket.updatedAt },
      data: expect.objectContaining({ status: 'RESOLVED', resolution: 'fixed', resolvedAt: expect.any(Date), dueAt: null }),
    });
  });

  it('clears terminal timestamps when reopening a ticket', async () => {
    prisma.ticket.findUnique.mockResolvedValue({ ...ticket, status: 'CLOSED', closedAt: new Date(), resolvedAt: new Date() });
    await service.updateForUser(ticket.id, { status: 'OPEN' }, user);
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resolvedAt: null, closedAt: null }) }));
  });

  it('rejects whitespace-only resolutions and null required fields at validation', async () => {
    expect(await validate(plainToInstance(ResolveTicketDto, { resolution: '   ' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateTicketDto, { status: null, subject: null }))).toHaveLength(2);
    expect(await validate(plainToInstance(ResolveTicketDto, { resolution: 'fixed', billableHours: 1000 }))).not.toHaveLength(0);
  });
});
