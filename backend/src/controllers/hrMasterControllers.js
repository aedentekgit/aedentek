import LeaveType from '../models/LeaveType.js';
import Shift from '../models/Shift.js';
import SalaryStructure from '../models/SalaryStructure.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import PayrollAdjustment from '../models/PayrollAdjustment.js';
import { buildCrud, safeContains } from '../utils/hrCrud.js';

// ---------------------------------------------------------------------------
// Leave Types
// ---------------------------------------------------------------------------
const leaveTypeCrud = buildCrud({
  Model: LeaveType,
  entity: 'Leave type',
  buildQuery: (req) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.branch && req.query.branch !== 'All Branches') query.branch = req.query.branch;
    if (req.query.q) query.name = safeContains(req.query.q);
    return query;
  },
  buildKpis: (docs) => ({
    total: docs.length,
    paid: docs.filter((d) => d.paid).length,
    unpaid: docs.filter((d) => !d.paid).length
  })
});

export const getAllLeaveTypes = leaveTypeCrud.list;
export const getLeaveTypeById = leaveTypeCrud.getById;
export const createLeaveType = leaveTypeCrud.create;
export const updateLeaveType = leaveTypeCrud.update;
export const deleteLeaveType = leaveTypeCrud.remove;

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------
const shiftCrud = buildCrud({
  Model: Shift,
  entity: 'Shift',
  buildQuery: (req) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.q) query.name = safeContains(req.query.q);
    return query;
  },
  buildKpis: (docs) => ({
    total: docs.length,
    active: docs.filter((d) => d.status === 'Active').length,
    withAllowance: docs.filter((d) => Number(d.shiftAllowance) > 0).length
  })
});

export const getAllShifts = shiftCrud.list;
export const getShiftById = shiftCrud.getById;
export const createShift = shiftCrud.create;
export const updateShift = shiftCrud.update;
export const deleteShift = shiftCrud.remove;

// ---------------------------------------------------------------------------
// Salary Structures
// ---------------------------------------------------------------------------
const salaryStructureCrud = buildCrud({
  Model: SalaryStructure,
  entity: 'Salary structure',
  beforeSave: (body, existing) => {
    if (!existing && !body.staffRef && !body.staffId) {
      throw Object.assign(new Error('Employee (staffRef or staffId) is required'), { statusCode: 400 });
    }
    return body;
  },
  buildQuery: (req) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.branch && req.query.branch !== 'All Branches') query.branch = req.query.branch;
    if (req.query.staffRef) query.staffRef = req.query.staffRef;
    if (req.query.q) query.staffName = safeContains(req.query.q);
    return query;
  },
  buildKpis: (docs) => ({
    total: docs.length,
    active: docs.filter((d) => d.status === 'Active').length,
    totalGross: Math.round(docs.reduce((s, d) => s + (Number(d.gross) || 0), 0)),
    totalNet: Math.round(docs.reduce((s, d) => s + (Number(d.netSalary) || 0), 0))
  })
});

export const getAllSalaryStructures = salaryStructureCrud.list;
export const getSalaryStructureById = salaryStructureCrud.getById;
export const createSalaryStructure = salaryStructureCrud.create;
export const updateSalaryStructure = salaryStructureCrud.update;
export const deleteSalaryStructure = salaryStructureCrud.remove;

// ---------------------------------------------------------------------------
// Salary Advances
// ---------------------------------------------------------------------------
const salaryAdvanceCrud = buildCrud({
  Model: SalaryAdvance,
  entity: 'Salary advance',
  buildQuery: (req) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.staffRef) query.staffRef = req.query.staffRef;
    if (req.query.q) query.staffName = safeContains(req.query.q);
    return query;
  },
  buildKpis: (docs) => ({
    active: docs.filter((d) => d.status === 'Active').length,
    outstanding: Math.round(docs.reduce((s, d) => s + (Number(d.balance) || 0), 0)),
    disbursed: Math.round(docs.reduce((s, d) => s + (Number(d.amount) || 0), 0))
  })
});

export const getAllSalaryAdvances = salaryAdvanceCrud.list;
export const getSalaryAdvanceById = salaryAdvanceCrud.getById;
export const createSalaryAdvance = salaryAdvanceCrud.create;
export const updateSalaryAdvance = salaryAdvanceCrud.update;
export const deleteSalaryAdvance = salaryAdvanceCrud.remove;

// ---------------------------------------------------------------------------
// Payroll Adjustments
// ---------------------------------------------------------------------------
const payrollAdjustmentCrud = buildCrud({
  Model: PayrollAdjustment,
  entity: 'Payroll adjustment',
  buildQuery: (req) => {
    const query = {};
    if (req.query.period) query.period = req.query.period;
    if (req.query.type) query.type = req.query.type;
    if (req.query.staffRef) query.staffRef = req.query.staffRef;
    if (req.query.q) query.staffName = safeContains(req.query.q);
    return query;
  },
  buildKpis: (docs) => ({
    total: docs.length,
    credits: Math.round(docs.filter((d) => d.type === 'credit').reduce((s, d) => s + (Number(d.amount) || 0), 0)),
    deductions: Math.round(docs.filter((d) => d.type === 'deduction').reduce((s, d) => s + (Number(d.amount) || 0), 0))
  })
});

export const getAllPayrollAdjustments = payrollAdjustmentCrud.list;
export const getPayrollAdjustmentById = payrollAdjustmentCrud.getById;
export const createPayrollAdjustment = payrollAdjustmentCrud.create;
export const updatePayrollAdjustment = payrollAdjustmentCrud.update;
export const deletePayrollAdjustment = payrollAdjustmentCrud.remove;
