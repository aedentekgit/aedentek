import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5096';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Staff } = await import('../src/models/Staff.js');
const { default: StaffAttendance } = await import('../src/models/StaffAttendance.js');
const { default: LeaveRequest } = await import('../src/models/LeaveRequest.js');
const { default: LeaveType } = await import('../src/models/LeaveType.js');
const { default: SalaryStructure } = await import('../src/models/SalaryStructure.js');
const { default: SalaryAdvance } = await import('../src/models/SalaryAdvance.js');
const { default: PayrollAdjustment } = await import('../src/models/PayrollAdjustment.js');
const { default: PayrollRun } = await import('../src/models/PayrollRun.js');
const { default: User } = await import('../src/models/User.js');
const {
  timeToMinutes, minutesToTime, inclusiveDays, daysInMonth,
  resolvePunch, workingHoursBetween, computeLeaveImpact,
  computeAvailableBalance, computePayslip, round2
} = await import('../src/utils/hrEngine.js');

const PORT = 5096;
const BASE_URL = `http://localhost:${PORT}`;

let server;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed += 1; console.log(`  ✓ ${label}`); }
  else { failed += 1; console.error(`  ✗ ${label}`); }
};

const stamp = Date.now();
const TEST_BIO = `TSTHR${stamp}`;

