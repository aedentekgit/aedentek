/**
 * HR & PAYROLL ENGINE
 * ------------------------------------------------------------------
 * Pure, side-effect-free calculation helpers shared by the HR controllers.
 * Every figure the payroll engine produces is computed here so the client
 * never has to duplicate the maths.
 *
 * Formulas implemented (per the HR & Payroll specification):
 *
 *   Days in month            M
 *   Shift base               B   = gross + shiftAllowance
 *   Daily wage rate          R   = B / M
 *   Loss of pay days         D_lop = absentDays + unpaidLeaveDays + (0.5 * halfDays)
 *   LOP financial deduction  A_lop = round2(B * D_lop / M)
 *   Earned gross             EarnedGross = B - A_lop
 *   Total earnings           TotalEarnings = EarnedGross + credits
 *   Prior deductions         PriorDeductions = fixed + adjustmentDeductions + lateFines
 *   Available margin         AvailableMargin = max(0, TotalEarnings - PriorDeductions)
 *   Advance recovery         Adv = min(scheduledInstallment, AvailableMargin)
 *   Net take-home            NetPay = max(0, TotalEarnings - (PriorDeductions + Adv))
 */

// ---------------------------------------------------------------------
// Date / time helpers
// ---------------------------------------------------------------------

/** Minutes since midnight for an "HH:MM" string. Returns null when unparseable. */
export const timeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** "150" -> "02:30" */
export const minutesToTime = (total) => {
  const safe = Math.max(0, Math.round(total || 0));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Inclusive day count between two YYYY-MM-DD strings. Returns 0 for an inverted range. */
export const inclusiveDays = (fromDate, toDate) => {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const span = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  return span > 0 ? span : 0;
};

/** Number of calendar days in a YYYY-MM period. */
export const daysInMonth = (period) => {
  const [y, m] = String(period || '').split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Every YYYY-MM-DD date in a period. */
export const datesInPeriod = (period) => {
  const [y, m] = String(period || '').split('-').map(Number);
  if (!y || !m) return [];
  const total = daysInMonth(period);
  const out = [];
  for (let d = 1; d <= total; d += 1) {
    out.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
};

/** YYYY-MM-DD for a Date object (UTC). */
export const toDateKey = (date) => date.toISOString().slice(0, 10);

/** YYYY-MM for a Date object (UTC). */
export const toPeriodKey = (date) => date.toISOString().slice(0, 7);

/** Round to 2 decimals, avoiding binary float drift. */
export const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// ---------------------------------------------------------------------
// Biometric punch engine
// ---------------------------------------------------------------------

/**
 * Resolve a raw biometric punch into an attendance state.
 *
 * @param {object} p
 * @param {object|null} p.shift     The staff member's assigned Shift document.
 * @param {string|null} p.checkIn   Existing check-in time for this staff/date, if any.
 * @param {string} p.time           Punch time as "HH:MM".
 * @returns {{status:string, lateMinutes:number, lateFine:number, lateAfter:string}}
 */
export const resolvePunch = ({ shift, checkIn, time }) => {
  const cutoff = timeToMinutes(shift?.lateAfter) ?? timeToMinutes('09:15');
  const punch = timeToMinutes(time);

  // A second punch on the same day is a checkout, not a new arrival.
  if (checkIn) {
    return { status: 'Present', lateMinutes: 0, lateFine: 0, lateAfter: shift?.lateAfter || '09:15' };
  }

  if (punch === null) {
    return { status: 'Present', lateMinutes: 0, lateFine: 0, lateAfter: shift?.lateAfter || '09:15' };
  }

  if (punch <= cutoff) {
    return { status: 'Present', lateMinutes: 0, lateFine: 0, lateAfter: shift?.lateAfter || '09:15' };
  }

  const lateMinutes = punch - cutoff;
  const perMin = Number(shift?.lateDeductionPerMin || 0);
  const flat = Number(shift?.lateDeduction || 0);
  const lateFine = perMin > 0 ? lateMinutes * perMin : flat;

  return {
    status: 'Late',
    lateMinutes,
    lateFine: round2(lateFine),
    lateAfter: shift?.lateAfter || '09:15'
  };
};

/** Working duration between two "HH:MM" strings, formatted "Xh Ym". */
export const workingHoursBetween = (checkIn, checkOut) => {
  const a = timeToMinutes(checkIn);
  const b = timeToMinutes(checkOut);
  if (a === null || b === null || b <= a) return '';
  const diff = b - a;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
};

// ---------------------------------------------------------------------
// Leave engine
// ---------------------------------------------------------------------

/**
 * Split a leave request into paid days and loss-of-pay days.
 *
 * When the leave type is unpaid every day is LOP. When it is paid, the
 * employee gets up to the remaining annual quota and the overflow is LOP.
 *
 * @param {object} p
 * @param {number} p.days
 * @param {boolean} p.paid            Leave type classification.
 * @param {number} p.availableBalance Remaining paid quota for the leave type.
 * @returns {{paidDays:number, lopDays:number}}
 */
export const computeLeaveImpact = ({ days, paid, availableBalance }) => {
  const total = Math.max(0, Number(days) || 0);
  if (!paid) return { paidDays: 0, lopDays: total };
  const available = Math.max(0, Number(availableBalance) || 0);
  const paidDays = Math.min(total, available);
  return { paidDays, lopDays: Math.max(0, total - paidDays) };
};

/**
 * Remaining paid quota for a leave type, given the employee's approved/pending usage.
 * Quota is the leave type's annual quota (or the monthly quota scaled across the year
 * when no annual quota is configured).
 */
export const computeAvailableBalance = ({ leaveType, usedDays }) => {
  const annual = Number(leaveType?.annualQuota || 0);
  const monthly = Number(leaveType?.monthlyQuota || 0);
  const entitlement = annual > 0 ? annual : monthly * 12;
  return Math.max(0, round2(entitlement - (Number(usedDays) || 0)));
};

// ---------------------------------------------------------------------
// Payroll engine
// ---------------------------------------------------------------------

/**
 * Compute one employee's payslip for a period.
 *
 * @param {object} p
 * @param {object} p.staff
 * @param {object|null} p.structure   Active SalaryStructure for the employee.
 * @param {object|null} p.shift        Assigned Shift.
 * @param {Array}  p.attendance       StaffAttendance rows for this employee in the period.
 * @param {Array}  p.adjustments      PayrollAdjustment rows for this employee in the period.
 * @param {object|null} p.advance      Active SalaryAdvance for this employee.
 * @param {string} p.period           YYYY-MM
 * @param {boolean} p.autoReconcile   Treat unpunched working days as LOP.
 * @param {number} p.unpaidLeaveDays LOP days contributed by approved unpaid/overflow leave.
 * @returns {object} payslip payload
 */
export const computePayslip = ({
  staff,
  structure,
  shift,
  attendance = [],
  adjustments = [],
  advance = null,
  period,
  autoReconcile = true,
  unpaidLeaveDays = 0
}) => {
  const M = daysInMonth(period);
  const gross = Number(structure?.gross || staff?.salary || 0);
  const shiftAllowance = Number(shift?.shiftAllowance || 0);

  // --- attendance roll-up -------------------------------------------------
  const rows = attendance.filter((a) => !a.isSynthetic || a.status === 'On Leave');
  const count = (s) => rows.filter((a) => a.status === s).length;

  const present = count('Present');
  const late = count('Late');
  const halfDay = count('Half Day');
  const onLeave = count('On Leave');
  const explicitAbsent = count('Absent');

  // Working days in the month = calendar days minus standard weekly offs (Sundays).
  const periodDates = datesInPeriod(period);
  const weeklyOffs = periodDates.filter((d) => new Date(`${d}T00:00:00.000Z`).getUTCDay() === 0).length;
  const workingDays = Math.max(0, M - weeklyOffs);

  const punchedDays = present + late + halfDay;
  const unpunched = autoReconcile ? Math.max(0, workingDays - punchedDays - onLeave) : 0;
  const absentDays = explicitAbsent + unpunched;

  const lateFines = round2(rows.reduce((sum, a) => sum + (Number(a.lateFine) || 0), 0));

  // --- loss of pay --------------------------------------------------------
  // Unpaid leave days come from approved leave requests where the type is unpaid,
  // plus the overflow portion of paid leaves that exceeded the quota.
  const D_lop = absentDays + (Number(unpaidLeaveDays) || 0) + (0.5 * halfDay);

  // --- earnings -----------------------------------------------------------
  const B = gross + shiftAllowance;
  const A_lop = round2((B * D_lop) / M);
  const earnedGross = round2(B - A_lop);

  const credits = round2(
    adjustments.filter((a) => a.type === 'credit').reduce((s, a) => s + (Number(a.amount) || 0), 0)
  );
  const adHocDeductions = round2(
    adjustments.filter((a) => a.type === 'deduction').reduce((s, a) => s + (Number(a.amount) || 0), 0)
  );

  const totalEarnings = round2(earnedGross + credits);

  // --- deductions ---------------------------------------------------------
  const fixedDeductions = round2(Number(structure?.totalDeductions || 0));
  const priorDeductions = round2(fixedDeductions + adHocDeductions + lateFines);
  const availableMargin = Math.max(0, round2(totalEarnings - priorDeductions));

  const scheduled = advance && advance.status === 'Active' ? Number(advance.perInstallment || 0) : 0;
  const advanceRecovery = round2(Math.min(scheduled, availableMargin, Number(advance?.balance || 0)));

  const totalDeductions = round2(priorDeductions + advanceRecovery);
  const netPayout = Math.max(0, round2(totalEarnings - totalDeductions));

  return {
    payslipNo: `PS-${period}-${staff?.employeeCode || staff?.staffCode || 'NA'}`,
    staffRef: staff?._id || null,
    staffId: staff?.staffCode || staff?.employeeCode || '',
    staffName: staff?.name || '',
    designation: staff?.role || '',
    branch: staff?.branch || '',
    period,

    grossPay: gross,
    shiftDifferential: shiftAllowance,
    lopDays: round2(D_lop),
    lopDeduction: A_lop,
    credits,
    advanceRecovery,
    fixedDeductions,
    adHocDeductions,
    lateFines,
    totalEarnings,
    totalDeductions,
    netPayout,

    attendance: { present, late, absent: absentDays, halfDay, onLeave },
    bank: {
      bankName: staff?.bankName || '',
      accountNumber: staff?.accountNumber || '',
      ifscCode: staff?.ifscCode || staff?.iban || ''
    },
    // internal, stripped before persistence
    _advanceRecovery: advanceRecovery
  };
};

/**
 * Strip internal-only fields before persisting a payslip snapshot.
 */
export const serialisePayslip = (payslip) => {
  const { _advanceRecovery, ...rest } = payslip;
  return rest;
};

/**
 * Recompute the aggregate totals for a payroll run from its payslips.
 */
export const summariseRun = (payslips) => {
  const list = payslips || [];
  return {
    employeeCount: list.length,
    totalGross: round2(list.reduce((s, p) => s + (Number(p.grossPay) || 0), 0)),
    totalDeductions: round2(list.reduce((s, p) => s + (Number(p.totalDeductions) || 0), 0)),
    totalNet: round2(list.reduce((s, p) => s + (Number(p.netPayout) || 0), 0))
  };
};
