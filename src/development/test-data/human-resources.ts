import type { TestDataContext, TestDataCounts } from './context';
import { ensureFixtureBranchAndDepartment, fixtureDate, fixtureUserId } from './context';

const leaveStatuses = ['PENDING', 'PENDING', 'DRAFT', 'APPROVED', 'REJECTED', 'CANCELLED', 'PENDING', 'APPROVED', 'PENDING', 'REJECTED', 'DRAFT', 'PENDING', 'APPROVED', 'PENDING', 'CANCELLED', 'PENDING', 'APPROVED', 'REJECTED', 'PENDING', 'DRAFT'] as const;

export async function seedHumanResources(ctx: TestDataContext): Promise<TestDataCounts> {
  const { branch, department } = await ensureFixtureBranchAndDepartment(ctx);
  const employees = [] as Array<{ id: string; employeeCode: string }>;
  for (let index = 0; index < 16; index += 1) {
    const serial = String(index + 1).padStart(3, '0');
    const employeeCode = `TEST-EMP-${serial}`;
    const status = (['ACTIVE', 'ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'] as const)[index % 5];
    const employee = await ctx.db.employee.upsert({
      where: { organizationId_employeeCode: { organizationId: ctx.organizationId, employeeCode } },
      create: {
        organizationId: ctx.organizationId,
        branchId: branch.id,
        departmentId: department.id,
        employeeCode,
        firstName: ['آرمان', 'نگار', 'کیان', 'رها', 'پارسا', 'سارا'][index % 6],
        lastName: `کارمند آزمایشی ${serial}`,
        nationalId: `99999${serial}000`,
        phone: `0912000${serial}`,
        email: `employee-test-${serial}@example.invalid`,
        jobTitle: ['کارشناس مالی', 'توسعه‌دهنده', 'کارشناس فروش', 'مدیر منابع انسانی'][index % 4],
        employmentType: (['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'] as const)[index % 4],
        status,
        hiredAt: fixtureDate(ctx.now, 500 - index * 17),
        terminatedAt: status === 'TERMINATED' ? fixtureDate(ctx.now, 14) : null,
        notes: 'پروندهٔ آزمایشی؛ برای بررسی فهرست و گردش کار منابع انسانی.',
      },
      update: {},
      select: { id: true, employeeCode: true },
    });
    employees.push(employee);
  }

  for (let index = 0; index < leaveStatuses.length; index += 1) {
    const employee = employees[index % employees.length];
    const reason = `درخواست مرخصی آزمایشی ${String(index + 1).padStart(2, '0')}`;
    const existing = await ctx.db.leaveRequest.findFirst({ where: { organizationId: ctx.organizationId, employeeId: employee.id, reason }, select: { id: true } });
    if (existing) continue;
    const status = leaveStatuses[index];
    const reviewed = status === 'APPROVED' || status === 'REJECTED';
    await ctx.db.leaveRequest.create({ data: {
      organizationId: ctx.organizationId,
      employeeId: employee.id,
      reviewedById: reviewed ? fixtureUserId(ctx, index + 1) : null,
      leaveType: (['ANNUAL', 'SICK', 'UNPAID', 'HOURLY', 'OTHER'] as const)[index % 5],
      status,
      startAt: fixtureDate(ctx.now, index - 5),
      endAt: fixtureDate(ctx.now, index - 3),
      durationMinutes: 480 * (1 + (index % 3)),
      reason,
      reviewerNote: status === 'APPROVED' ? 'درخواست تأیید شد (دادهٔ آزمایشی).' : status === 'REJECTED' ? 'برای آزمون وضعیت ردشده.' : null,
      reviewedAt: reviewed ? fixtureDate(ctx.now, 1) : null,
      cancelledAt: status === 'CANCELLED' ? fixtureDate(ctx.now, 2) : null,
      statusHistory: { create: [{ actedById: fixtureUserId(ctx, index), status, note: 'وضعیت اولیهٔ دادهٔ آزمایشی' }] },
    } });
  }

  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];
    const workDate = fixtureDate(ctx.now, index + 1);
    await ctx.db.attendanceRecord.upsert({
      where: { employeeId_workDate: { employeeId: employee.id, workDate } },
      create: {
        organizationId: ctx.organizationId,
        employeeId: employee.id,
        workDate,
        checkInAt: new Date(workDate.getTime() + (8 * 60 + (index % 4) * 15) * 60000),
        checkOutAt: new Date(workDate.getTime() + 17 * 60 * 60000),
        status: (['PRESENT', 'LATE', 'REMOTE', 'ABSENT', 'HALF_DAY'] as const)[index % 5],
        note: 'حضور و غیاب آزمایشی',
        recordedById: fixtureUserId(ctx, index + 1),
      },
      update: {},
    });
    const period = `${ctx.now.getUTCFullYear()}-${String(ctx.now.getUTCMonth() + 1).padStart(2, '0')}`;
    const payrollStatus = (['DRAFT', 'APPROVED', 'PAID'] as const)[index % 3];
    await ctx.db.payrollRecord.upsert({
      where: { employeeId_period: { employeeId: employee.id, period } },
      create: {
        organizationId: ctx.organizationId,
        employeeId: employee.id,
        period,
        currency: 'IRR',
        baseSalary: 450000000 + index * 15000000,
        overtime: index % 2 === 0 ? 25000000 : 0,
        allowances: 35000000,
        deductions: index % 4 === 0 ? 12000000 : 0,
        netAmount: 498000000 + index * 15000000,
        status: payrollStatus,
        note: 'فیش حقوقی آزمایشی',
        createdById: fixtureUserId(ctx, index),
        approvedById: payrollStatus === 'DRAFT' ? null : fixtureUserId(ctx, index + 2),
        approvedAt: payrollStatus === 'DRAFT' ? null : fixtureDate(ctx.now, 1),
        paidAt: payrollStatus === 'PAID' ? fixtureDate(ctx.now, 1) : null,
      },
      update: {},
    });
  }

  return { employees: employees.length, leaveRequests: leaveStatuses.length, attendanceRecords: employees.length, payrollRecords: employees.length };
}
