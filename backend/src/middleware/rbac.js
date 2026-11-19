/**
 * Role-Based Access Control (RBAC) Middleware & Permission Enforcement
 * Aedentek CRM — Platform Security Layer
 */

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'aedentek-crm-secure-jwt-secret-key-2026';

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn('[Security] JWT_SECRET is not set — tokens are signed with the built-in development secret. Set JWT_SECRET in the environment before deploying.');
}

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff'
};

// Role hierarchy rank (higher number = greater privileges)
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.MANAGER]: 2,
  [ROLES.STAFF]: 1
};

// Comprehensive module permissions matrix
export const RBAC_PERMISSIONS = {
  [ROLES.ADMIN]: {
    workspace: { read: true, write: true, delete: true },
    finance: { read: true, write: true, delete: true, settings: true },
    accounts: { read: true, write: true, delete: true, reports: true },
    hr: { read: true, write: true, delete: true, payroll: true, salary: true },
    masters: { read: true, write: true, delete: true },
    settings: { read: true, write: true, reset: true },
    team: { read: true, write: true }
  },
  [ROLES.MANAGER]: {
    workspace: { read: true, write: true, delete: true },
    finance: { read: true, write: true, delete: false, settings: false },
    accounts: { read: true, write: true, delete: false, reports: true },
    hr: { read: true, write: true, delete: false, payroll: false, salary: false },
    masters: { read: false, write: false, delete: false },
    settings: { read: false, write: false, reset: false },
    team: { read: true, write: false }
  },
  [ROLES.STAFF]: {
    workspace: { read: true, write: true, delete: false },
    finance: { read: false, write: false, delete: false, settings: false },
    accounts: { read: false, write: false, delete: false, reports: false },
    hr: { read: false, write: false, delete: false, payroll: false, salary: false },
    masters: { read: false, write: false, delete: false },
    settings: { read: false, write: false, reset: false },
    team: { read: false, write: false }
  }
};

// Explicit page/route access matrix per role (mirrors frontend route guard)
export const ROLE_ALLOWED_PAGES = {
  [ROLES.ADMIN]: [
    '/today', '/clients', '/projects', '/deals', '/inbox', '/calendar', '/outreach',
    '/finance', '/finance/settings', '/accounts', '/hr', '/hr/staff', '/hr/offer-letters',
    '/hr/attendance', '/hr/leave', '/hr/salary', '/hr/advances', '/hr/adjustments', '/hr/payroll',
    '/masters', '/hr/branches', '/hr/shifts', '/hr/leave-types', '/hr/roles', '/hr/offer-letter-templates',
    '/clients/service-types', '/clients/project-stages', '/accounts/expense-categories', '/accounts/asset-categories',
    '/team', '/library', '/settings', '/profile', '/support'
  ],
  [ROLES.MANAGER]: [
    '/today', '/clients', '/projects', '/deals', '/inbox', '/calendar', '/outreach',
    '/finance', '/accounts', '/hr', '/hr/staff', '/hr/offer-letters', '/hr/attendance', '/hr/leave',
    '/team', '/library', '/profile', '/support'
  ],
  [ROLES.STAFF]: [
    '/today', '/clients', '/projects', '/deals', '/inbox', '/calendar', '/outreach',
    '/library', '/profile', '/support'
  ]
};

/**
 * Normalizes built-in role inputs to PascalCase while preserving custom role names verbatim
 */
export const normalizeRole = (rawRole) => {
  if (!rawRole || typeof rawRole !== 'string') return ROLES.STAFF;
  const trimmed = rawRole.trim();
  if (!trimmed) return ROLES.STAFF;
  const lower = trimmed.toLowerCase();
  if (lower === 'admin' || lower === 'administrator' || lower === 'superadmin' || lower === 'super admin') return ROLES.ADMIN;
  if (lower === 'manager' || lower === 'branch manager' || lower === 'coordinator') return ROLES.MANAGER;
  if (lower === 'staff') return ROLES.STAFF;
  return trimmed;
};

/**
 * Resolves live allowedPages & permissions for any built-in or custom role from MongoDB,
 * falling back to static defaults when DB is unavailable or no custom doc exists.
 */
export const resolveRolePolicy = async (roleName) => {
  const role = normalizeRole(roleName);
  const fallbackPages = ROLE_ALLOWED_PAGES[role] || ROLE_ALLOWED_PAGES[ROLES.STAFF];
  const fallbackPerms = RBAC_PERMISSIONS[role] || RBAC_PERMISSIONS[ROLES.STAFF];
  if (mongoose.connection.readyState !== 1) {
    return { role, allowedPages: fallbackPages, permissions: fallbackPerms, isCustom: !ROLE_ALLOWED_PAGES[role] };
  }
  try {
    const escaped = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await Role.findOne({ name: new RegExp(`^${escaped}$`, 'i') }).lean();
    if (doc && doc.status !== 'Inactive') {
      return {
        role: doc.name,
        allowedPages: Array.isArray(doc.allowedPages) && doc.allowedPages.length ? doc.allowedPages : fallbackPages,
        permissions: doc.permissions || fallbackPerms,
        isCustom: !doc.isSystem,
        baseRole: doc.baseRole || ROLES.STAFF
      };
    }
  } catch {}
  return { role, allowedPages: fallbackPages, permissions: fallbackPerms, isCustom: !ROLE_ALLOWED_PAGES[role] };
};

