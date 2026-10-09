// backend/src/auth/auth.service.ts

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';

type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  status: string;
  isSystemUser: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('کاربری با این مشخصات قبلاً ثبت شده است');
    }

    const isFirstUser = (await this.prisma.user.count()) === 0;
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        status: isFirstUser ? 'ACTIVE' : 'INVITED',
        isSystemUser: isFirstUser,
      },
    });

    let organizationId: string | null = null;

    if (isFirstUser) {
      const organization = await this.prisma.organization.create({
        data: {
          name: `${user.firstName} ${user.lastName}`.trim(),
          slug: `${user.username}-${user.id}`,
          ownerId: user.id,
          status: 'ACTIVE',
        },
      });

      const membership = await this.prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          status: 'ACTIVE',
        },
      });

      const role = await this.prisma.role.create({
        data: {
          name: 'Super Admin',
          key: 'SUPER_ADMIN',
          description: 'دسترسی کامل مدیر ارشد سیستم',
          scope: 'ORGANIZATION',
          isSystemRole: true,
          organizationId: organization.id,
        },
      });

      await this.prisma.memberRole.create({
        data: {
          memberId: membership.id,
          roleId: role.id,
        },
      });

      organizationId = organization.id;
    }

    return this.createAuthResponse(user, organizationId);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.identifier },
          { email: dto.identifier },
          { phone: dto.identifier },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('کاربر یا رمز عبور نادرست است');
    }

    const passwordIsValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordIsValid || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('کاربر یا رمز عبور نادرست است');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true },
    });

    return this.createAuthResponse(user, membership?.organizationId ?? null);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return user;
  }

  async getMe(userId: string) {
    const user = await this.validateUser(userId);

    if (!user) {
      throw new UnauthorizedException(
        'کاربر یافت نشد یا حساب کاربری فعال نیست',
      );
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        organizationId: membership?.organizationId ?? null,
      },
    };
  }

  async getPreferences(userId: string) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: {
        locale: true,
        accentColor: true,
        lightContrast: true,
        darkContrast: true,
      },
    });
  }

  async updatePreferences(userId: string, dto: UpdateUserPreferencesDto) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
      select: {
        locale: true,
        accentColor: true,
        lightContrast: true,
        darkContrast: true,
      },
    });
  }

  private createAuthResponse(user: AuthUser, organizationId: string | null) {
    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        username: user.username,
        organizationId: organizationId ?? undefined,
      }),
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        organizationId,
      },
    };
  }
}
