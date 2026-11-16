import PayrollRun from '../models/PayrollRun.js';
import Staff from '../models/Staff.js';
import Shift from '../models/Shift.js';
import SalaryStructure from '../models/SalaryStructure.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import PayrollAdjustment from '../models/PayrollAdjustment.js';
import StaffAttendance from '../models/StaffAttendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import {
  replaceJournalForSource,
  removeJournalForSource
} from '../utils/accountsEngine.js';
import {
  computePayslip,
  serialisePayslip,
  summariseRun,
  round2,
  datesInPeriod,
  toPeriodKey
} from '../utils/hrEngine.js';

/** Sync Payroll run with the General Ledger in Accounts */
export const syncPayrollJournal = async (run) => {
  try {
    if (!run || run.status === 'Draft') {
      await removeJournalForSource('Payroll', run?._id?.toString() || '');
      return;
    }

    const gross = round2(run.totalGross || 0);
    const net = round2(run.totalNet || 0);
    const deductions = round2(gross - net);

    const lines = [
      { accountCode: '5100', debit: gross, credit: 0 }
    ];

    if (run.status === 'Paid') {
      lines.push({ accountCode: '1020', debit: 0, credit: net });
    } else {
      lines.push({ accountCode: '2100', debit: 0, credit: net });
    }

    if (deductions > 0) {
      lines.push({ accountCode: '2200', debit: 0, credit: deductions });
    } else if (deductions < 0) {
      // If net exceeds gross due to positive adjustments/bonuses, debit additional expense
      lines.push({ accountCode: '5100', debit: Math.abs(deductions), credit: 0 });
    }

    const payload = {
      date: (run.paidAt || run.finalizedAt || run.processedAt || new Date().toISOString()).slice(0, 10),
      description: `Payroll ${run.status.toLowerCase()} for period ${run.period} — ${run.branch}`,
      sourceModule: 'Payroll',
      sourceId: run._id.toString(),
      reference: `PAY-${run.period}`,
      branch: run.branch || 'All Branches',
      lines
    };

    await replaceJournalForSource('Payroll', run._id.toString(), payload);
  } catch (err) {
    console.error('Failed to sync payroll to GL:', err.message);
  }
};

/** The period a date string falls into, e.g. "2026-11-04" -> "2026-11". */
const periodOf = (date) => String(date || '').slice(0, 7);

