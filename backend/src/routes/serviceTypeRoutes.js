import express from 'express';
import { listServiceTypes, getServiceType, createServiceType, updateServiceType, deleteServiceType } from '../controllers/serviceTypeController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();
router.get('/', requireRole([ROLES.ADMIN, ROLES.MANAGER]), listServiceTypes);
router.get('/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getServiceType);
router.post('/', requireRole([ROLES.ADMIN]), createServiceType);
router.put('/:id', requireRole([ROLES.ADMIN]), updateServiceType);
router.delete('/:id', requireRole([ROLES.ADMIN]), deleteServiceType);
export default router;