async function runTests() {
  console.log('--- STARTING HR & PAYROLL INTEGRATION TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));

  try {
    // ================================================================
    // 1. ENGINE UNIT TESTS (pure functions)
    // ================================================================
    console.log('\nTest 1: Payroll / punch / leave engine maths');
    check(timeToMinutes('09:15') === 555, 'timeToMinutes("09:15") === 555');
    check(timeToMinutes('00:00') === 0, 'timeToMinutes("00:00") === 0');
    check(timeToMinutes('nonsense') === null, 'timeToMinutes rejects invalid input');
    check(minutesToTime(150) === '02:30', 'minutesToTime(150) === "02:30"');
    check(minutesToTime(0) === '00:00', 'minutesToTime(0) === "00:00"');
    check(inclusiveDays('2026-11-03', '2026-11-05') === 3, 'inclusiveDays spans 3 days inclusive');
    check(inclusiveDays('2026-11-03', '2026-11-03') === 1, 'inclusiveDays of a single day === 1');
    check(inclusiveDays('2026-11-05', '2026-11-03') === 0, 'inclusiveDays returns 0 for an inverted range');
    check(daysInMonth('2026-11') === 30, 'daysInMonth("2026-11") === 30');
    check(daysInMonth('2026-02') === 28, 'daysInMonth("2026-02") === 28');
    check(round2(1234.5678) === 1234.57, 'round2 rounds to 2 decimals');

    const onTime = resolvePunch({ shift: { lateAfter: '09:15' }, checkIn: null, time: '09:05' });
    check(onTime.status === 'Present' && onTime.lateMinutes === 0, 'on-time punch resolves to Present with 0 late minutes');
    const late = resolvePunch({ shift: { lateAfter: '09:15', lateDeduction: 50 }, checkIn: null, time: '09:30' });
    check(late.status === 'Late' && late.lateMinutes === 15, 'late punch resolves to Late with 15 late minutes');
    check(late.lateFine === 50, 'late punch with a flat deduction applies the flat fine');
    const perMin = resolvePunch({ shift: { lateAfter: '09:15', lateDeductionPerMin: 5 }, checkIn: null, time: '09:23' });
    check(perMin.lateFine === 40, 'late punch with a per-minute rule applies minutes x rate');
    const second = resolvePunch({ shift: { lateAfter: '09:15' }, checkIn: '09:05', time: '18:00' });
    check(second.status === 'Present' && second.lateMinutes === 0, 'a second same-day punch is a checkout, not a late arrival');
    check(workingHoursBetween('09:00', '18:30') === '9h 30m', 'workingHoursBetween formats as "Xh Ym"');
    check(workingHoursBetween('18:00', '09:00') === '', 'workingHoursBetween returns empty for an inverted range');

    check(computeLeaveImpact({ days: 3, paid: false, availableBalance: 0 }).lopDays === 3, 'unpaid leave is fully loss-of-pay');
    check(computeLeaveImpact({ days: 3, paid: true, availableBalance: 10 }).paidDays === 3, 'paid leave within quota is fully paid');
    const overflow = computeLeaveImpact({ days: 5, paid: true, availableBalance: 2 });
    check(overflow.paidDays === 2 && overflow.lopDays === 3, 'paid leave beyond quota splits into paid and loss-of-pay');
    check(computeAvailableBalance({ leaveType: { annualQuota: 12 }, usedDays: 5 }) === 7, 'available balance subtracts used days from the annual quota');

    // Deterministic payslip: 30-day month, gross 60000, no shift allowance,
    // 4 absent days, 1 half day, no adjustments, no advance.
    const formula = computePayslip({
      staff: { employeeCode: 'GG999', staffCode: 'TS-9999', name: 'Formula Test', role: 'Staff', branch: 'TestBranch' },
      structure: { gross: 60000, totalDeductions: 0 },
      shift: null,
      attendance: [
        { status: 'Absent' }, { status: 'Absent' }, { status: 'Absent' }, { status: 'Absent' },
        { status: 'Half Day' }
      ],
      adjustments: [],
      advance: null,
      period: '2026-11',
      autoReconcile: false,
      unpaidLeaveDays: 0
    });
    check(formula.grossPay === 60000, 'payslip gross equals the salary structure gross');
    check(formula.lopDays === 4.5, 'LOP days = absent(4) + 0.5 x halfDay(1) = 4.5');
    check(formula.lopDeduction === 9000, 'LOP deduction = 60000 x 4.5 / 30 = 9000');
    check(formula.totalEarnings === 51000, 'total earnings = gross - LOP deduction');
    check(formula.netPayout === 51000, 'net payout equals total earnings with no deductions');
    check(formula.attendance.absent === 4, 'payslip attendance roll-up counts absences');

    // Advance recovery is capped by the available margin.
    const capped = computePayslip({
      staff: { employeeCode: 'GG998', staffCode: 'TS-9998', name: 'Advance Test', role: 'Staff', branch: 'TestBranch' },
      structure: { gross: 60000, totalDeductions: 0 },
      shift: null,
      attendance: [{ status: 'Absent' }, { status: 'Absent' }, { status: 'Absent' }, { status: 'Absent' }],
      adjustments: [],
      advance: { status: 'Active', perInstallment: 10000, balance: 10000 },
      period: '2026-11',
      autoReconcile: false,
      unpaidLeaveDays: 0
    });
    check(capped.totalEarnings === 52000, 'earnings after 4 absent days = 52000');
    check(capped.advanceRecovery === 10000, 'advance recovery is capped by the scheduled installment');
    check(capped.netPayout === 42000, 'net payout subtracts the advance recovery');

    // ================================================================
    // 2. EMPLOYEES
    // ================================================================
    console.log('\nTest 2: Employees CRUD, derived fields and cross-module sync');
    const listRes = await request('GET', '/api/staff');
    check(listRes.status === 200 && listRes.body.success === true, 'GET /api/staff returns 200');
    check(Array.isArray(listRes.body.data), 'GET /api/staff returns an array');
    check(listRes.body.kpis && typeof listRes.body.kpis.totalStaff === 'number', 'GET /api/staff returns KPI payload');

    const noFirstName = await request('POST', '/api/staff', { branch: 'TestBranch', joiningDate: '2026-01-01' });
    check(noFirstName.status === 400, 'POST /api/staff rejects a missing first name');
    const noBranch = await request('POST', '/api/staff', { firstName: 'No', joiningDate: '2026-01-01' });
    check(noBranch.status === 400, 'POST /api/staff rejects a missing branch');
    const noJoining = await request('POST', '/api/staff', { firstName: 'No', branch: 'TestBranch' });
    check(noJoining.status === 400, 'POST /api/staff rejects a missing joining date');

    const created = await request('POST', '/api/staff', {
      firstName: 'Test', middleName: 'Kumar', lastName: 'Hr',
      branch: 'TestBranch', joiningDate: '2026-01-01',
      role: 'Staff', department: 'Operations',
      basic: 30000, hra: 15000, transportAllowance: 1600, otherDeductions: 1000,
      biometricId: TEST_BIO,
      createLogin: true, username: `hr.${stamp}`, password: 'secret123'
    });
    check(created.status === 201, 'POST /api/staff creates an employee');
    const staffId = created.body.data._id;
    check(created.body.data.name === 'Test Kumar Hr', 'derived name joins first, middle and last name');
    check(created.body.data.staffCode.length > 0, 'staff code is auto-generated');
    check(created.body.data.employeeCode.length > 0, 'employee code is auto-generated');
    check(created.body.data.salary === 46600, 'gross salary is the sum of every earning component');
    check(created.body.data.netSalary === 45600, 'net salary is gross minus other deductions');
    check(!('password' in created.body.data), 'the password field is never returned');

    const shortPassword = await request('POST', '/api/staff', {
      firstName: 'Short', branch: 'TestBranch', joiningDate: '2026-01-01',
      createLogin: true, username: `short.${stamp}`, password: 'abc'
    });
    check(shortPassword.status === 400, 'POST /api/staff rejects a password shorter than 6 characters');

    const dupBio = await request('POST', '/api/staff', {
      firstName: 'Dup', branch: 'TestBranch', joiningDate: '2026-01-01', biometricId: TEST_BIO
    });
    check(dupBio.status === 400, 'POST /api/staff rejects a duplicate biometric id');

    const struct = await SalaryStructure.findOne({ staffRef: staffId });
    check(!!struct, 'creating an employee auto-creates a matching salary structure');
    check(struct && struct.gross === 46600, 'the auto-created salary structure carries the correct gross');
    check(struct && struct.netSalary === 45600, 'the auto-created salary structure carries the correct net salary');

    const user = await User.findOne({ staffRef: staffId });
    check(!!user, 'creating an employee with createLogin provisions a portal account');
    check(user && (user.password.startsWith('$2') || user.password.startsWith('scrypt$')), 'the portal password is hashed, not stored in clear text');
    check(user && user.staffRef && user.accessLevel === 'Staff', 'the portal account stores staffRef and the mapped access level');

    const updated = await request('PUT', `/api/staff/${staffId}`, { basic: 40000, role: 'Senior Staff' });
    check(updated.status === 200, 'PUT /api/staff/:id updates an employee');
    check(updated.body.data.salary === 56600, 'updating a component recomputes the gross salary');
    check(updated.body.data.netSalary === 55600, 'updating a component recomputes the net salary');
    const structAfter = await SalaryStructure.findOne({ staffRef: staffId });
    check(structAfter && structAfter.gross === 56600, 'the salary structure stays in sync with the employee');

    const branches = await request('GET', '/api/staff/branches');
    check(branches.status === 200 && branches.body.data.includes('TestBranch'), 'GET /api/staff/branches lists distinct branches');

    // ================================================================
    // 3. BIOMETRIC ATTENDANCE
    // ================================================================
    console.log('\nTest 3: Biometric attendance, punch engine and manual logs');
    const attList = await request('GET', '/api/hr/staff-attendance');
    check(attList.status === 200 && attList.body.kpis !== undefined, 'GET /api/hr/staff-attendance returns list plus KPIs');

    const manual = await request('POST', '/api/hr/staff-attendance', {
      staffRef: staffId, date: '2026-11-02', status: 'Present', checkIn: '09:00', checkOut: '18:00'
    });
    check(manual.status === 201, 'POST /api/hr/staff-attendance creates a manual record');
    check(manual.body.data.workingHours === '9h 0m', 'a manual record computes working hours');

    const dupAtt = await request('POST', '/api/hr/staff-attendance', {
      staffRef: staffId, date: '2026-11-02', status: 'Present'
    });
    check(dupAtt.status === 409, 'POST attendance rejects a duplicate date for the same employee');

    const unknownBio = await request('POST', '/api/hr/staff-attendance/punch', {
      biometricId: 'NOT-ENROLLED', timestamp: '2026-11-03T09:00:00.000Z'
    });
    check(unknownBio.status === 404, 'POST punch rejects an unenrolled biometric id');

    const punch1 = await request('POST', '/api/hr/staff-attendance/punch', {
      biometricId: TEST_BIO, deviceId: 'DEV-TEST', timestamp: '2026-11-03T09:30:00.000Z'
    });
    check(punch1.status === 201, 'the first punch of a day creates the attendance record');
    check(punch1.body.data.status === 'Late', 'a punch after the shift cutoff is recorded as Late');
    check(punch1.body.data.lateMinutes === 15, 'late minutes are measured against the shift cutoff');

    const punch2 = await request('POST', '/api/hr/staff-attendance/punch', {
      biometricId: TEST_BIO, deviceId: 'DEV-TEST', timestamp: '2026-11-03T18:30:00.000Z'
    });
    check(punch2.status === 200, 'the second punch of a day updates the same record');
    check(punch2.body.data.checkOut === '18:30', 'the second punch is stored as the checkout');
    check(punch2.body.data.workingHours === '9h 0m', 'checkout computes the working hours');

    const attUpdate = await request('PUT', `/api/hr/staff-attendance/${punch2.body.data._id}`, { status: 'Absent' });
    check(attUpdate.status === 200, 'PUT attendance updates a record');
    check(attUpdate.body.data.workingHours === '', 'an absent record clears the working hours');
    check(attUpdate.body.data.checkIn === '—', 'an absent record blanks the check-in');

    // ================================================================
    // 4. LEAVE REQUESTS
    // ================================================================
    console.log('\nTest 4: Leave requests, quota maths and attendance synchronisation');
    const unpaidType = await request('POST', '/api/hr/leave-types', {
      name: 'HR Test Unpaid', code: `HRU${String(stamp).slice(-4)}`, monthlyQuota: 0, annualQuota: 0, paid: false, status: 'Active'
    });
    check(unpaidType.status === 201, 'POST /api/hr/leave-types creates a leave type');
    const unpaidId = unpaidType.body.data._id;

    const paidType = await request('POST', '/api/hr/leave-types', {
      name: 'HR Test Paid', code: `HRP${String(stamp).slice(-4)}`, monthlyQuota: 1, annualQuota: 2, paid: true, status: 'Active'
    });
    const paidId = paidType.body.data._id;

    const leaveNoStaff = await request('POST', '/api/hr/leave', { leaveType: paidId, fromDate: '2026-11-04', toDate: '2026-11-05' });
    check(leaveNoStaff.status === 400, 'POST leave rejects a missing staff member');

    const leaveFull = await request('POST', '/api/hr/leave', {
      staffRef: staffId, leaveType: paidId, fromDate: '2026-11-04', toDate: '2026-11-06', reason: 'Test'
    });
    check(leaveFull.status === 201, 'POST /api/hr/leave creates a leave request');
    check(leaveFull.body.data.days === 3, 'leave days are counted inclusively');
    check(leaveFull.body.data.paidDays === 2, 'paid leave is capped by the annual quota');
    check(leaveFull.body.data.lopDays === 1, 'the quota overflow becomes loss-of-pay');
    const leaveId = leaveFull.body.data._id;

    const overlap = await request('POST', '/api/hr/leave', {
      staffRef: staffId, leaveType: paidId, fromDate: '2026-11-05', toDate: '2026-11-07', reason: 'Overlap'
    });
    check(overlap.status === 409, 'POST leave rejects an overlapping request');

    const balance = await request('GET', `/api/hr/leave/balance/${staffId}`);
    check(balance.status === 200 && Array.isArray(balance.body.data), 'GET leave balance returns per-type balances');
    const paidBalance = balance.body.data.find((b) => b.leaveType.toString() === paidId.toString());
    check(paidBalance && paidBalance.used === 2, 'the leave balance reflects the days already consumed');

    const approved = await request('POST', `/api/hr/leave/${leaveId}/approve`, { operator: 'Test Admin' });
    check(approved.status === 200 && approved.body.data.status === 'Approved', 'POST leave approve approves the request');
    const synthetic = await StaffAttendance.find({ staffRef: staffId, isSynthetic: true });
    check(synthetic.length === 3, 'approving a leave injects one On Leave attendance row per day');

    const rejectApprovedOne = await request('POST', `/api/hr/leave/${leaveId}/reject`, { reason: 'Too late' });
    check(rejectApprovedOne.status === 409, 'an already-approved request cannot be rejected');

    const unpaidLeave = await request('POST', '/api/hr/leave', {
      staffRef: staffId, leaveType: unpaidId, fromDate: '2026-11-10', toDate: '2026-11-11', reason: 'Unpaid'
    });
    check(unpaidLeave.body.data.paidDays === 0, 'an unpaid leave type grants zero paid days');
    check(unpaidLeave.body.data.lopDays === 2, 'an unpaid leave type makes every day loss-of-pay');

    const unpaidApproved = await request('POST', `/api/hr/leave/${unpaidLeave.body.data._id}/approve`, {});
    check(unpaidApproved.status === 200, 'an unpaid leave can be approved');
    const rejectApproved = await request('POST', `/api/hr/leave/${unpaidLeave.body.data._id}/reject`, { reason: 'Too late' });
    check(rejectApproved.status === 409, 'an already-approved request cannot be rejected');

    // A dedicated pending request exercises the reject path.
    const pendingLeave = await request('POST', '/api/hr/leave', {
      staffRef: staffId, leaveType: paidId, fromDate: '2026-11-16', toDate: '2026-11-17', reason: 'Pending test'
    });
    check(pendingLeave.status === 201, 'a second leave request can be raised');
    const rejected = await request('POST', `/api/hr/leave/${pendingLeave.body.data._id}/reject`, { reason: 'Cancelled' });
    check(rejected.status === 200, 'a pending leave can be rejected');
    const afterReject = await StaffAttendance.countDocuments({
      staffRef: staffId, isSynthetic: true, date: { $gte: '2026-11-16', $lte: '2026-11-17' }
    });
    check(afterReject === 0, 'rejecting a leave releases the synthetic attendance rows');

    const deletedLeave = await request('DELETE', `/api/hr/leave/${leaveId}`);
    check(deletedLeave.status === 200, 'DELETE /api/hr/leave/:id removes the request');
    const afterDelete = await StaffAttendance.countDocuments({
      staffRef: staffId, isSynthetic: true, date: { $gte: '2026-11-04', $lte: '2026-11-06' }
    });
    check(afterDelete === 0, 'deleting a leave releases the synthetic attendance rows');

    // ================================================================
    // 5. MASTER CONFIGURATION MODULES
    // ================================================================
    console.log('\nTest 5: Leave types, shifts, salary structures, advances and adjustments');
    const ltList = await request('GET', '/api/hr/leave-types');
    check(ltList.status === 200 && ltList.body.kpis.paid !== undefined, 'GET leave types returns KPIs');
    const ltUpdate = await request('PUT', `/api/hr/leave-types/${unpaidId}`, { annualQuota: 3 });
    check(ltUpdate.status === 200 && ltUpdate.body.data.annualQuota === 3, 'PUT leave types updates a record');
    const ltDelete = await request('DELETE', `/api/hr/leave-types/${unpaidId}`);
    check(ltDelete.status === 200, 'DELETE leave types removes a record');

    const shiftCreate = await request('POST', '/api/hr/shifts', {
      name: `HR Test Shift ${stamp}`, startTime: '08:00', endTime: '16:00',
      lateAfter: '08:15', lateDeductionPerMin: 5, shiftAllowance: 1500, status: 'Active'
    });
    check(shiftCreate.status === 201, 'POST /api/hr/shifts creates a shift');
    const shiftId = shiftCreate.body.data._id;
    const shiftList = await request('GET', '/api/hr/shifts');
    check(shiftList.body.kpis.withAllowance >= 1, 'GET shifts counts shifts carrying an allowance');
    check((await request('DELETE', `/api/hr/shifts/${shiftId}`)).status === 200, 'DELETE /api/hr/shifts removes a shift');

    const structCreate = await request('POST', '/api/salary-structures', {
      staffRef: staffId, staffId: created.body.data.staffCode, staffName: created.body.data.name,
      branch: 'TestBranch', effectiveFrom: '2026-01-01',
      basic: 30000, hra: 15000, otherEarnings: 1000, pf: 1800, esi: 500, tds: 1200, otherDeductions: 300
    });
    check(structCreate.status === 201, 'POST /api/salary-structures creates a structure');
    check(structCreate.body.data.gross === 46000, 'the salary structure computes the gross');
    check(structCreate.body.data.totalDeductions === 3800, 'the salary structure computes total deductions');
    check(structCreate.body.data.netSalary === 42200, 'the salary structure computes the net salary');
    const structId = structCreate.body.data._id;
    check((await request('DELETE', `/api/salary-structures/${structId}`)).status === 200, 'DELETE /api/salary-structures removes a structure');

    const advCreate = await request('POST', '/api/hr/advances', {
      staffRef: staffId, amount: 10000, installments: 3, issuedDate: '2026-11-01', reason: 'Test'
    });
    check(advCreate.status === 201, 'POST /api/hr/advances creates an advance');
    check(advCreate.body.data.perInstallment === 3334, 'the installment is ceil(amount / installments)');
    check(advCreate.body.data.balance === 10000, 'the advance balance starts at the full amount');
    const advId = advCreate.body.data._id;
    const advList = await request('GET', '/api/hr/advances');
    check(advList.body.kpis.outstanding === 10000, 'GET advances totals the outstanding balance');

    const adjCreate = await request('POST', '/api/hr/adjustments', {
      staffRef: staffId, period: '2026-11', type: 'credit', label: 'Bonus', amount: 5000
    });
    check(adjCreate.status === 201, 'POST /api/hr/adjustments creates an adjustment');
    const adjId = adjCreate.body.data._id;
    const adjList = await request('GET', `/api/hr/adjustments?staffRef=${staffId}`);
    check(adjList.body.kpis.credits === 5000, 'GET adjustments totals credits for the requested employee');

    // ================================================================
    // 6. PAYROLL ENGINE END TO END
    // ================================================================
    console.log('\nTest 6: Payroll run, advance recovery, finalisation and reversal');
    const runRes = await request('POST', '/api/hr/payroll/run', { period: '2026-11', branch: 'TestBranch', autoReconcile: true });
    check(runRes.status === 201, 'POST /api/hr/payroll/run processes a payroll run');
    const run = runRes.body.data;
    check(run.employeeCount >= 1, 'the payroll run covers at least one employee');
    check(run.payslips.length === run.employeeCount, 'every covered employee receives a payslip');

    const myPayslip = run.payslips.find((p) => p.staffId === created.body.data.staffCode);
    check(!!myPayslip, 'the test employee appears on the payslip register');
    check(myPayslip && myPayslip.credits === 5000, 'payroll adjustments flow into the payslip credits');
    check(myPayslip && myPayslip.advanceRecovery > 0, 'the active advance is recovered from the payslip');
    check(myPayslip && myPayslip.netPayout === round2(myPayslip.totalEarnings - myPayslip.totalDeductions),
      'net payout equals total earnings minus total deductions');
    check(myPayslip && myPayslip.attendance.onLeave === 2,
      'the payslip attendance roll-up counts the approved unpaid leave days');
    check(myPayslip && myPayslip.attendance.absent >= 1,
      'the payslip attendance roll-up counts absent days');
    check((await request('DELETE', `/api/hr/adjustments/${adjId}`)).status === 200,
      'DELETE /api/hr/adjustments removes an adjustment');

    const dupRun = await request('POST', '/api/hr/payroll/run', { period: '2026-11', branch: 'TestBranch' });
    check(dupRun.status === 409, 'a payroll run cannot be duplicated for the same period and branch');

    const advanceAfterRun = await SalaryAdvance.findById(advId);
    check(advanceAfterRun.recovered > 0, 'the advance recovered amount is persisted on the advance');
    check(advanceAfterRun.balance === round2(10000 - advanceAfterRun.recovered), 'the advance balance tracks the recovery');

    const finalized = await request('POST', `/api/hr/payroll/${run._id}/finalize`, {});
    check(finalized.status === 200 && finalized.body.data.status === 'Finalized', 'POST finalize moves the run to Finalized');
    const paid = await request('POST', `/api/hr/payroll/${run._id}/pay`, {});
    check(paid.status === 200 && paid.body.data.status === 'Paid', 'POST pay moves the run to Paid');
    const payTwice = await request('POST', `/api/hr/payroll/${run._id}/pay`, {});
    check(payTwice.status === 409, 'an already-paid run cannot be paid twice');

    const runGet = await request('GET', `/api/hr/payroll/${run._id}`);
    check(runGet.status === 200 && runGet.body.data.payslips.length > 0, 'GET /api/hr/payroll/:id returns the run with its payslips');

    const deletedRun = await request('DELETE', `/api/hr/payroll/${run._id}`);
    check(deletedRun.status === 200, 'DELETE /api/hr/payroll/:id removes the run');
    const advanceAfterDelete = await SalaryAdvance.findById(advId);
    check(advanceAfterDelete.recovered === 0, 'deleting a payroll run reverses the advance recovery');
    check(advanceAfterDelete.balance === 10000, 'deleting a payroll run restores the advance balance');
    check(advanceAfterDelete.status === 'Active', 'deleting a payroll run reopens the advance');

    // ================================================================
    // 7. CASCADE INTEGRITY
    // ================================================================
    console.log('\nTest 7: Cascade integrity and cleanup');
    const blocked = await request('DELETE', `/api/staff/${staffId}`);
    check(blocked.status === 409, 'deleting an employee with an open advance is blocked');

    await SalaryAdvance.deleteMany({ staffRef: staffId });
    const removable = await request('DELETE', `/api/staff/${staffId}`);
    check(removable.status === 200, 'deleting an employee with no open advance succeeds');
    check((await SalaryStructure.countDocuments({ staffRef: staffId })) === 0, 'deleting an employee cascades to the salary structure');
    check((await User.countDocuments({ staffRef: staffId })) === 0, 'deleting an employee cascades to the portal account');

    await LeaveType.deleteMany({ name: /^HR Test/ });
    await PayrollRun.deleteMany({ branch: 'TestBranch' });
    await Staff.deleteMany({ branch: 'TestBranch' });
    await StaffAttendance.deleteMany({ branch: 'TestBranch' });
    await SalaryStructure.deleteMany({ branch: 'TestBranch' });
    await PayrollAdjustment.deleteMany({ branch: 'TestBranch' });
    await User.deleteMany({ username: new RegExp(`^hr\\.${stamp}`) });
    console.log('  · test fixtures cleaned up');

    console.log('\n--- ALL HR & PAYROLL INTEGRATION TESTS PASSED ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  }

  console.log(`\nHR & PAYROLL TEST RESULT: ${passed} passed, ${failed} failed`);
  server.close();
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