// ---------------------------------------------------------------------------
// GET /api/hr/payroll
// ---------------------------------------------------------------------------
export const getAllPayrollRuns = async (req, res, next) => {
  try {
    const { period, branch, status } = req.query;
    const query = {};
    if (period) query.period = period;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (status && status !== 'All') query.status = status;

    const runs = await PayrollRun.find(query).sort({ createdAt: -1 });

    // Count leave requests still awaiting a decision inside the requested period.
    let pendingLeaves = 0;
    const periodDates = period ? datesInPeriod(period) : [];
    if (periodDates.length) {
      pendingLeaves = await LeaveRequest.countDocuments({
        status: 'Pending',
        fromDate: { $lte: periodDates[periodDates.length - 1] },
        toDate: { $gte: periodDates[0] }
      });
    }

    const count = (s) => runs.filter((r) => r.status === s).length;

    return res.status(200).json({
      success: true,
      message: 'Payroll runs retrieved successfully',
      data: runs,
      kpis: {
        totalRuns: runs.length,
        draft: count('Draft'),
        finalized: count('Finalized'),
        paid: count('Paid'),
        pendingLeaves
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/hr/payroll/:id
// ---------------------------------------------------------------------------
export const getPayrollRunById = async (req, res, next) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Payroll run retrieved successfully',
      data: run
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/payroll/run
// ---------------------------------------------------------------------------
export const runPayroll = async (req, res, next) => {
  try {
    const body = req.body || {};
    const period = body.period || toPeriodKey(new Date());
    const branch = body.branch || 'All Branches';
    const autoReconcile = body.autoReconcile !== false;

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ success: false, message: 'period must be formatted as YYYY-MM' });
    }

    const existing = await PayrollRun.findOne({ period, branch });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A payroll run for ${period} / ${branch} already exists`
      });
    }

    const staffQuery = { status: 'Active' };
    if (branch !== 'All Branches') staffQuery.branch = branch;
    const staffList = await Staff.find(staffQuery).sort({ name: 1 });

    if (!staffList.length) {
      return res.status(400).json({
        success: false,
        message: `No active staff found for ${branch}`
      });
    }

    const periodDates = datesInPeriod(period);
    const periodStart = periodDates[0];
    const periodEnd = periodDates[periodDates.length - 1];

    const payslips = [];
    const advanceRecoveries = [];

    for (const member of staffList) {
      const [structure, attendance, adjustments, advance, leaves] = await Promise.all([
        SalaryStructure.findOne({ staffRef: member._id, status: 'Active' }).sort({ effectiveFrom: -1 }),
        StaffAttendance.find({ staffRef: member._id, date: { $gte: periodStart, $lte: periodEnd } }),
        PayrollAdjustment.find({ staffRef: member._id, period }),
        SalaryAdvance.findOne({ staffRef: member._id, status: 'Active' }),
        LeaveRequest.find({ staffRef: member._id, status: 'Approved' })
      ]);

      const shift = member.shift ? await Shift.findById(member.shift) : null;

      // Approved leave contributes its loss-of-pay days (unpaid types plus the
      // paid-type overflow) to the LOP calculation for the period.
      const unpaidLeaveDays = leaves
        .filter((l) => l.fromDate.slice(0, 7) === period || l.toDate.slice(0, 7) === period)
        .reduce((sum, l) => sum + (Number(l.lopDays) || 0), 0);

      const payslip = computePayslip({
        staff: member,
        structure,
        shift,
        attendance,
        adjustments,
        advance,
        period,
        autoReconcile,
        unpaidLeaveDays
      });

      payslips.push(serialisePayslip(payslip));

      if (advance && payslip.advanceRecovery > 0) {
        advanceRecoveries.push({ advanceId: advance._id, amount: payslip.advanceRecovery });
      }
    }

    // Persist the advance recovery so balances and status stay truthful.
    for (const recovery of advanceRecoveries) {
      const advance = await SalaryAdvance.findById(recovery.advanceId);
      if (!advance) continue;
      advance.recovered = round2((Number(advance.recovered) || 0) + recovery.amount);
      advance.balance = Math.max(0, round2((Number(advance.amount) || 0) - advance.recovered));
      if (advance.balance <= 0) advance.status = 'Closed';
      await advance.save();
    }

    const totals = summariseRun(payslips);
    const run = await PayrollRun.create({
      period,
      branch,
      status: 'Draft',
      autoReconcile,
      ...totals,
      processedAt: new Date().toISOString(),
      payslips
    });

    return res.status(201).json({
      success: true,
      message: `Payroll processed for ${period}: ${totals.employeeCount} employee(s), net payout ₹${totals.totalNet.toLocaleString('en-IN')}`,
      data: run
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/payroll/:id/finalize
// ---------------------------------------------------------------------------
export const finalizePayrollRun = async (req, res, next) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }
    if (run.status !== 'Draft') {
      return res.status(409).json({
        success: false,
        message: `Only draft runs can be finalized (this one is ${run.status.toLowerCase()})`
      });
    }
    run.status = 'Finalized';
    run.finalizedAt = new Date().toISOString();
    await run.save();
    await syncPayrollJournal(run);
    return res.status(200).json({
      success: true,
      message: `Payroll run for ${run.period} finalized`,
      data: run
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/payroll/:id/pay
// ---------------------------------------------------------------------------
export const markPayrollRunPaid = async (req, res, next) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }
    if (run.status === 'Paid') {
      return res.status(409).json({ success: false, message: 'This payroll run is already marked as paid' });
    }
    run.status = 'Paid';
    run.paidAt = new Date().toISOString();
    await run.save();
    await syncPayrollJournal(run);
    return res.status(200).json({
      success: true,
      message: `Payroll run for ${run.period} marked as paid`,
      data: run
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/hr/payroll/:id
// ---------------------------------------------------------------------------
export const deletePayrollRun = async (req, res, next) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    // Reversal — undo the advance recoveries this run applied so balances are
    // never double-counted when a run is deleted or re-executed.
    let reversed = 0;
    for (const payslip of run.payslips || []) {
      const amount = Number(payslip.advanceRecovery) || 0;
      if (amount <= 0 || !payslip.staffRef) continue;
      const advance = await SalaryAdvance.findOne({ staffRef: payslip.staffRef, status: 'Active' })
        || await SalaryAdvance.findOne({ staffRef: payslip.staffRef });
      if (!advance) continue;
      advance.recovered = Math.max(0, round2((Number(advance.recovered) || 0) - amount));
      advance.balance = Math.max(0, round2((Number(advance.amount) || 0) - advance.recovered));
      advance.status = 'Active';
      await advance.save();
      reversed += 1;
    }

    await PayrollRun.findByIdAndDelete(run._id);
    try {
      await removeJournalForSource('Payroll', run._id.toString());
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Payroll run for ${run.period} deleted and ${reversed} advance recovery/recoveries reversed`,
      data: { id: run._id, reversedAdvances: reversed }
    });
  } catch (error) {
    return next(error);
  }
};
