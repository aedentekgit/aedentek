import mongoose from 'mongoose';
import Staff from '../models/Staff.js';
import SalaryStructure from '../models/SalaryStructure.js';
import User from '../models/User.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import PayrollRun from '../models/PayrollRun.js';
import { hashPassword } from '../utils/password.js';
import { safeContains } from '../utils/hrCrud.js';

/** Branch code prefix used in staff codes, e.g. "Bandra" -> "BA". */
const branchPrefix = (branch) =>
  String(branch || 'GG').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'GG';

/**
 * Resolve the next free staff code for a branch, e.g. "BA-S-0001".
 */
const nextStaffCode = async (branch) => {
  const prefix = `${branchPrefix(branch)}-S-`;
  const existing = await Staff.find({ staffCode: new RegExp(`^${prefix}\\d+$`) })
    .sort({ staffCode: -1 })
    .limit(1);
  const last = existing[0]?.staffCode || `${prefix}0000`;
  const seq = Number(last.slice(prefix.length)) + 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

/**
 * Resolve the next global employee code, e.g. "GG001".
 */
const nextEmployeeCode = async () => {
  const existing = await Staff.find({ employeeCode: new RegExp('^GG\\d+$') })
    .sort({ employeeCode: -1 })
    .limit(1);
  const last = existing[0]?.employeeCode || 'GG000';
  const seq = Number(last.slice(2)) + 1;
  return `GG${String(seq).padStart(3, '0')}`;
};

/**
 * Upsert the salary structure that mirrors an employee's compensation.
 * Business rule 1.1 — creating or updating an employee with non-zero salary
 * components keeps an active SalaryStructure in sync.
 */
const syncSalaryStructure = async (staff) => {
  const components = {
    basic: staff.basic || 0,
    hra: staff.hra || 0,
    transportAllowance: staff.transportAllowance || 0,
    telephoneAllowance: staff.telephoneAllowance || 0,
    foodAllowance: staff.foodAllowance || 0,
    specialAllowance: staff.specialAllowance || 0,
    otherEarnings: staff.otherEarnings || 0
  };
  const hasComponents = Object.values(components).some((v) => Number(v) > 0);
  if (!hasComponents) return null;

  const existing = await SalaryStructure.findOne({ staffRef: staff._id, status: 'Active' });
  const payload = {
    ...components,
    staffRef: staff._id,
    staffId: staff.staffCode,
    staffName: staff.name,
    branch: staff.branch,
    effectiveFrom: staff.joiningDate,
    otherDeductions: staff.otherDeductions || 0,
    status: 'Active'
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }
  return SalaryStructure.create(payload);
};

/**
 * Create or update the portal login account for an employee.
 * Business rule 1.2 — passwords are hashed, the role is mapped, staffRef is stored.
 */
const syncUserAccount = async (staff, password) => {
  if (!staff.createLogin || !staff.username || !password) return null;
  const hashed = hashPassword(password);
  const payload = {
    accessLevel: staff.accessLevel || 'Staff',
    staffRef: staff._id,
    staffId: staff.staffCode,
    name: staff.name,
    active: true
  };
  const existing = await User.findOne({ username: staff.username });
  if (existing) {
    Object.assign(existing, payload, { password: hashed });
    await existing.save();
    return existing;
  }
  return User.create({ ...payload, username: staff.username, password: hashed });
};

// ---------------------------------------------------------------------------
// GET /api/staff
// ---------------------------------------------------------------------------
export const getAllStaff = async (req, res, next) => {
  try {
    const { branch, department, status, q } = req.query;
    const query = {};
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (department && department !== 'All') query.department = department;
    if (status && status !== 'All') query.status = status;
    if (q && q.trim()) {
      const rx = safeContains(q.trim());
      query.$or = [{ name: rx }, { staffCode: rx }, { employeeCode: rx }, { role: rx }, { email: rx }];
    }

    const staff = await Staff.find(query).sort({ createdAt: -1 });
    const all = await Staff.find();
    const trainers = all.filter((s) => s.role === 'Trainer' || s.department === 'Trainers');

    return res.status(200).json({
      success: true,
      message: 'Staff retrieved successfully',
      data: staff,
      kpis: {
        totalStaff: all.length,
        activeStaff: all.filter((s) => s.status === 'Active').length,
        onLeave: all.filter((s) => s.status === 'On Leave').length,
        trainers: trainers.length,
        branches: [...new Set(all.map((s) => s.branch).filter(Boolean))]
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/staff/branches
// ---------------------------------------------------------------------------
export const getStaffBranches = async (req, res, next) => {
  try {
    const branches = await Staff.distinct('branch');
    return res.status(200).json({
      success: true,
      message: 'Branches retrieved successfully',
      data: branches.filter(Boolean).sort()
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/staff/:id
// ---------------------------------------------------------------------------
export const getStaffById = async (req, res, next) => {
  try {
    let staff = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      staff = await Staff.findById(req.params.id);
    }
    if (!staff) {
      staff = await Staff.findOne({
        $or: [
          { staffCode: req.params.id },
          { employeeCode: req.params.id },
          { biometricId: req.params.id }
        ]
      });
    }
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    const structures = await SalaryStructure.find({ staffRef: staff._id }).sort({ effectiveFrom: -1 });
    return res.status(200).json({
      success: true,
      message: 'Staff record retrieved successfully',
      data: staff,
      salaryStructures: structures
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/staff
// ---------------------------------------------------------------------------
export const createStaff = async (req, res, next) => {
  try {
    const body = req.body || {};

    if (!body.firstName || !String(body.firstName).trim()) {
      return res.status(400).json({ success: false, message: 'First name is required' });
    }
    if (!body.branch || !String(body.branch).trim()) {
      return res.status(400).json({ success: false, message: 'Branch is required' });
    }
    if (!body.joiningDate) {
      return res.status(400).json({ success: false, message: 'Joining date is required' });
    }
    if (body.biometricId) {
      const clash = await Staff.findOne({ biometricId: String(body.biometricId) });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: `Biometric ID ${body.biometricId} is already enrolled to ${clash.name}`
        });
      }
    }
    if (body.createLogin) {
      if (!body.username || !body.password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required when creating a login account'
        });
      }
      if (String(body.password).length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const taken = await User.findOne({ username: body.username });
      if (taken) {
        return res.status(400).json({ success: false, message: `Username ${body.username} is already taken` });
      }
    }

    const staffCode = body.staffCode || (await nextStaffCode(body.branch));
    const employeeCode = body.employeeCode || (await nextEmployeeCode());

    const staff = await Staff.create({ ...body, staffCode, employeeCode });
    await syncSalaryStructure(staff);
    await syncUserAccount(staff, body.password);
    staff.password = '';

    return res.status(201).json({
      success: true,
      message: `Staff member '${staff.name}' registered successfully`,
      data: staff
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/staff/:id
// ---------------------------------------------------------------------------
export const updateStaff = async (req, res, next) => {
  try {
    let staff = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      staff = await Staff.findById(req.params.id);
    }
    if (!staff) {
      staff = await Staff.findOne({
        $or: [
          { staffCode: req.params.id },
          { employeeCode: req.params.id },
          { biometricId: req.params.id }
        ]
      });
    }
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const body = req.body || {};

    if (body.biometricId && body.biometricId !== staff.biometricId) {
      const clash = await Staff.findOne({ biometricId: String(body.biometricId), _id: { $ne: staff._id } });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: `Biometric ID ${body.biometricId} is already enrolled to ${clash.name}`
        });
      }
    }
    if (body.createLogin && body.password && String(body.password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const allowed = [
      'salutation', 'firstName', 'middleName', 'lastName', 'email', 'phone', 'dob', 'gender', 'maritalStatus',
      'nationality', 'bloodGroup', 'department', 'role', 'branch', 'branchRef', 'shift', 'shiftName',
      'employmentType', 'joiningDate', 'status', 'basic', 'hra', 'transportAllowance',
      'telephoneAllowance', 'foodAllowance', 'specialAllowance', 'otherEarnings', 'otherDeductions',
      'bankName', 'accountNumber', 'ifscCode', 'iban', 'createLogin', 'username', 'accessLevel',
      'biometricId', 'photo'
    ];

    for (const field of allowed) {
      if (body[field] !== undefined) staff[field] = body[field];
    }
    if (body.documents !== undefined) staff.documents = body.documents;

    await staff.save();
    await syncSalaryStructure(staff);
    if (staff.createLogin) {
      await syncUserAccount(staff, body.password || 'UNCHANGED');
    }
    staff.password = '';

    return res.status(200).json({
      success: true,
      message: `Staff member '${staff.name}' updated successfully`,
      data: staff
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/staff/:id
// ---------------------------------------------------------------------------
export const deleteStaff = async (req, res, next) => {
  try {
    let staff = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      staff = await Staff.findById(req.params.id);
    }
    if (!staff) {
      staff = await Staff.findOne({
        $or: [
          { staffCode: req.params.id },
          { employeeCode: req.params.id },
          { biometricId: req.params.id }
        ]
      });
    }
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Cascade integrity — block the delete when financial history still references this person.
    const openAdvances = await SalaryAdvance.find({ staffRef: staff._id, status: 'Active' });
    const paidRuns = await PayrollRun.find({
      'payslips.staffRef': staff._id,
      status: { $in: ['Finalized', 'Paid'] }
    });

    if (openAdvances.length || paidRuns.length) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete '${staff.name}': ${openAdvances.length} open advance(s) and ${paidRuns.length} finalized payroll run(s) still reference this record.`,
        blockers: { openAdvances: openAdvances.length, payrollRuns: paidRuns.length }
      });
    }

    await SalaryStructure.deleteMany({ staffRef: staff._id });
    await User.deleteMany({ staffRef: staff._id });
    await Staff.findByIdAndDelete(staff._id);

    return res.status(200).json({
      success: true,
      message: `Staff member '${staff.name}' deleted successfully`,
      data: { id: staff._id }
    });
  } catch (error) {
    return next(error);
  }
};
