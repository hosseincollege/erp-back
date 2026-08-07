/**
 * @file src/tickets/dto/create-ticket.dto.ts
 * @type backend
 * @description DTO حرفه‌ای ایجاد تیکت با اعتبارسنجی دقیق ورودی برای ERP Pro
 */

import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTicketDto {
  @IsString({ message: 'عنوان تیکت باید رشته باشد' })
  @IsNotEmpty({ message: 'عنوان تیکت الزامی است' })
  @MinLength(5, { message: 'عنوان تیکت باید حداقل ۵ کاراکتر باشد' })
  @MaxLength(150, { message: 'عنوان تیکت نباید بیشتر از ۱۵۰ کاراکتر باشد' })
  title: string;

  @IsString({ message: 'شرح تیکت باید رشته باشد' })
  @IsNotEmpty({ message: 'شرح تیکت الزامی است' })
  @MinLength(10, { message: 'شرح تیکت باید حداقل ۱۰ کاراکتر باشد' })
  @MaxLength(5000, { message: 'شرح تیکت نباید بیشتر از ۵۰۰۰ کاراکتر باشد' })
  description: string;

  @IsOptional()
  @IsString({ message: 'نام مشتری باید رشته باشد' })
  @MaxLength(120, { message: 'نام مشتری نباید بیشتر از ۱۲۰ کاراکتر باشد' })
  customerName?: string;

  @IsOptional()
  @IsString({ message: 'شماره تماس مشتری باید رشته باشد' })
  @MinLength(7, { message: 'شماره تماس مشتری معتبر نیست' })
  @MaxLength(20, { message: 'شماره تماس مشتری نباید بیشتر از ۲۰ کاراکتر باشد' })
  customerPhone?: string;

  @IsOptional()
  @IsUUID('4', { message: 'شناسه مشتری باید یک UUID معتبر باشد' })
  customerId?: string;

  @IsOptional()
  @IsString({ message: 'اولویت تیکت باید رشته باشد' })
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
    message: 'اولویت تیکت باید یکی از LOW, MEDIUM, HIGH, URGENT باشد',
  })
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsString({ message: 'وضعیت تیکت باید رشته باشد' })
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
    message: 'وضعیت تیکت باید یکی از OPEN, IN_PROGRESS, RESOLVED, CLOSED باشد',
  })
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

  @IsOptional()
  @IsString({ message: 'منبع تیکت باید رشته باشد' })
  @IsIn(['PHONE', 'EMAIL', 'WHATSAPP', 'TELEGRAM', 'WEB', 'IN_PERSON', 'OTHER'], {
    message:
      'منبع تیکت باید یکی از PHONE, EMAIL, WHATSAPP, TELEGRAM, WEB, IN_PERSON, OTHER باشد',
  })
  source?: 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'TELEGRAM' | 'WEB' | 'IN_PERSON' | 'OTHER';
}
