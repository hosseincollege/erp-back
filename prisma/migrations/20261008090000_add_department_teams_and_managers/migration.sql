-- Create the foundational HR tables before department/team and attendance migrations.
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN', 'TEMPORARY');
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'HOURLY', 'MATERNITY', 'PATERNITY', 'OTHER');
CREATE TYPE "LeaveRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "postalCode" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "branchId" TEXT,
    "departmentId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "jobTitle" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hiredAt" TIMESTAMP(3) NOT NULL,
    "terminatedAt" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "address" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "leaveType" "LeaveType" NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "reason" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_request_status_history" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "actedById" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_request_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branches_organizationId_code_key" ON "branches"("organizationId", "code");
CREATE INDEX "branches_organizationId_idx" ON "branches"("organizationId");
CREATE UNIQUE INDEX "departments_organizationId_code_key" ON "departments"("organizationId", "code");
CREATE INDEX "departments_organizationId_idx" ON "departments"("organizationId");
CREATE INDEX "departments_branchId_idx" ON "departments"("branchId");
CREATE UNIQUE INDEX "employees_organizationId_employeeCode_key" ON "employees"("organizationId", "employeeCode");
CREATE INDEX "employees_organizationId_status_idx" ON "employees"("organizationId", "status");
CREATE INDEX "employees_organizationId_departmentId_idx" ON "employees"("organizationId", "departmentId");
CREATE INDEX "employees_organizationId_branchId_idx" ON "employees"("organizationId", "branchId");
CREATE INDEX "employees_userId_idx" ON "employees"("userId");
CREATE INDEX "employees_nationalId_idx" ON "employees"("nationalId");
CREATE INDEX "leave_requests_organizationId_status_idx" ON "leave_requests"("organizationId", "status");
CREATE INDEX "leave_requests_organizationId_startAt_idx" ON "leave_requests"("organizationId", "startAt");
CREATE INDEX "leave_requests_employeeId_startAt_idx" ON "leave_requests"("employeeId", "startAt");
CREATE INDEX "leave_requests_reviewedById_idx" ON "leave_requests"("reviewedById");
CREATE INDEX "leave_request_status_history_leaveRequestId_createdAt_idx" ON "leave_request_status_history"("leaveRequestId", "createdAt");
CREATE INDEX "leave_request_status_history_actedById_idx" ON "leave_request_status_history"("actedById");

ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_request_status_history" ADD CONSTRAINT "leave_request_status_history_actedById_fkey"
    FOREIGN KEY ("actedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_request_status_history" ADD CONSTRAINT "leave_request_status_history_leaveRequestId_fkey"
    FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employees" ADD COLUMN "managerId" TEXT;
ALTER TABLE "departments" ADD COLUMN "managerEmployeeId" TEXT;

CREATE TABLE "department_teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "managerEmployeeId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "department_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "department_team_members" (
    "teamId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "department_team_members_pkey" PRIMARY KEY ("teamId", "employeeId")
);

CREATE UNIQUE INDEX "department_teams_departmentId_code_key"
    ON "department_teams"("departmentId", "code");
CREATE INDEX "department_teams_organizationId_departmentId_idx"
    ON "department_teams"("organizationId", "departmentId");
CREATE INDEX "department_teams_managerEmployeeId_idx"
    ON "department_teams"("managerEmployeeId");
CREATE INDEX "department_team_members_employeeId_idx"
    ON "department_team_members"("employeeId");
CREATE INDEX "employees_managerId_idx" ON "employees"("managerId");
CREATE INDEX "departments_managerEmployeeId_idx"
    ON "departments"("managerEmployeeId");

ALTER TABLE "employees"
    ADD CONSTRAINT "employees_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "employees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments"
    ADD CONSTRAINT "departments_managerEmployeeId_fkey"
    FOREIGN KEY ("managerEmployeeId") REFERENCES "employees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "department_teams"
    ADD CONSTRAINT "department_teams_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_teams"
    ADD CONSTRAINT "department_teams_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_teams"
    ADD CONSTRAINT "department_teams_managerEmployeeId_fkey"
    FOREIGN KEY ("managerEmployeeId") REFERENCES "employees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "department_team_members"
    ADD CONSTRAINT "department_team_members_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "department_teams"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_team_members"
    ADD CONSTRAINT "department_team_members_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
