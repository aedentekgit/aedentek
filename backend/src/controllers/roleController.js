import mongoose from 'mongoose';
import Role from '../models/Role.js';
import User from '../models/User.js';
import { ROLES, ROLE_ALLOWED_PAGES, RBAC_PERMISSIONS } from '../middleware/rbac.js';

/**
 * Full CRM Page & Module Permission Catalog used by the Roles & Access UI
 * and by backend permission derivation.
 */
export const PAGE_CATALOG = [
  {
    group: 'Workspace',
    pages: [
      { path: '/today', label: 'Dashboard', desc: 'Main daily workspace overview' },
      { path: '/clients', label: 'Clients', desc: 'Client directory, profiles & onboarding' },
      { path: '/projects', label: 'Projects', desc: 'Client project timelines & milestones' },
      { path: '/deals', label: 'Deals', desc: 'Sales pipeline board & Q4 forecast' }
    ]
  },
  {
    group: 'Reach',
    pages: [
      { path: '/inbox', label: 'Inbox', desc: 'Client messages & threads' },
      { path: '/calendar', label: 'Calendar', desc: 'Tasks, calls & schedule' },
      { path: '/outreach', label: 'Outreach', desc: 'Email sequences & templates' }
    ]
  },
  {
    group: 'Money & Invoice',
    pages: [
      { path: '/finance', label: 'Invoices & Proposals', desc: 'Invoices, proposals, commissions & templates' },
      { path: '/finance/settings', label: 'Tax & Banking Settings', desc: 'GST tax rates & invoice bank configuration' }
    ]
  },
  {
    group: 'Accounts',
    pages: [
      { path: '/accounts', label: 'Accounts & Reports', desc: 'Overview, inward, expenses, EMI, assets, credit notes & reports' }
    ]
  },
  {
    group: 'Human Resources',
    pages: [
      { path: '/hr/staff', label: 'Employees', desc: 'Employee directory & onboarding' },
      { path: '/hr/offer-letters', label: 'Offer Letters', desc: 'Issue & manage candidate offer letters' },
      { path: '/hr/attendance', label: 'Attendance', desc: 'Daily attendance & biometric logs' },
      { path: '/hr/leave', label: 'Leave Requests', desc: 'Leave applications & approvals' },
      { path: '/hr/salary', label: 'Salary Structures', desc: 'Employee compensation templates' },
      { path: '/hr/advances', label: 'Salary Advances', desc: 'Advance requests & EMI recovery' },
      { path: '/hr/adjustments', label: 'Payroll Adjustments', desc: 'Bonuses, deductions & overrides' },
      { path: '/hr/payroll', label: 'Payroll & Payslips', desc: 'Run, finalize & pay monthly payroll' }
    ]
  },
  {
    group: 'Masters',
    pages: [
      { path: '/clients/service-types', label: 'Service Types', desc: 'Client credential service types' },
      { path: '/clients/project-stages', label: 'Project Stages', desc: 'Project milestone stages' },
      { path: '/accounts/expense-categories', label: 'Expense Categories', desc: 'Accounts expense heads' },
      { path: '/accounts/asset-categories', label: 'Asset Categories', desc: 'Fixed asset categories' },
      { path: '/hr/leave-types', label: 'Leave Types', desc: 'Paid / unpaid leave quotas' },
      { path: '/hr/branches', label: 'Branches', desc: 'Company office locations' },
      { path: '/hr/shifts', label: 'Shifts', desc: 'Work shift schedules & grace periods' },
      { path: '/hr/roles', label: 'Roles & Access', desc: 'Manage roles and page restrictions' },
      { path: '/hr/offer-letter-templates', label: 'Offer Letter Templates', desc: 'Configure candidate offer letter templates & terms' }
    ]
  },
  {
    group: 'Studio & System',
    pages: [
      { path: '/team', label: 'Team', desc: 'Team directory & quota overview' },
      { path: '/library', label: 'Playbooks', desc: 'Sales playbooks & SOPs' },
      { path: '/settings', label: 'Admin Settings', desc: 'Platform settings, SMTP, Razorpay & theme' },
      { path: '/profile', label: 'Profile', desc: 'Personal profile settings' },
      { path: '/support', label: 'Support', desc: 'Help center & documentation' }
    ]
  }
];

