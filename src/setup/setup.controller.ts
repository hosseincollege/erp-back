/**
 * @file src/setup/setup.controller.ts
 * @type backend
 * @description کنترلر بررسی وضعیت راه‌اندازی اولیه سیستم ERP Pro
 */

import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * بررسی می‌کند که آیا حداقل یک کاربر در سیستم وجود دارد یا نه
   *
   * اگر هیچ کاربری وجود نداشته باشد:
   * - سیستم در نصب اولیه است
   * - فرانت می‌تواند گزینه ثبت‌نام مدیر سیستم را نمایش دهد
   *
   * این endpoint عمومی است و نباید نیاز به JWT داشته باشد،
   * چون قبل از راه‌اندازی اولیه سیستم فراخوانی می‌شود.
   */
  @Public()
  @Get('status')
  async getStatus() {
    try {
      const usersCount = await this.prisma.user.count();

      return {
        hasUsers: usersCount > 0,
        isFirstInstall: usersCount === 0,
      };
    } catch (error) {
      console.error('Setup status error:', error);

      /**
       * fallback امن:
       * اگر بررسی دیتابیس خطا خورد، فرانت نباید ثبت‌نام عمومی را باز نشان دهد.
       * بنابراین سیستم را در حالت نصب‌شده فرض می‌کنیم.
       */
      return {
        hasUsers: true,
        isFirstInstall: false,
      };
    }
  }
}
