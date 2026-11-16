import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ROLES, RBAC_PERMISSIONS, generateToken, normalizeRole, JWT_SECRET } from '../middleware/rbac.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Validates credentials against MongoDB with bcrypt, returns signed JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const identifier = (email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email/username and password are required.'
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
        message: 'Invalid email/username or password.'
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Account has been deactivated. Please contact administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid email/username or password.'
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    const role = normalizeRole(user.role || user.accessLevel);
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
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        role: role,
        accessLevel: role,
        permissions: RBAC_PERMISSIONS[role] || RBAC_PERMISSIONS[ROLES.STAFF]
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
    let rawToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.slice(7).trim();
    } else if (req.headers?.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)tessly_jwt=([^;]+)/);
      if (match) rawToken = decodeURIComponent(match[1]);
    } else if (req.body?.token) {
      rawToken = req.body.token;
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

    // Verify user is active if in database
    if (decoded.id && decoded.id !== 'u1') {
      try {
        const user = await User.findById(decoded.id);
        if (user && user.active === false) {
          res.clearCookie('tessly_jwt');
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            code: 'ACCOUNT_DEACTIVATED',
            message: 'Account has been deactivated. Please contact administrator.'
          });
        }
      } catch (err) {}
    }

    const role = normalizeRole(decoded.role || decoded.accessLevel);
    const renewedUser = {
      _id: decoded.id || 'u1',
      username: decoded.username || 'user',
      name: decoded.name || 'User',
      email: decoded.email || '',
      role: role,
      accessLevel: role
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
      expiresIn: 24 * 60 * 60 * 1000,
      user: {
        id: renewedUser._id,
        username: renewedUser.username,
        email: renewedUser.email,
        name: renewedUser.name,
        role: role,
        accessLevel: role,
        permissions: RBAC_PERMISSIONS[role] || RBAC_PERMISSIONS[ROLES.STAFF]
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
 * GET /api/auth/me
 * Returns current authenticated user and permissions
 */
router.get('/me', (req, res) => {
  const user = req.user || {
    id: 'u1',
    name: 'Authenticated User',
    role: ROLES.ADMIN,
    accessLevel: ROLES.ADMIN,
    permissions: RBAC_PERMISSIONS[ROLES.ADMIN]
  };

  res.status(200).json({
    success: true,
    user: {
      id: user.id || user._id,
      name: user.name,
      email: user.email || '',
      role: user.role,
      accessLevel: user.accessLevel || user.role,
      tokenValidated: !!user.tokenValidated,
      permissions: user.permissions || RBAC_PERMISSIONS[user.role]
    }
  });
});

/**
 * GET /api/auth/roles
 * Returns full RBAC roles and permissions matrix
 */
router.get('/roles', (req, res) => {
  res.status(200).json({
    success: true,
    roles: Object.values(ROLES),
    matrix: RBAC_PERMISSIONS,
    descriptions: {
      [ROLES.ADMIN]: 'Super-administrator with full access to all modules, masters, financial records, salary, payroll and platform settings.',
      [ROLES.MANAGER]: 'Operational manager with access to workspace, deals, clients, basic HR (attendance/leaves/shifts), accounts and reports.',
      [ROLES.STAFF]: 'Frontline staff member with access strictly restricted to sales desk workspace (dashboard, deals, clients, calendar, inbox).'
    }
  });
});

export default router;