export const ALL_CATALOG_PATHS = PAGE_CATALOG.flatMap((g) => g.pages.map((p) => p.path));

const MASTER_PATHS = PAGE_CATALOG.find((g) => g.group === 'Masters').pages.map((p) => p.path);

/**
 * Derive structured API module permissions from a role's selected allowedPages.
 */
export function derivePermissionsFromPages(pages = [], isAdminRole = false) {
  const set = new Set(Array.isArray(pages) ? pages : []);
  if (isAdminRole) {
    return JSON.parse(JSON.stringify(RBAC_PERMISSIONS[ROLES.ADMIN]));
  }
  const hasWorkspace = ['/today', '/clients', '/projects', '/deals', '/inbox', '/calendar', '/outreach'].some((p) => set.has(p));
  const hasFinance = set.has('/finance');
  const hasFinanceSettings = set.has('/finance/settings');
  const hasAccounts = set.has('/accounts');
  const hasHrCore = ['/hr', '/hr/staff', '/hr/offer-letters', '/hr/attendance', '/hr/leave'].some((p) => set.has(p));
  const hasSalary = set.has('/hr/salary');
  const hasPayroll = set.has('/hr/payroll') || set.has('/hr/advances') || set.has('/hr/adjustments');
  const hasMasters = set.has('/masters') || MASTER_PATHS.some((p) => set.has(p));
  const hasSettings = set.has('/settings');
  const hasTeam = set.has('/team');

  return {
    workspace: { read: hasWorkspace, write: hasWorkspace, delete: false },
    finance: { read: hasFinance || hasFinanceSettings, write: hasFinance, delete: false, settings: hasFinanceSettings },
    accounts: { read: hasAccounts, write: hasAccounts, delete: false, reports: hasAccounts },
    hr: { read: hasHrCore || hasSalary || hasPayroll, write: hasHrCore, delete: false, payroll: hasPayroll, salary: hasSalary },
    masters: { read: hasMasters, write: hasMasters, delete: false },
    settings: { read: hasSettings, write: hasSettings, reset: false },
    team: { read: hasTeam, write: hasTeam }
  };
}

function normalizeAllowedPages(rawPages = []) {
  const valid = new Set(ALL_CATALOG_PATHS);
  const out = new Set();
  for (const p of Array.isArray(rawPages) ? rawPages : []) {
    const clean = String(p || '').trim();
    if (valid.has(clean)) out.add(clean);
  }
  // If any HR page is selected, include umbrella '/hr' for sidebar group matching
  if (['/hr/staff', '/hr/offer-letters', '/hr/attendance', '/hr/leave', '/hr/salary', '/hr/advances', '/hr/adjustments', '/hr/payroll'].some((p) => out.has(p))) {
    out.add('/hr');
  }
  // If any Masters page is selected, include umbrella '/masters'
  if (MASTER_PATHS.some((p) => out.has(p))) {
    out.add('/masters');
  }
  return [...out];
}

const SYSTEM_ROLE_SEEDS = [
  {
    name: ROLES.ADMIN,
    slug: 'admin',
    description: 'Full unrestricted access to all CRM modules, payroll, masters, role management, and platform settings.',
    baseRole: ROLES.ADMIN,
    isSystem: true,
    status: 'Active',
    color: 'primary',
    allowedPages: [...new Set([...ROLE_ALLOWED_PAGES[ROLES.ADMIN], '/hr/roles'])],
    permissions: RBAC_PERMISSIONS[ROLES.ADMIN]
  },
  {
    name: ROLES.MANAGER,
    slug: 'manager',
    description: 'Operational access to Workspace, Invoices, Accounts, Team, and core HR (Employees, Offer Letters, Attendance, Leave).',
    baseRole: ROLES.MANAGER,
    isSystem: true,
    status: 'Active',
    color: 'amber',
    allowedPages: ROLE_ALLOWED_PAGES[ROLES.MANAGER],
    permissions: RBAC_PERMISSIONS[ROLES.MANAGER]
  },
  {
    name: ROLES.STAFF,
    slug: 'staff',
    description: 'Sales desk workspace access only (Dashboard, Clients, Projects, Deals, Inbox, Calendar, Outreach, Playbooks).',
    baseRole: ROLES.STAFF,
    isSystem: true,
    status: 'Active',
    color: 'teal',
    allowedPages: ROLE_ALLOWED_PAGES[ROLES.STAFF],
    permissions: RBAC_PERMISSIONS[ROLES.STAFF]
  }
];

