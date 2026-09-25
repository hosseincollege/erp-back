import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto, creatorUserId: string) {
    if (!dto.organizationId) {
      throw new BadRequestException('شناسه سازمان (organizationId) الزامی است.');
    }

    const existing = await this.prisma.project.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`پروژه‌ای با کد ${dto.code} قبلاً ثبت شده است.`);
    }

    // اضافه کردن اعضا (کاربر ایجادکننده نیز به طور خودکار اضافه می‌شود)
    const memberIds = Array.from(new Set([creatorUserId, ...(dto.memberUserIds || [])]));

    return this.prisma.project.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        organizationId: dto.organizationId,
        members: {
          create: memberIds.map((userId) => ({
            userId,
            role: userId === creatorUserId ? 'MANAGER' : 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    // بازگرداندن پروژه‌ها همراه با شمارش تیکت‌ها و لیست اعضا
    return this.prisma.project.findMany({
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: { tickets: true, members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('پروژه مورد نظر یافت نشد.');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('پروژه یافت نشد.');

    // در صورتی که اعضای پروژه ویرایش شده باشند
    if (dto.memberUserIds) {
      await this.prisma.projectMember.deleteMany({ where: { projectId: id } });
      await this.prisma.projectMember.createMany({
        data: dto.memberUserIds.map((userId) => ({
          projectId: id,
          userId,
          role: 'MEMBER',
        })),
      });
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code ? dto.code.toUpperCase() : undefined,
        description: dto.description,
        status: dto.status as any,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('پروژه یافت نشد.');

    return this.prisma.project.delete({ where: { id } });
  }
}
