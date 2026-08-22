/**
 * File: backend/src/auth/strategies/jwt.strategy.ts
 *
 * هدف:
 * - اعتبارسنجی JWT
 * - پیدا کردن کاربر فعال
 * - پیدا کردن سازمان فعال کاربر
 * - قرار دادن organizationId در request.user
 *
 * نکته:
 * organizationId مستقیماً داخل مدل User نیست و از
 * OrganizationMember استخراج می‌شود.
 */

import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';

export type JwtPayload = {
  sub: string;
  username?: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
};

export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  status: string;
  isSystemUser: boolean;

  /**
   * اگر کاربر هنوز عضو هیچ سازمانی نشده باشد،
   * مقدار آن null خواهد بود.
   */
  organizationId: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'erp-pro-secret',
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('توکن احراز هویت نامعتبر است');
    }

    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException(
        'کاربر یافت نشد یا حساب کاربری فعال نیست',
      );
    }

    /**
     * اگر در آینده organizationId داخل JWT قرار گرفت،
     * ابتدا همان مقدار استفاده می‌شود.
     *
     * در وضعیت فعلی پروژه، organizationId داخل JWT نیست؛
     * بنابراین از عضویت فعال کاربر استخراج می‌شود.
     */
    let organizationId: string | null =
      payload.organizationId ?? null;

    if (!organizationId) {
      const activeMembership =
        await this.prisma.organizationMember.findFirst({
          where: {
            userId: user.id,
            status: 'ACTIVE',
            organization: {
              status: 'ACTIVE',
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            organizationId: true,
          },
        });

      organizationId = activeMembership?.organizationId ?? null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      isSystemUser: user.isSystemUser,
      organizationId,
    };
  }
}
