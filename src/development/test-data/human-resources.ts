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
        lastName: ['احمدی', 'رضایی', 'کریمی', 'موسوی', 'جعفری', 'حسینی'][index % 6],
        nationalId: null,
        phone: `0912000${serial.padStart(4, '0')}`,
        email: `employee-${serial}@example.com`,
        jobTitle: ['کارشناس مالی', 'توسعه‌دهنده', 'کارشناس فروش', 'مدیر منابع انسانی'][index % 4],
        employmentType: (['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'] as const)[index % 4],
        status,
        hiredAt: fixtureDate(ctx.now, 500 - index * 17),
        terminatedAt: status === 'TERMINATED' ? fixtureDate(ctx.now, 14) : null,
        notes: 'پرونده پرسنلی شامل اطلاعات استخدام، حضور و ارزیابی‌های دوره‌ای.',
      },
      update: {},
      select: { id: true, employeeCode: true, lastName: true, email: true, nationalId: true, notes: true },
    });
    const legacyValues: { lastName?: string; email?: string; nationalId?: null; notes?: string } = {};
    if (employee.lastName === `کارمند آزمایشی ${serial}`) legacyValues.lastName = ['احمدی', 'رضایی', 'کریمی', 'موسوی', 'جعفری', 'حسینی'][index % 6];
    if (employee.email === `employee-test-${serial}@example.invalid`) legacyValues.email = `employee-${serial}@example.com`;
    if (employee.nationalId === `99999${serial}000`) legacyValues.nationalId = null;
    if (employee.notes === 'پروندهٔ آزمایشی؛ برای بررسی فهرست و گردش کار منابع انسانی.') legacyValues.notes = 'پرونده پرسنلی شامل اطلاعات استخدام، حضور و ارزیابی‌های دوره‌ای.';
    if (Object.keys(legacyValues).length) await ctx.db.employee.update({ where: { id: employee.id }, data: legacyValues });
    employees.push(employee);
  }

  for (let index = 0; index < leaveStatuses.length; index += 1) {
    const employee = employees[index % employees.length];
    const serial = String(index + 1).padStart(2, '0');
    const reason = `${['مرخصی سالانه برای امور شخصی', 'مراجعه پزشکی و استراحت', 'رسیدگی به امور خانوادگی', 'مرخصی ساعتی برای پیگیری اداری'][index % 4]} (${serial})`;
    const existing = await ctx.db.leaveRequest.findFirst({ where: { organizationId: ctx.organizationId, employeeId: employee.id, reason }, select: { id: true } });
    if (existing) continue;
    const legacyReason = `درخواست مرخصی آزمایشی ${serial}`;
    const legacyRequest = await ctx.db.leaveRequest.findFirst({ where: { organizationId: ctx.organizationId, employeeId: employee.id, reason: legacyReason }, select: { id: true, reviewerNote: true } });
    if (legacyRequest) {
      const legacyNote = leaveStatuses[index] === 'APPROVED' ? 'درخواست تأیید شد (دادهٔ آزمایشی).' : leaveStatuses[index] === 'REJECTED' ? 'برای آزمون وضعیت ردشده.' : null;
      await ctx.db.leaveRequest.update({ where: { id: legacyRequest.id }, data: { reason, ...(legacyRequest.reviewerNote === legacyNote && { reviewerNote: leaveStatuses[index] === 'APPROVED' ? 'درخواست با هماهنگی سرپرست تأیید شد.' : leaveStatuses[index] === 'REJECTED' ? 'به دلیل تداخل با برنامه کاری، درخواست تأیید نشد.' : null }) } });
      await ctx.db.leaveRequestStatusHistory.updateMany({ where: { leaveRequestId: legacyRequest.id, note: 'وضعیت اولیهٔ دادهٔ آزمایشی' }, data: { note: 'وضعیت درخواست در سامانه ثبت شد.' } });
      continue;
    }
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
      reviewerNote: status === 'APPROVED' ? 'درخواست با هماهنگی سرپرست تأیید شد.' : status === 'REJECTED' ? 'به دلیل تداخل با برنامه کاری، درخواست تأیید نشد.' : null,
      reviewedAt: reviewed ? fixtureDate(ctx.now, 1) : null,
      cancelledAt: status === 'CANCELLED' ? fixtureDate(ctx.now, 2) : null,
      statusHistory: { create: [{ actedById: fixtureUserId(ctx, index), status, note: status === 'PENDING' ? 'در انتظار بررسی سرپرست واحد' : 'وضعیت درخواست در سامانه ثبت شد.' }] },
    } });
  }

  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];
    const workDate = fixtureDate(ctx.now, index + 1);
    const attendance = await ctx.db.attendanceRecord.upsert({
      where: { employeeId_workDate: { employeeId: employee.id, workDate } },
      create: {
        organizationId: ctx.organizationId,
        employeeId: employee.id,
        workDate,
        checkInAt: new Date(workDate.getTime() + (8 * 60 + (index % 4) * 15) * 60000),
        checkOutAt: new Date(workDate.getTime() + 17 * 60 * 60000),
        status: (['PRESENT', 'LATE', 'REMOTE', 'ABSENT', 'HALF_DAY'] as const)[index % 5],
        note: 'ثبت حضور روزانه طبق برنامه کاری شعبه.',
        recordedById: fixtureUserId(ctx, index + 1),
      },
      update: {},
      select: { id: true, note: true },
    });
    if (attendance.note === 'حضور و غیاب آزمایشی') await ctx.db.attendanceRecord.update({ where: { id: attendance.id }, data: { note: 'ثبت حضور روزانه طبق برنامه کاری شعبه.' } });
    const period = `${ctx.now.getUTCFullYear()}-${String(ctx.now.getUTCMonth() + 1).padStart(2, '0')}`;
    const payrollStatus = (['DRAFT', 'APPROVED', 'PAID'] as const)[index % 3];
    const payroll = await ctx.db.payrollRecord.upsert({
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
        note: 'حقوق پایه، اضافه‌کاری و مزایای ماهانه.',
        createdById: fixtureUserId(ctx, index),
        approvedById: payrollStatus === 'DRAFT' ? null : fixtureUserId(ctx, index + 2),
        approvedAt: payrollStatus === 'DRAFT' ? null : fixtureDate(ctx.now, 1),
        paidAt: payrollStatus === 'PAID' ? fixtureDate(ctx.now, 1) : null,
      },
      update: {},
      select: { id: true, note: true },
    });
    if (payroll.note === 'فیش حقوقی آزمایشی') await ctx.db.payrollRecord.update({ where: { id: payroll.id }, data: { note: 'حقوق پایه، اضافه‌کاری و مزایای ماهانه.' } });
  }

  return { employees: employees.length, leaveRequests: leaveStatuses.length, attendanceRecords: employees.length, payrollRecords: employees.length };
}
