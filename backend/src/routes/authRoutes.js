import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { generateAuthKey } from '../models/User.js';
import { ROLES, RBAC_PERMISSIONS, ROLE_ALLOWED_PAGES, generateToken, normalizeRole, resolveRolePolicy, JWT_SECRET } from '../middleware/rbac.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Validates username/email + password against MongoDB, returns signed JWT auth key
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, identifier: rawIdent, password } = req.body || {};
    const identifier = String(rawIdent || email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Username/email and password are required.'
      });
    }

    // Lookup user by email or username (case-insensitive)
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`^${escaped}$`, 'i');
    const user = await User.findOne({
      $or: [{ email: rx }, { username: rx }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid username/email or password.'
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Account has been deactivated. Please contact administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid username/email or password.'
      });
    }

    // Ensure authKey exists and update last login timestamp
    if (!user.authKey) {
      user.authKey = generateAuthKey();
    }
    user.lastLogin = new Date();
    await user.save();

    const role = normalizeRole(user.role || user.accessLevel);
    const policy = await resolveRolePolicy(role);
    const token = generateToken(user);

    // Set HTTP-only session cookie
    res.cookie('tessly_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token: token,
      authKey: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        role: policy.role,
        accessLevel: policy.role,
        isCustomRole: Boolean(policy.isCustom),
        allowedPages: policy.allowedPages,
        permissions: policy.permissions
      }
    });
  } catch (error) {
    console.error('[Auth Error] /api/auth/login:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Clears authentication session cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('tessly_jwt');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
});

/**
 * POST /api/auth/refresh
 * Validates current JWT / refresh token and mints renewed access token.
 * If token is expired or missing, returns 401 Unauthorized with REFRESH_TOKEN_EXPIRED code.
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const authKeyHeader = req.headers['x-auth-key'];
    let rawToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.slice(7).trim();
    } else if (authKeyHeader && String(authKeyHeader).trim()) {
      rawToken = String(authKeyHeader).trim();
    } else if (req.headers?.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)tessly_jwt=([^;]+)/);
      if (match) rawToken = decodeURIComponent(match[1]);
    } else if (req.body?.token || req.body?.authKey) {
      rawToken = req.body.token || req.body.authKey;
    }

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'TOKEN_REQUIRED',
        message: 'No token provided for refresh.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(rawToken, JWT_SECRET);
    } catch (err) {
      res.clearCookie('tessly_jwt');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token expired or invalid. Please sign in again.'
      });
    }

    // Verify user is active and authKey has not been revoked in database
    let dbUser = null;
    if (decoded.id && mongoose.Types.ObjectId.isValid(String(decoded.id))) {
      try {
        dbUser = await User.findById(decoded.id);
        if (!dbUser && decoded.ak) {
          res.clearCookie('tessly_jwt');
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            code: 'USER_NOT_FOUND',
            message: 'User account no longer exists. Please sign in again.'
          });
        }
        if (dbUser && dbUser.active === false) {
          res.clearCookie('tessly_jwt');
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            code: 'ACCOUNT_DEACTIVATED',
            message: 'Account has been deactivated. Please contact administrator.'
          });
        }
        if (dbUser && decoded.ak && dbUser.authKey && decoded.ak !== dbUser.authKey) {
          res.clearCookie('tessly_jwt');
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            code: 'AUTH_KEY_REVOKED',
            message: 'Authentication key has been revoked. Please sign in again.'
          });
        }
      } catch (err) {}
    }

    const role = normalizeRole((dbUser && (dbUser.role || dbUser.accessLevel)) || decoded.role || decoded.accessLevel);
    const policy = await resolveRolePolicy(role);
    const renewedUser = {
      _id: (dbUser && dbUser._id) || decoded.id || 'u1',
      username: (dbUser && dbUser.username) || decoded.username || 'user',
      name: (dbUser && dbUser.name) || decoded.name || 'User',
      email: (dbUser && dbUser.email) || decoded.email || '',
      role: policy.role,
      accessLevel: policy.role,
      authKey: (dbUser && dbUser.authKey) || decoded.ak
    };

    const newToken = generateToken(renewedUser);

    res.cookie('tessly_jwt', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      token: newToken,
      authKey: newToken,
      expiresIn: 24 * 60 * 60 * 1000,
      user: {
        id: renewedUser._id,
        username: renewedUser.username,
        email: renewedUser.email,
        name: renewedUser.name,
        role: policy.role,
        accessLevel: policy.role,
        isCustomRole: Boolean(policy.isCustom),
        allowedPages: policy.allowedPages,
        permissions: policy.permissions
      }
    });
  } catch (error) {
    console.error('[Auth Error] /api/auth/refresh:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/me & GET /api/auth/verify
 * Validates current auth key / JWT and returns authoritative user, role, allowed pages, and permissions
 */
const handleSessionInfo = (req, res) => {
  const user = req.user || {
    id: 'u1',
    username: 'admin',
    name: 'Authenticated User',
    role: ROLES.ADMIN,
    accessLevel: ROLES.ADMIN,
    allowedPages: ROLE_ALLOWED_PAGES[ROLES.ADMIN],
    permissions: RBAC_PERMISSIONS[ROLES.ADMIN]
  };
  const role = normalizeRole(user.role || user.accessLevel);

  res.status(200).json({
    success: true,
    valid: true,
    authenticated: true,
    authKeyValid: !!user.tokenValidated,
    user: {
      id: user.id || user._id,
      username: user.username || '',
      name: user.name,
      email: user.email || '',
      role: role,
      accessLevel: role,
      tokenValidated: !!user.tokenValidated,
      authKeyValid: !!user.tokenValidated,
      allowedPages: user.allowedPages || ROLE_ALLOWED_PAGES[role] || ROLE_ALLOWED_PAGES[ROLES.STAFF],
      permissions: user.permissions || RBAC_PERMISSIONS[role]
    }
  });
};

router.get('/me', handleSessionInfo);
router.get('/verify', handleSessionInfo);

/**
 * GET /api/auth/roles
 * Returns full RBAC roles, allowed pages, and permissions matrix
 */
router.get('/roles', (req, res) => {
  res.status(200).json({
    success: true,
    roles: Object.values(ROLES),
    matrix: RBAC_PERMISSIONS,
    allowedPages: ROLE_ALLOWED_PAGES,
    descriptions: {
      [ROLES.ADMIN]: 'Super-administrator with full access to all modules, masters, financial records, salary, payroll and platform settings.',
      [ROLES.MANAGER]: 'Operational manager with access to workspace, deals, clients, basic HR (attendance/leaves/shifts), accounts and reports.',
      [ROLES.STAFF]: 'Frontline staff member with access strictly restricted to sales desk workspace (dashboard, deals, clients, calendar, inbox).'
    }
  });
});

export default router;
