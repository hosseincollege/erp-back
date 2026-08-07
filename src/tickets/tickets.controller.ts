/**
 * @file src/tickets/tickets.controller.ts
 * @description Tickets controller for ERP Pro backend
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketsService } from './tickets.service';

type CurrentAuthenticatedUser = {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
};

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser() currentUser: CurrentAuthenticatedUser,
  ) {
    const currentUserId = currentUser?.id ?? currentUser?.sub;

    if (!currentUserId) {
      throw new UnauthorizedException(
        'هویت کاربر برای ثبت تیکت قابل تشخیص نیست.',
      );
    }

    return this.ticketsService.create(createTicketDto, currentUserId);
  }

  @Get()
  async findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }
}
