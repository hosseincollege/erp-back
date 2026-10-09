// backend/src/core/auth/auth.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { Public } from './decorators/public.decorator';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user?: { id?: string } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return {
      success: true,
      message: 'خروج با موفقیت انجام شد',
    };
  }

  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('کاربر احراز هویت نشده است');
    }

    return this.authService.getMe(userId);
  }

  @Get('preferences')
  getPreferences(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('کاربر احراز هویت نشده است');
    return this.authService.getPreferences(userId);
  }

  @Put('preferences')
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('کاربر احراز هویت نشده است');
    return this.authService.updatePreferences(userId, dto);
  }
}
