// src/support/tickets/dto/update-ticket.dto.ts

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNotEmpty,
  MaxLength,
  Max,
  ValidateIf,
  Min,
} from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
  TicketType,
  TicketVisibility,
} from '@prisma/client';
import { Transform } from 'class-transformer';

export class UpdateTicketDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TicketType)
  type?: TicketType;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TicketVisibility)
  visibility?: TicketVisibility;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  // فیلدهای حرفه‌ای فرآیند Case Management مایکروسافت داینامیکس
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  parentTicketId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resolution?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  billableHours?: number;

  @IsOptional()
  @IsDateString()
  targetResolveAt?: string | null;
}

export class ResolveTicketDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  resolution: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  billableHours?: number;
}