/**
 * Generates a signed JWT auth key for an authenticated user
 */
export const generateToken = (user) => {
  const role = normalizeRole(user.role || user.accessLevel);
  const payload = {
    id: user._id ? String(user._id) : (user.id || 'u1'),
    username: user.username || user.email || 'user',
    name: user.name || 'User',
    email: user.email || '',
    role: role,
    accessLevel: role
  };
  if (user.authKey) {
    payload.ak = user.authKey;
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

/**
 * Extracts and validates auth key (Authorization Bearer, X-Auth-Key header, or HTTP-only Cookie)
 * and sets authoritative user role & permissions on req.user.
 */
export const authenticateUser = async (req, res, next) => {
  // Public endpoints (login, logout, refresh, health) never reject on stale or expired tokens.
  // Match the exact request path (query string excluded) so "?x=/api/auth/login" cannot skip auth.
  const reqPath = String(req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
  const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh', '/api/health'];
  if (PUBLIC_PATHS.includes(reqPath)) {
    return next();
  }

  // Header/query role hints, mock tokens and the implicit Admin fallback exist only for the
  // automated test suites. Outside NODE_ENV=test the role always comes from a verified JWT auth key.
  const allowInsecureAuth = process.env.NODE_ENV === 'test' || process.env.ALLOW_INSECURE_DEV_AUTH === 'true';

  const roleHeader = req.headers['x-user-role'] || req.headers['x-access-level'];
  const authHeader = req.headers['authorization'];
  const authKeyHeader = req.headers['x-auth-key'];
  const queryRole = req.query?.role;
  let userId = allowInsecureAuth ? (req.headers['x-user-id'] || 'u1') : null;
  let userName = allowInsecureAuth ? (req.headers['x-user-name'] || 'Authenticated User') : 'Authenticated User';
  let userUsername = '';
  let userEmail = '';

  let detectedRole = null;
  let tokenValidated = false;

  let rawToken = null;
  const isBearerHeader = !!(authHeader && authHeader.startsWith('Bearer '));
  const isAuthKeyHeader = !!(authKeyHeader && String(authKeyHeader).trim());
  const isExplicitHeader = isBearerHeader || isAuthKeyHeader;

  if (isBearerHeader) {
    rawToken = authHeader.slice(7).trim();
  } else if (isAuthKeyHeader) {
    rawToken = String(authKeyHeader).trim();
  } else if (req.headers?.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)tessly_jwt=([^;]+)/);
    if (match) rawToken = decodeURIComponent(match[1]);
  }

  // 1. Bearer header, X-Auth-Key header, or cookie token
  if (rawToken) {
    const lowerTok = rawToken.toLowerCase();
    if (allowInsecureAuth && (rawToken === 'admin-token' || lowerTok.includes('admin-mock'))) {
      detectedRole = ROLES.ADMIN;
    } else if (allowInsecureAuth && (rawToken === 'manager-token' || lowerTok.includes('manager-mock'))) {
      detectedRole = ROLES.MANAGER;
    } else if (allowInsecureAuth && (rawToken === 'staff-token' || lowerTok.includes('staff-mock'))) {
      detectedRole = ROLES.STAFF;
    } else {
      // Cryptographically verify signed JWT auth key. The signed + DB-backed role is authoritative:
      // client-supplied X-User-Role / X-Access-Level headers can never raise it.
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        detectedRole = normalizeRole(
          allowInsecureAuth ? (roleHeader || decoded.role || decoded.accessLevel) : (decoded.role || decoded.accessLevel)
        );
        userId = decoded.id || decoded.userId || userId;
        userUsername = decoded.username || '';
        userName = decoded.name || decoded.username || userName;
        userEmail = decoded.email || '';
        tokenValidated = true;

        // Live database verification for real persisted users (checks active status, authKey revocation, and role sync)
        if (userId && mongoose.Types.ObjectId.isValid(String(userId)) && mongoose.connection.readyState === 1) {
          const dbUser = await User.findById(userId).select('username name email role accessLevel active authKey');
          if (!dbUser) {
            if (decoded.ak) {
              res.clearCookie('tessly_jwt');
              return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'USER_NOT_FOUND',
                message: 'User account no longer exists. Please sign in again.'
              });
            }
          } else {
            if (dbUser.active === false) {
              res.clearCookie('tessly_jwt');
              return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'ACCOUNT_DEACTIVATED',
                message: 'Account has been deactivated. Please contact administrator.'
              });
            }
            if (decoded.ak && dbUser.authKey && decoded.ak !== dbUser.authKey) {
              res.clearCookie('tessly_jwt');
              return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'AUTH_KEY_REVOKED',
                message: 'Authentication key has been revoked or rotated. Please sign in again.'
              });
            }
            if (!allowInsecureAuth || !roleHeader) {
              detectedRole = normalizeRole(dbUser.role || dbUser.accessLevel);
            }
            userUsername = dbUser.username || userUsername;
            userName = dbUser.name || dbUser.username || userName;
            userEmail = dbUser.email || userEmail;
          }
        }
      } catch (err) {
        // If an explicit Authorization or X-Auth-Key header with invalid JWT was sent, reject with 401
        if (isExplicitHeader) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            code: 'INVALID_TOKEN',
            message: 'Authentication key is invalid or expired.'
          });
        }
        // If from cookie, clear stale cookie and continue
        res.clearCookie('tessly_jwt');
      }
    }
  }

  if (!detectedRole) {
    if (!allowInsecureAuth) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required. Please sign in.'
      });
    }
    // Test-only fallbacks: role header, ?role= query, then Admin.
    if (roleHeader) detectedRole = normalizeRole(roleHeader);
    else if (queryRole) detectedRole = normalizeRole(queryRole);
    else detectedRole = ROLES.ADMIN;
  }

  const policy = await resolveRolePolicy(detectedRole);

  req.user = {
    id: userId,
    username: userUsername,
    name: userName,
    email: userEmail,
    role: policy.role,
    accessLevel: policy.role,
    isCustomRole: Boolean(policy.isCustom),
    tokenValidated: tokenValidated,
    authKeyValid: tokenValidated,
    allowedPages: policy.allowedPages,
    permissions: policy.permissions
  };

  next();
};

