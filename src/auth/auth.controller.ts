/**
 * @file src/auth/auth.controller.ts
 * @type backend
 * @description کنترلر احراز هویت برای ثبت‌نام و ورود کاربران ERP Pro
 */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ثبت‌نام کاربر جدید
   *
   * POST /auth/register
   *
   * این endpoint عمومی است، زیرا کاربر پیش از ثبت‌نام
   * هنوز access token ندارد.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * ورود کاربر و دریافت access token
   *
   * POST /auth/login
   *
   * این endpoint عمومی است، زیرا وظیفه آن صدور اولین توکن کاربر است.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