export const seedRoles = async () => {
  try {
    for (const seed of SYSTEM_ROLE_SEEDS) {
      const existing = await Role.findOne({ $or: [{ slug: seed.slug }, { name: seed.name }] });
      if (!existing) {
        await Role.create(seed);
      } else if (seed.slug === 'admin') {
        const cleaned = existing.allowedPages.filter((p) => p !== '/hr/offer-letter-templates');
        if (!cleaned.includes('/hr/roles') || cleaned.length !== existing.allowedPages.length) {
          existing.allowedPages = [...new Set([...cleaned, '/hr/roles'])];
          await existing.save();
        }
      }
    }
  } catch (err) {
    console.error('[Seed] Error seeding Roles:', err.message);
  }
};

const toSlug = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// GET /api/roles
export const getAllRoles = async (req, res, next) => {
  try {
    await seedRoles();
    const { q, status } = req.query || {};
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { description: rx }];
    }

    const [roles, allRoles, userCounts] = await Promise.all([
      Role.find(query).sort({ isSystem: -1, name: 1 }),
      Role.find(),
      User.aggregate([
        { $match: { active: { $ne: false } } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = new Map(userCounts.map((u) => [String(u._id || '').toLowerCase(), u.count]));
    const enriched = roles.map((r) => {
      const obj = r.toObject();
      obj.userCount = countMap.get(String(r.name).toLowerCase()) || 0;
      return obj;
    });

    const totalAssigned = userCounts.reduce((s, u) => s + u.count, 0);

    return res.status(200).json({
      success: true,
      message: 'Roles retrieved successfully',
      data: enriched,
      pageCatalog: PAGE_CATALOG,
      kpis: {
        total: allRoles.length,
        active: allRoles.filter((r) => r.status === 'Active').length,
        custom: allRoles.filter((r) => !r.isSystem).length,
        assignedUsers: totalAssigned
      }
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/roles/options (Admin & Manager — used by Employee form Login Role dropdown)
export const getRoleOptions = async (req, res, next) => {
  try {
    await seedRoles();
    const roles = await Role.find({ status: 'Active' }).sort({ isSystem: -1, name: 1 });
    const callerIsAdmin = req.user?.role === ROLES.ADMIN;
    const filtered = roles
      .filter((r) => callerIsAdmin || (r.name !== ROLES.ADMIN && r.baseRole !== ROLES.ADMIN))
      .map((r) => ({
        _id: r._id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        isSystem: r.isSystem,
        color: r.color,
        allowedPages: r.allowedPages
      }));

    return res.status(200).json({
      success: true,
      data: filtered
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/roles/:id
export const getRoleById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const role = mongoose.Types.ObjectId.isValid(id)
      ? await Role.findById(id)
      : await Role.findOne({ $or: [{ slug: id.toLowerCase() }, { name: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    return res.status(200).json({ success: true, data: role, pageCatalog: PAGE_CATALOG });
  } catch (err) {
    return next(err);
  }
};

// POST /api/roles
export const createRole = async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, message: 'Role name must be at least 2 characters' });
    }
    const slug = toSlug(name);
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Role name must include letters or numbers' });
    }
    const clash = await Role.findOne({
      $or: [{ slug }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }]
    });
    if (clash) {
      return res.status(400).json({ success: false, message: `Role "${name}" already exists` });
    }

    const allowedPages = normalizeAllowedPages(body.allowedPages);
    if (!allowedPages.length) {
      return res.status(400).json({ success: false, message: 'Select at least one allowed page for this role' });
    }

    const permissions = derivePermissionsFromPages(allowedPages, false);
    const derivedBase = (permissions.settings.write || permissions.hr.payroll || permissions.masters.write)
      ? ROLES.ADMIN
      : (permissions.finance.read || permissions.accounts.read || permissions.hr.read)
        ? ROLES.MANAGER
        : ROLES.STAFF;

    const role = await Role.create({
      name,
      slug,
      description: String(body.description || '').trim(),
      baseRole: ['Admin', 'Manager', 'Staff'].includes(body.baseRole) ? body.baseRole : derivedBase,
      isSystem: false,
      status: body.status === 'Inactive' ? 'Inactive' : 'Active',
      color: ['primary', 'cobalt', 'teal', 'amber', 'good', 'slate'].includes(body.color) ? body.color : 'primary',
      allowedPages,
      permissions
    });

    return res.status(201).json({
      success: true,
      message: `Role '${role.name}' created successfully`,
      data: role
    });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/roles/:id
export const updateRole = async (req, res, next) => {
  try {
    const id = req.params.id;
    const role = mongoose.Types.ObjectId.isValid(id)
      ? await Role.findById(id)
      : await Role.findOne({ slug: String(id).toLowerCase() });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    const body = req.body || {};
    const oldName = role.name;

    if (body.name !== undefined && String(body.name).trim() !== role.name) {
      if (role.isSystem) {
        return res.status(400).json({ success: false, message: 'Built-in system roles cannot be renamed' });
      }
      const nextName = String(body.name).trim();
      if (nextName.length < 2) {
        return res.status(400).json({ success: false, message: 'Role name must be at least 2 characters' });
      }
      const nextSlug = toSlug(nextName);
      const clash = await Role.findOne({
        _id: { $ne: role._id },
        $or: [{ slug: nextSlug }, { name: new RegExp(`^${nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }]
      });
      if (clash) {
        return res.status(400).json({ success: false, message: `Role "${nextName}" already exists` });
      }
      role.name = nextName;
      role.slug = nextSlug;
    }

    if (body.description !== undefined) role.description = String(body.description || '').trim();
    if (body.color !== undefined && ['primary', 'cobalt', 'teal', 'amber', 'good', 'slate'].includes(body.color)) {
      role.color = body.color;
    }
    if (body.status !== undefined) {
      if (role.slug === 'admin' && body.status === 'Inactive') {
        return res.status(400).json({ success: false, message: 'The Admin role cannot be deactivated' });
      }
      role.status = body.status === 'Inactive' ? 'Inactive' : 'Active';
    }

    if (body.allowedPages !== undefined) {
      let allowedPages = normalizeAllowedPages(body.allowedPages);
      if (role.slug === 'admin') {
        allowedPages = [...new Set([...allowedPages, '/today', '/hr/roles', '/settings', '/masters'])];
      }
      if (!allowedPages.length) {
        return res.status(400).json({ success: false, message: 'Select at least one allowed page for this role' });
      }
      role.allowedPages = allowedPages;
      role.permissions = derivePermissionsFromPages(allowedPages, role.slug === 'admin');
    }

    await role.save();

    // If a custom role was renamed, keep assigned Users in sync
    if (!role.isSystem && oldName !== role.name) {
      await User.updateMany({ role: oldName }, { $set: { role: role.name, accessLevel: role.name } });
    }

    return res.status(200).json({
      success: true,
      message: `Role '${role.name}' updated successfully`,
      data: role
    });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/roles/:id
export const deleteRole = async (req, res, next) => {
  try {
    const id = req.params.id;
    const role = mongoose.Types.ObjectId.isValid(id)
      ? await Role.findById(id)
      : await Role.findOne({ slug: String(id).toLowerCase() });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    if (role.isSystem) {
      return res.status(400).json({ success: false, message: `Built-in role '${role.name}' cannot be deleted` });
    }

    const assignedCount = await User.countDocuments({ role: role.name, active: { $ne: false } });
    if (assignedCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete role '${role.name}': ${assignedCount} active user account(s) are currently assigned to it.`
      });
    }

    await Role.findByIdAndDelete(role._id);
    return res.status(200).json({
      success: true,
      message: `Role '${role.name}' deleted successfully`,
      data: { id: role._id }
    });
  } catch (err) {
    return next(err);
  }
};
