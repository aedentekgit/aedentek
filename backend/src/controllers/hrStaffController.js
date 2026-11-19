import mongoose from 'mongoose';
import Staff from '../models/Staff.js';
import SalaryStructure from '../models/SalaryStructure.js';
import User, { generateAuthKey } from '../models/User.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import PayrollRun from '../models/PayrollRun.js';
import { hashBcrypt } from '../utils/password.js';
import { safeContains } from '../utils/hrCrud.js';
import { normalizeRole, resolveRolePolicy, ROLES } from '../middleware/rbac.js';

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
 * Create, update, or deactivate the portal login account for an employee.
 * Business rule 1.2 — passwords are bcrypt hashed, role & accessLevel are mapped,
 * staffRef & email are stored, and disabling login or rotating passwords revokes old auth keys.
 */
const syncUserAccount = async (staff, rawPassword = null) => {
  const username = String(staff.username || '').trim().toLowerCase();
  const email = String(staff.email || '').trim().toLowerCase();
  const normalizedRole = normalizeRole(staff.accessLevel || 'Staff');
  const shouldBeActive = Boolean(
    staff.createLogin && username && staff.status !== 'Inactive' && staff.status !== 'Terminated'
  );

  let existing = await User.findOne({ staffRef: staff._id });
  if (!existing && username) {
    existing = await User.findOne({ username: new RegExp(`^${escapeRegex(username)}$`, 'i') });
  }

  if (!shouldBeActive) {
    if (existing) {
      existing.active = false;
      existing.authKey = generateAuthKey(); // immediately revoke existing auth keys
      await existing.save();
    }
    return existing || null;
  }

  const payload = {
    username,
    email,
    role: normalizedRole,
    accessLevel: normalizedRole,
    staffRef: staff._id,
    staffId: staff.staffCode,
    name: staff.name,
    active: true
  };

  if (existing) {
    Object.assign(existing, payload);
    if (rawPassword && String(rawPassword).trim()) {
      existing.password = hashBcrypt(String(rawPassword));
      existing.authKey = generateAuthKey(); // rotate auth key on password reset
    } else if (!existing.authKey) {
      existing.authKey = generateAuthKey();
    }
    await existing.save();
    return existing;
  }

  if (!rawPassword || !String(rawPassword).trim()) return null;
  return User.create({
    ...payload,
    password: hashBcrypt(String(rawPassword)),
    authKey: generateAuthKey()
  });
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
    const rawPassword = body.password ? String(body.password) : '';
    const normalizedAccess = normalizeRole(body.accessLevel || 'Staff');
    const cleanUsername = String(body.username || '').trim().toLowerCase();
    const cleanEmail = String(body.email || '').trim().toLowerCase();

    if (body.createLogin) {
      const targetPolicy = await resolveRolePolicy(normalizedAccess);
      const isAdminTierRole =
        normalizedAccess === ROLES.ADMIN ||
        targetPolicy.baseRole === ROLES.ADMIN ||
        (Array.isArray(targetPolicy.allowedPages) &&
          (targetPolicy.allowedPages.includes('/hr/roles') || targetPolicy.allowedPages.includes('/settings')));
      if (isAdminTierRole && req.user && req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only Administrators can assign Admin-tier login access'
        });
      }
      if (!cleanUsername || !rawPassword) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required when creating a login account'
        });
      }
      if (cleanUsername.length < 3 || /\s/.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters without spaces'
        });
      }
      if (rawPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const taken = await User.findOne({ username: new RegExp(`^${escapeRegex(cleanUsername)}$`, 'i') });
      if (taken) {
        return res.status(400).json({ success: false, message: `Username ${cleanUsername} is already taken` });
      }
      if (cleanEmail) {
        const emailTaken = await User.findOne({ email: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') });
        if (emailTaken) {
          return res.status(400).json({ success: false, message: `Email ${cleanEmail} is already assigned to another login account` });
        }
      }
    }

    const staffCode = body.staffCode || (await nextStaffCode(body.branch));
    const employeeCode = body.employeeCode || (await nextEmployeeCode());

    const staffPayload = { ...body, staffCode, employeeCode, password: '' };
    if (body.createLogin) {
      staffPayload.username = cleanUsername;
      staffPayload.accessLevel = normalizedAccess;
      if (cleanEmail) staffPayload.email = cleanEmail;
    }

    const staff = await Staff.create(staffPayload);
    await syncSalaryStructure(staff);
    await syncUserAccount(staff, rawPassword);
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
    const rawPassword = body.password ? String(body.password) : '';
    const effectiveCreateLogin = body.createLogin !== undefined ? Boolean(body.createLogin) : Boolean(staff.createLogin);
    const effectiveUsername = String(body.username !== undefined ? body.username : (staff.username || '')).trim().toLowerCase();
    const effectiveEmail = String(body.email !== undefined ? body.email : (staff.email || '')).trim().toLowerCase();
    const effectiveAccess = normalizeRole(body.accessLevel !== undefined ? body.accessLevel : (staff.accessLevel || 'Staff'));

    if (effectiveCreateLogin) {
      const targetPolicy = await resolveRolePolicy(effectiveAccess);
      const prevPolicy = await resolveRolePolicy(normalizeRole(staff.accessLevel || 'Staff'));
      const isAdminTier = (roleName, pol) =>
        roleName === ROLES.ADMIN ||
        pol.baseRole === ROLES.ADMIN ||
        (Array.isArray(pol.allowedPages) &&
          (pol.allowedPages.includes('/hr/roles') || pol.allowedPages.includes('/settings')));
      if ((isAdminTier(effectiveAccess, targetPolicy) || isAdminTier(normalizeRole(staff.accessLevel), prevPolicy)) && req.user && req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only Administrators can assign or modify Admin-tier login access'
        });
      }
      if (!effectiveUsername || effectiveUsername.length < 3 || /\s/.test(effectiveUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters without spaces when login is enabled'
        });
      }
      if (rawPassword && rawPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const linkedUser = await User.findOne({ staffRef: staff._id });
      if (!linkedUser && !rawPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password is required when enabling a login account'
        });
      }
      const userFilter = linkedUser ? { _id: { $ne: linkedUser._id } } : {};
      const taken = await User.findOne({
        ...userFilter,
        username: new RegExp(`^${escapeRegex(effectiveUsername)}$`, 'i')
      });
      if (taken) {
        return res.status(400).json({ success: false, message: `Username ${effectiveUsername} is already taken` });
      }
      if (effectiveEmail) {
        const emailTaken = await User.findOne({
          ...userFilter,
          email: new RegExp(`^${escapeRegex(effectiveEmail)}$`, 'i')
        });
        if (emailTaken) {
          return res.status(400).json({ success: false, message: `Email ${effectiveEmail} is already assigned to another login account` });
        }
      }
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
    if (body.username !== undefined) staff.username = effectiveUsername;
    if (body.accessLevel !== undefined) staff.accessLevel = effectiveAccess;
    if (body.documents !== undefined) staff.documents = body.documents;
    staff.password = '';

    await staff.save();
    await syncSalaryStructure(staff);
    await syncUserAccount(staff, rawPassword || null);
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
