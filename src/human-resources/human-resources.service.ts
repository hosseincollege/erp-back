/**
 * مسیر فایل:
 * backend/src/human-resources/human-resources.service.ts
 *
 * منطق تجاری ماژول منابع انسانی:
 * - مدیریت کارکنان
 * - مدیریت درخواست‌های مرخصی
 * - ثبت تاریخچه تغییر وضعیت مرخصی
 * - اعمال کامل محدوده سازمان جاری
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  EmployeeStatus,
  EmploymentType,
  LeaveRequestStatus,
  LeaveType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateLeaveRequestStatusDto } from './dto/update-leave-request-status.dto';

type CurrentAuthUser = {
  id: string;
  organizationId: string | null;
};

type EmployeeFilters = {
  search?: string;
  status?: EmployeeStatus;
  employmentType?: EmploymentType;
  branchId?: string;
  departmentId?: string;
};

type LeaveRequestFilters = {
  employeeId?: string;
  status?: LeaveRequestStatus;
  leaveType?: LeaveType;
};

@Injectable()
export class HumanResourcesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * اطمینان از وجود سازمان فعال برای کاربر جاری
   */
  private getOrganizationId(user: CurrentAuthUser): string {
    if (!user.organizationId) {
      throw new BadRequestException(
        'کاربر به هیچ سازمان فعالی دسترسی ندارد.',
      );
    }

    return user.organizationId;
  }

  /**
   * تبدیل رشته تاریخ به Date معتبر
   */
  private parseDate(
    value: string | null | undefined,
    fieldName: string,
  ): Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `مقدار فیلد ${fieldName} تاریخ معتبر نیست.`,
      );
    }

    return date;
  }

  /**
   * محاسبه مدت مرخصی برحسب دقیقه
   */
  private calculateDurationMinutes(
    startAt: Date,
    endAt: Date,
  ): number {
    const durationMilliseconds =
      endAt.getTime() - startAt.getTime();

    if (durationMilliseconds <= 0) {
      throw new BadRequestException(
        'تاریخ پایان مرخصی باید بعد از تاریخ شروع باشد.',
      );
    }

    const durationMinutes = Math.ceil(
      durationMilliseconds / (1000 * 60),
    );

    if (durationMinutes <= 0) {
      throw new BadRequestException(
        'مدت مرخصی باید بیشتر از صفر دقیقه باشد.',
      );
    }

    return durationMinutes;
  }

  /**
   * مدیریت خطاهای محدودیت Prisma
   */
  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'رکوردی با یکی از مقادیر یکتا از قبل وجود دارد.',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(
          'رکورد موردنظر پیدا نشد.',
        );
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'یکی از ارتباطات ارجاع‌شده معتبر نیست.',
        );
      }
    }

    throw error;
  }

  /**
   * بررسی تعلق کاربر، شعبه یا دپارتمان به سازمان جاری
   */
  private async validateEmployeeRelations(
    organizationId: string,
    dto: {
      userId?: string | null;
      branchId?: string | null;
      departmentId?: string | null;
    },
  ): Promise<void> {
    if (dto.userId) {
      const membership =
        await this.prisma.organizationMember.findFirst({
          where: {
            userId: dto.userId,
            organizationId,
            status: 'ACTIVE',
          },
          select: {
            id: true,
          },
        });

      if (!membership) {
        throw new BadRequestException(
          'کاربر انتخاب‌شده عضو فعال سازمان جاری نیست.',
        );
      }
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!branch) {
        throw new BadRequestException(
          'شعبه انتخاب‌شده متعلق به سازمان جاری نیست.',
        );
      }
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'دپارتمان انتخاب‌شده متعلق به سازمان جاری نیست.',
        );
      }
    }
  }

  /**
   * داشبورد منابع انسانی
   */
  async getDashboard(user: CurrentAuthUser) {
    const organizationId = this.getOrganizationId(user);

    const [
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      terminatedEmployees,
      totalLeaveRequests,
      pendingLeaveRequests,
      approvedLeaveRequests,
      rejectedLeaveRequests,
    ] = await Promise.all([
      this.prisma.employee.count({
        where: {
          organizationId,
        },
      }),

      this.prisma.employee.count({
        where: {
          organizationId,
          status: EmployeeStatus.ACTIVE,
        },
      }),

      this.prisma.employee.count({
        where: {
          organizationId,
          status: EmployeeStatus.ON_LEAVE,
        },
      }),

      this.prisma.employee.count({
        where: {
          organizationId,
          status: EmployeeStatus.TERMINATED,
        },
      }),

      this.prisma.leaveRequest.count({
        where: {
          organizationId,
        },
      }),

      this.prisma.leaveRequest.count({
        where: {
          organizationId,
          status: LeaveRequestStatus.PENDING,
        },
      }),

      this.prisma.leaveRequest.count({
        where: {
          organizationId,
          status: LeaveRequestStatus.APPROVED,
        },
      }),

      this.prisma.leaveRequest.count({
        where: {
          organizationId,
          status: LeaveRequestStatus.REJECTED,
        },
      }),
    ]);

    return {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        onLeave: onLeaveEmployees,
        terminated: terminatedEmployees,
      },
      leaveRequests: {
        total: totalLeaveRequests,
        pending: pendingLeaveRequests,
        approved: approvedLeaveRequests,
        rejected: rejectedLeaveRequests,
      },
    };
  }

  /**
   * فهرست کارکنان
   */
  async getEmployees(
    user: CurrentAuthUser,
    filters: EmployeeFilters = {},
  ) {
    const organizationId = this.getOrganizationId(user);

    const where: Prisma.EmployeeWhereInput = {
      organizationId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.employmentType) {
      where.employmentType = filters.employmentType;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();

      where.OR = [
        {
          employeeCode: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          nationalId: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        user: true,
        branch: true,
        department: true,
        leaveRequests: {
          orderBy: {
            startAt: 'desc',
          },
        },
      },
      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],
    });
  }

  /**
   * جزئیات یک کارمند
   */
  async getEmployeeById(
    user: CurrentAuthUser,
    employeeId: string,
  ) {
    const organizationId = this.getOrganizationId(user);

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        organizationId,
      },
      include: {
        user: true,
        branch: true,
        department: true,
        leaveRequests: {
          include: {
            reviewedBy: true,
            statusHistory: {
              include: {
                actedBy: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
          orderBy: {
            startAt: 'desc',
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'کارمند موردنظر پیدا نشد.',
      );
    }

    return employee;
  }

  /**
   * ایجاد کارمند
   */
  async createEmployee(
    user: CurrentAuthUser,
    dto: CreateEmployeeDto,
  ) {
    const organizationId = this.getOrganizationId(user);

    await this.validateEmployeeRelations(
      organizationId,
      dto,
    );

    const hiredAt = this.parseDate(
      dto.hiredAt,
      'hiredAt',
    );

    if (!hiredAt) {
      throw new BadRequestException(
        'تاریخ استخدام الزامی است.',
      );
    }

    try {
      return await this.prisma.employee.create({
        data: {
          organizationId,
          employeeCode: dto.employeeCode,
          userId: dto.userId ?? null,
          branchId: dto.branchId ?? null,
          departmentId: dto.departmentId ?? null,
          firstName: dto.firstName,
          lastName: dto.lastName,
          nationalId: dto.nationalId ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          jobTitle: dto.jobTitle ?? null,
          employmentType:
            dto.employmentType ?? EmploymentType.FULL_TIME,
          status: dto.status ?? EmployeeStatus.ACTIVE,
          hiredAt,
          birthDate: this.parseDate(
            dto.birthDate,
            'birthDate',
          ),
          address: dto.address ?? null,
          emergencyPhone: dto.emergencyPhone ?? null,
          notes: dto.notes ?? null,
        },
        include: {
          user: true,
          branch: true,
          department: true,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * ویرایش کارمند
   */
  async updateEmployee(
    user: CurrentAuthUser,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    const organizationId = this.getOrganizationId(user);

    const existingEmployee =
      await this.prisma.employee.findFirst({
        where: {
          id: employeeId,
          organizationId,
        },
        select: {
          id: true,
        },
      });

    if (!existingEmployee) {
      throw new NotFoundException(
        'کارمند موردنظر پیدا نشد.',
      );
    }

    await this.validateEmployeeRelations(
      organizationId,
      dto,
    );

    const data: Prisma.EmployeeUncheckedUpdateInput = {};

    if (dto.employeeCode !== undefined) {
      data.employeeCode = dto.employeeCode;
    }

    if (dto.userId !== undefined) {
      data.userId = dto.userId;
    }

    if (dto.branchId !== undefined) {
      data.branchId = dto.branchId;
    }

    if (dto.departmentId !== undefined) {
      data.departmentId = dto.departmentId;
    }

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }

    if (dto.nationalId !== undefined) {
      data.nationalId = dto.nationalId;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }

    if (dto.email !== undefined) {
      data.email = dto.email;
    }

    if (dto.jobTitle !== undefined) {
      data.jobTitle = dto.jobTitle;
    }

    if (dto.employmentType !== undefined) {
      data.employmentType = dto.employmentType;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.hiredAt !== undefined) {
      const hiredAt = this.parseDate(
        dto.hiredAt,
        'hiredAt',
      );

      if (!hiredAt) {
        throw new BadRequestException(
          'تاریخ استخدام معتبر نیست.',
        );
      }

      data.hiredAt = hiredAt;
    }

    if (dto.terminatedAt !== undefined) {
      data.terminatedAt = this.parseDate(
        dto.terminatedAt,
        'terminatedAt',
      );
    }

    if (dto.birthDate !== undefined) {
      data.birthDate = this.parseDate(
        dto.birthDate,
        'birthDate',
      );
    }

    if (dto.address !== undefined) {
      data.address = dto.address;
    }

    if (dto.emergencyPhone !== undefined) {
      data.emergencyPhone = dto.emergencyPhone;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    try {
      return await this.prisma.employee.update({
        where: {
          id: employeeId,
        },
        data,
        include: {
          user: true,
          branch: true,
          department: true,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * فهرست درخواست‌های مرخصی
   */
  async getLeaveRequests(
    user: CurrentAuthUser,
    filters: LeaveRequestFilters = {},
  ) {
    const organizationId = this.getOrganizationId(user);

    const where: Prisma.LeaveRequestWhereInput = {
      organizationId,
    };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.leaveType) {
      where.leaveType = filters.leaveType;
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            branch: true,
            department: true,
          },
        },
        reviewedBy: true,
        statusHistory: {
          include: {
            actedBy: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * جزئیات درخواست مرخصی
   */
  async getLeaveRequestById(
    user: CurrentAuthUser,
    leaveRequestId: string,
  ) {
    const organizationId = this.getOrganizationId(user);

    const leaveRequest =
      await this.prisma.leaveRequest.findFirst({
        where: {
          id: leaveRequestId,
          organizationId,
        },
        include: {
          employee: {
            include: {
              user: true,
              branch: true,
              department: true,
            },
          },
          reviewedBy: true,
          statusHistory: {
            include: {
              actedBy: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!leaveRequest) {
      throw new NotFoundException(
        'درخواست مرخصی موردنظر پیدا نشد.',
      );
    }

    return leaveRequest;
  }

  /**
   * ایجاد درخواست مرخصی
   */
  async createLeaveRequest(
    user: CurrentAuthUser,
    dto: CreateLeaveRequestDto,
  ) {
    const organizationId = this.getOrganizationId(user);

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        organizationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'کارمند موردنظر در سازمان جاری پیدا نشد.',
      );
    }

    if (employee.status === EmployeeStatus.TERMINATED) {
      throw new BadRequestException(
        'برای کارمند خاتمه‌یافته نمی‌توان درخواست مرخصی ثبت کرد.',
      );
    }

    const startAt = this.parseDate(
      dto.startAt,
      'startAt',
    );

    const endAt = this.parseDate(
      dto.endAt,
      'endAt',
    );

    if (!startAt || !endAt) {
      throw new BadRequestException(
        'تاریخ شروع و پایان مرخصی الزامی است.',
      );
    }

    const durationMinutes =
      this.calculateDurationMinutes(
        startAt,
        endAt,
      );

    const overlappingRequest =
      await this.prisma.leaveRequest.findFirst({
        where: {
          organizationId,
          employeeId: dto.employeeId,
          status: {
            in: [
              LeaveRequestStatus.PENDING,
              LeaveRequestStatus.APPROVED,
            ],
          },
          startAt: {
            lt: endAt,
          },
          endAt: {
            gt: startAt,
          },
        },
        select: {
          id: true,
        },
      });

    if (overlappingRequest) {
      throw new ConflictException(
        'برای این کارمند در بازه زمانی انتخاب‌شده، درخواست مرخصی دیگری وجود دارد.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const leaveRequest =
            await transaction.leaveRequest.create({
              data: {
                organizationId,
                employeeId: dto.employeeId,
                leaveType: dto.leaveType,
                status: LeaveRequestStatus.PENDING,
                startAt,
                endAt,
                durationMinutes,
              },
            });

          await transaction.leaveRequestStatusHistory.create({
            data: {
              leaveRequestId: leaveRequest.id,
              actedById: user.id,
              status: LeaveRequestStatus.PENDING,
            },
          });

          return transaction.leaveRequest.findUnique({
            where: {
              id: leaveRequest.id,
            },
            include: {
              employee: {
                include: {
                  branch: true,
                  department: true,
                },
              },
              statusHistory: {
                include: {
                  actedBy: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          });
        },
      );
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * تغییر وضعیت درخواست مرخصی
   */
  async updateLeaveRequestStatus(
    user: CurrentAuthUser,
    leaveRequestId: string,
    dto: UpdateLeaveRequestStatusDto,
  ) {
    const organizationId = this.getOrganizationId(user);

    const existingRequest =
      await this.prisma.leaveRequest.findFirst({
        where: {
          id: leaveRequestId,
          organizationId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!existingRequest) {
      throw new NotFoundException(
        'درخواست مرخصی موردنظر پیدا نشد.',
      );
    }

    if (
      existingRequest.status ===
      LeaveRequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'وضعیت درخواست لغوشده قابل تغییر نیست.',
      );
    }

    if (
      existingRequest.status ===
      LeaveRequestStatus.REJECTED &&
      dto.status === LeaveRequestStatus.APPROVED
    ) {
      throw new BadRequestException(
        'درخواست ردشده مستقیماً قابل تأیید نیست.',
      );
    }

    const updateData: Prisma.LeaveRequestUncheckedUpdateInput =
      {
        status: dto.status,
        reviewerNote: dto.reviewerNote ?? null,
        reviewedById: user.id,
        reviewedAt: new Date(),
        cancelledAt:
          dto.status === LeaveRequestStatus.CANCELLED
            ? new Date()
            : null,
      };

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await transaction.leaveRequest.update({
            where: {
              id: leaveRequestId,
            },
            data: updateData,
          });

          await transaction.leaveRequestStatusHistory.create({
            data: {
              leaveRequestId,
              actedById: user.id,
              status: dto.status,
              note: dto.reviewerNote ?? null,
            },
          });

          return transaction.leaveRequest.findFirst({
            where: {
              id: leaveRequestId,
              organizationId,
            },
            include: {
              employee: {
                include: {
                  user: true,
                  branch: true,
                  department: true,
                },
              },
              reviewedBy: true,
              statusHistory: {
                include: {
                  actedBy: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          });
        },
      );
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
}