/**
 * Checks whether a custom role's DB-configured allowedPages / permissions authorize a given API path.
 */
function customRoleAllowsEndpoint(req, user) {
  const pages = new Set(Array.isArray(user?.allowedPages) ? user.allowedPages : []);
  const perms = user?.permissions || {};
  const path = String(req.originalUrl || req.url || '').split('?')[0].toLowerCase();

  if (path.startsWith('/api/roles/options')) return pages.has('/hr/staff') || pages.has('/hr/roles');
  if (path.startsWith('/api/roles')) return pages.has('/hr/roles');
  if (path.startsWith('/api/settings')) return Boolean(perms.settings?.write || pages.has('/settings'));
  if (path.startsWith('/api/gst-rates')) return pages.has('/finance/settings');
  if (path.startsWith('/api/invoices') || path.startsWith('/api/propagations')) return pages.has('/finance') || Boolean(perms.finance?.read);
  if (path.startsWith('/api/accounts/expense-categories')) return pages.has('/accounts/expense-categories');
  if (path.startsWith('/api/accounts/asset-categories')) return pages.has('/accounts/asset-categories');
  if (path.startsWith('/api/accounts')) return pages.has('/accounts') || Boolean(perms.accounts?.read);
  if (path.startsWith('/api/service-types')) return pages.has('/clients/service-types');
  if (path.startsWith('/api/project-stages')) return pages.has('/clients/project-stages');
  if (path.startsWith('/api/staff')) return pages.has('/hr/staff');
  if (path.startsWith('/api/hr/offer-letter-templates')) return pages.has('/hr/offer-letter-templates') || pages.has('/hr/offer-letters') || pages.has('/hr/roles');
  if (path.startsWith('/api/hr/offer-letters')) return pages.has('/hr/offer-letters');
  if (path.startsWith('/api/hr/staff-attendance')) return pages.has('/hr/attendance');
  if (path.startsWith('/api/hr/leave-types')) return pages.has('/hr/leave-types') || (req.method === 'GET' && pages.has('/hr/leave'));
  if (path.startsWith('/api/hr/leave')) return pages.has('/hr/leave');
  if (path.startsWith('/api/hr/branches')) return pages.has('/hr/branches');
  if (path.startsWith('/api/hr/shifts')) return pages.has('/hr/shifts');
  if (path.startsWith('/api/salary-structures')) return pages.has('/hr/salary');
  if (path.startsWith('/api/hr/advances')) return pages.has('/hr/advances');
  if (path.startsWith('/api/hr/adjustments')) return pages.has('/hr/adjustments');
  if (path.startsWith('/api/hr/payroll')) return pages.has('/hr/payroll');
  return false;
}

/**
 * Role-Based Access Control middleware generator
 * @param {Array<string>} allowedRoles List of roles permitted to access endpoint
 */
export const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    // Ensure req.user is populated
    if (!req.user) {
      await authenticateUser(req, res, () => {});
      if (res.headersSent) return;
    }

    const currentRole = req.user?.role || ROLES.STAFF;

    // Admin has super-privilege access across all modules
    if (currentRole === ROLES.ADMIN) {
      return next();
    }

    // Built-in role explicitly in allowed list
    if (allowedRoles.includes(currentRole)) {
      return next();
    }

    // Dynamic permission check for custom DB-defined roles
    if (req.user?.isCustomRole && customRoleAllowsEndpoint(req, req.user)) {
      return next();
    }

    // Role does not satisfy requirement -> Return standard HTTP 403 Forbidden
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'RBAC_ACCESS_RESTRICTED',
      message: `Access restricted: Role '${currentRole}' is not authorized to access this resource.`,
      requiredRoles: allowedRoles,
      currentRole: currentRole,
      endpoint: req.originalUrl || req.url,
      method: req.method
    });
  };
};
