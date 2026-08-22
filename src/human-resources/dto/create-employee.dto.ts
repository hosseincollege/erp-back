/**
 * مسیر فایل:
 * backend/src/human-resources/dto/create-employee.dto.ts
 *
 * هدف:
 * اعتبارسنجی اطلاعات اولیه کارمند هنگام ایجاد پرسنل جدید.
 */

import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  EmployeeStatus,
  EmploymentType,
} from '@prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(50)
  employeeCode: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @IsOptional()
  @IsPhoneNumber('IR')
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  jobTitle?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsDateString()
  hiredAt: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsPhoneNumber('IR')
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
