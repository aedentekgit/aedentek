import express from 'express';
import {
  getAllRoles,
  getRoleOptions,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/roleController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();

// Dropdown options for HR Employee form (Admin sees all; Manager sees non-Admin roles)
router.get('/options', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getRoleOptions);

// Full Role Management CRUD is strictly Admin-only
router.get('/', requireRole([ROLES.ADMIN]), getAllRoles);
router.get('/:id', requireRole([ROLES.ADMIN]), getRoleById);
router.post('/', requireRole([ROLES.ADMIN]), createRole);
router.put('/:id', requireRole([ROLES.ADMIN]), updateRole);
router.delete('/:id', requireRole([ROLES.ADMIN]), deleteRole);

export default router;
