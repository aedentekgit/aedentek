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
  getAllBranches, getBranchOptions, getBranchById, createBranch, updateBranch, deleteBranch, setDefaultBranch
} from '../controllers/hrBranchController.js';
import {
  getAllTemplates as getAllOfferTemplates, getTemplateById as getOfferTemplateById,
  createTemplate as createOfferTemplate, updateTemplate as updateOfferTemplate,
  setDefaultTemplate as setDefaultOfferTemplate, deleteTemplate as deleteOfferTemplate
} from '../controllers/offerLetterTemplateController.js';
import {
  getAllOfferLetters, getOfferLetterById, createOfferLetter,
  updateOfferLetter, deleteOfferLetter
} from '../controllers/offerLetterController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();

// --- Branches (Masters) — Admin only -------------------------------------
router.get('/hr/branches', requireRole([ROLES.ADMIN]), getAllBranches);
router.get('/hr/branches/options', getBranchOptions); // Open for branch dropdown options
router.get('/hr/branches/:id', requireRole([ROLES.ADMIN]), getBranchById);
router.post('/hr/branches', requireRole([ROLES.ADMIN]), createBranch);
router.put('/hr/branches/:id/default', requireRole([ROLES.ADMIN]), setDefaultBranch);
router.put('/hr/branches/:id', requireRole([ROLES.ADMIN]), updateBranch);
router.delete('/hr/branches/:id', requireRole([ROLES.ADMIN]), deleteBranch);

// --- Employees — Admin & Manager only ------------------------------------
router.get('/staff', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllStaff);
router.get('/staff/branches', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getStaffBranches);
router.get('/staff/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getStaffById);
router.post('/staff', requireRole([ROLES.ADMIN, ROLES.MANAGER]), createStaff);
router.put('/staff/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), updateStaff);
router.delete('/staff/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), deleteStaff);

// --- Biometric attendance — Admin & Manager only -------------------------
router.get('/hr/staff-attendance', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllAttendance);
router.get('/hr/staff-attendance/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAttendanceById);
router.post('/hr/staff-attendance', requireRole([ROLES.ADMIN, ROLES.MANAGER]), createAttendance);
router.post('/hr/staff-attendance/punch', punchAttendance);
router.put('/hr/staff-attendance/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), updateAttendance);
router.delete('/hr/staff-attendance/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), deleteAttendance);

// --- Leave requests — Admin & Manager only -------------------------------
router.get('/hr/leave', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllLeaveRequests);
router.get('/hr/leave/balance/:staffRef', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getLeaveBalance);
router.post('/hr/leave', requireRole([ROLES.ADMIN, ROLES.MANAGER]), createLeaveRequest);
router.put('/hr/leave/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), updateLeaveRequest);
router.post('/hr/leave/:id/approve', requireRole([ROLES.ADMIN, ROLES.MANAGER]), approveLeaveRequest);
router.post('/hr/leave/:id/reject', requireRole([ROLES.ADMIN, ROLES.MANAGER]), rejectLeaveRequest);
router.delete('/hr/leave/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), deleteLeaveRequest);

// --- Leave types (Masters) — Admin only ----------------------------------
router.get('/hr/leave-types', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllLeaveTypes); // read-only for the Leave page dropdown
router.get('/hr/leave-types/:id', requireRole([ROLES.ADMIN]), getLeaveTypeById);
router.post('/hr/leave-types', requireRole([ROLES.ADMIN]), createLeaveType);
router.put('/hr/leave-types/:id', requireRole([ROLES.ADMIN]), updateLeaveType);
router.delete('/hr/leave-types/:id', requireRole([ROLES.ADMIN]), deleteLeaveType);

// --- Shifts — Admin & Manager only ---------------------------------------
router.get('/hr/shifts', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllShifts);
router.get('/hr/shifts/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getShiftById);
router.post('/hr/shifts', requireRole([ROLES.ADMIN, ROLES.MANAGER]), createShift);
router.put('/hr/shifts/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), updateShift);
router.delete('/hr/shifts/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), deleteShift);

// --- Salary structures — Admin only --------------------------------------
router.get('/salary-structures', requireRole([ROLES.ADMIN]), getAllSalaryStructures);
router.get('/salary-structures/:id', requireRole([ROLES.ADMIN]), getSalaryStructureById);
router.post('/salary-structures', requireRole([ROLES.ADMIN]), createSalaryStructure);
router.put('/salary-structures/:id', requireRole([ROLES.ADMIN]), updateSalaryStructure);
router.delete('/salary-structures/:id', requireRole([ROLES.ADMIN]), deleteSalaryStructure);

// --- Salary advances — Admin only ----------------------------------------
router.get('/hr/advances', requireRole([ROLES.ADMIN]), getAllSalaryAdvances);
router.get('/hr/advances/:id', requireRole([ROLES.ADMIN]), getSalaryAdvanceById);
router.post('/hr/advances', requireRole([ROLES.ADMIN]), createSalaryAdvance);
router.put('/hr/advances/:id', requireRole([ROLES.ADMIN]), updateSalaryAdvance);
router.delete('/hr/advances/:id', requireRole([ROLES.ADMIN]), deleteSalaryAdvance);

// --- Payroll adjustments — Admin only ------------------------------------
router.get('/hr/adjustments', requireRole([ROLES.ADMIN]), getAllPayrollAdjustments);
router.get('/hr/adjustments/:id', requireRole([ROLES.ADMIN]), getPayrollAdjustmentById);
router.post('/hr/adjustments', requireRole([ROLES.ADMIN]), createPayrollAdjustment);
router.put('/hr/adjustments/:id', requireRole([ROLES.ADMIN]), updatePayrollAdjustment);
router.delete('/hr/adjustments/:id', requireRole([ROLES.ADMIN]), deletePayrollAdjustment);

// --- Payroll & payslips — Admin only -------------------------------------
router.get('/hr/payroll', requireRole([ROLES.ADMIN]), getAllPayrollRuns);
router.get('/hr/payroll/:id', requireRole([ROLES.ADMIN]), getPayrollRunById);
router.post('/hr/payroll/run', requireRole([ROLES.ADMIN]), runPayroll);
router.post('/hr/payroll/:id/finalize', requireRole([ROLES.ADMIN]), finalizePayrollRun);
router.post('/hr/payroll/:id/pay', requireRole([ROLES.ADMIN]), markPayrollRunPaid);
router.delete('/hr/payroll/:id', requireRole([ROLES.ADMIN]), deletePayrollRun);

// --- Offer Letter Templates (Masters) — Admin & Manager -------------------
router.get('/hr/offer-letter-templates', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllOfferTemplates);
router.get('/hr/offer-letter-templates/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getOfferTemplateById);
router.post('/hr/offer-letter-templates', requireRole([ROLES.ADMIN]), createOfferTemplate);
router.put('/hr/offer-letter-templates/:id/default', requireRole([ROLES.ADMIN]), setDefaultOfferTemplate);
router.put('/hr/offer-letter-templates/:id', requireRole([ROLES.ADMIN]), updateOfferTemplate);
router.delete('/hr/offer-letter-templates/:id', requireRole([ROLES.ADMIN]), deleteOfferTemplate);

// --- Offer Letters — Admin & Manager -------------------------------------
router.get('/hr/offer-letters', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllOfferLetters);
router.get('/hr/offer-letters/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getOfferLetterById);
router.post('/hr/offer-letters', requireRole([ROLES.ADMIN, ROLES.MANAGER]), createOfferLetter);
router.put('/hr/offer-letters/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), updateOfferLetter);
router.delete('/hr/offer-letters/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), deleteOfferLetter);

export default router;
