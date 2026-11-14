import express from 'express';
import {
  getAllStaff, getStaffBranches, getStaffById,
  createStaff, updateStaff, deleteStaff
} from '../controllers/hrStaffController.js';
import {
  getAllAttendance, getAttendanceById, createAttendance,
  punchAttendance, updateAttendance, deleteAttendance
} from '../controllers/hrAttendanceController.js';
import {
  getAllLeaveRequests, getLeaveBalance, createLeaveRequest, updateLeaveRequest,
  approveLeaveRequest, rejectLeaveRequest, deleteLeaveRequest
} from '../controllers/hrLeaveController.js';
import {
  getAllPayrollRuns, getPayrollRunById, runPayroll,
  finalizePayrollRun, markPayrollRunPaid, deletePayrollRun
} from '../controllers/hrPayrollController.js';
import {
  getAllLeaveTypes, getLeaveTypeById, createLeaveType, updateLeaveType, deleteLeaveType,
  getAllShifts, getShiftById, createShift, updateShift, deleteShift,
  getAllSalaryStructures, getSalaryStructureById, createSalaryStructure,
  updateSalaryStructure, deleteSalaryStructure,
  getAllSalaryAdvances, getSalaryAdvanceById, createSalaryAdvance,
  updateSalaryAdvance, deleteSalaryAdvance,
  getAllPayrollAdjustments, getPayrollAdjustmentById, createPayrollAdjustment,
  updatePayrollAdjustment, deletePayrollAdjustment
} from '../controllers/hrMasterControllers.js';

import {
  getAllBranches, getBranchOptions, getBranchById, createBranch, updateBranch, deleteBranch
} from '../controllers/hrBranchController.js';

const router = express.Router();

// --- Branches ------------------------------------------------------------
router.get('/hr/branches', getAllBranches);
router.get('/hr/branches/options', getBranchOptions);
router.get('/hr/branches/:id', getBranchById);
router.post('/hr/branches', createBranch);
router.put('/hr/branches/:id', updateBranch);
router.delete('/hr/branches/:id', deleteBranch);

// --- Employees -----------------------------------------------------------
router.get('/staff', getAllStaff);
router.get('/staff/branches', getStaffBranches);
router.get('/staff/:id', getStaffById);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);

// --- Biometric attendance ------------------------------------------------
router.get('/hr/staff-attendance', getAllAttendance);
router.get('/hr/staff-attendance/:id', getAttendanceById);
router.post('/hr/staff-attendance', createAttendance);
router.post('/hr/staff-attendance/punch', punchAttendance);
router.put('/hr/staff-attendance/:id', updateAttendance);
router.delete('/hr/staff-attendance/:id', deleteAttendance);

// --- Leave requests ------------------------------------------------------
router.get('/hr/leave', getAllLeaveRequests);
router.get('/hr/leave/balance/:staffRef', getLeaveBalance);
router.post('/hr/leave', createLeaveRequest);
router.put('/hr/leave/:id', updateLeaveRequest);
router.post('/hr/leave/:id/approve', approveLeaveRequest);
router.post('/hr/leave/:id/reject', rejectLeaveRequest);
router.delete('/hr/leave/:id', deleteLeaveRequest);

// --- Leave types ---------------------------------------------------------
router.get('/hr/leave-types', getAllLeaveTypes);
router.get('/hr/leave-types/:id', getLeaveTypeById);
router.post('/hr/leave-types', createLeaveType);
router.put('/hr/leave-types/:id', updateLeaveType);
router.delete('/hr/leave-types/:id', deleteLeaveType);

// --- Shifts --------------------------------------------------------------
router.get('/hr/shifts', getAllShifts);
router.get('/hr/shifts/:id', getShiftById);
router.post('/hr/shifts', createShift);
router.put('/hr/shifts/:id', updateShift);
router.delete('/hr/shifts/:id', deleteShift);

// --- Salary structures ---------------------------------------------------
router.get('/salary-structures', getAllSalaryStructures);
router.get('/salary-structures/:id', getSalaryStructureById);
router.post('/salary-structures', createSalaryStructure);
router.put('/salary-structures/:id', updateSalaryStructure);
router.delete('/salary-structures/:id', deleteSalaryStructure);

// --- Salary advances -----------------------------------------------------
router.get('/hr/advances', getAllSalaryAdvances);
router.get('/hr/advances/:id', getSalaryAdvanceById);
router.post('/hr/advances', createSalaryAdvance);
router.put('/hr/advances/:id', updateSalaryAdvance);
router.delete('/hr/advances/:id', deleteSalaryAdvance);

// --- Payroll adjustments -------------------------------------------------
router.get('/hr/adjustments', getAllPayrollAdjustments);
router.get('/hr/adjustments/:id', getPayrollAdjustmentById);
router.post('/hr/adjustments', createPayrollAdjustment);
router.put('/hr/adjustments/:id', updatePayrollAdjustment);
router.delete('/hr/adjustments/:id', deletePayrollAdjustment);

// --- Payroll & payslips --------------------------------------------------
router.get('/hr/payroll', getAllPayrollRuns);
router.get('/hr/payroll/:id', getPayrollRunById);
router.post('/hr/payroll/run', runPayroll);
router.post('/hr/payroll/:id/finalize', finalizePayrollRun);
router.post('/hr/payroll/:id/pay', markPayrollRunPaid);
router.delete('/hr/payroll/:id', deletePayrollRun);

export default router;
