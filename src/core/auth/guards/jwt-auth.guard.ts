/**
 * @file src/core/auth/guards/jwt-auth.guard.ts
 * @type backend
 * @description گارد عمومی احراز هویت با JWT برای محافظت از endpointهای ERP Pro
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
