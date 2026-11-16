import express from 'express';
import { listProjectStages, getProjectStage, createProjectStage, updateProjectStage, deleteProjectStage } from '../controllers/projectStageController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();
router.get('/', requireRole([ROLES.ADMIN, ROLES.MANAGER]), listProjectStages);
router.get('/:id', requireRole([ROLES.ADMIN, ROLES.MANAGER]), getProjectStage);
router.post('/', requireRole([ROLES.ADMIN]), createProjectStage);
router.put('/:id', requireRole([ROLES.ADMIN]), updateProjectStage);
router.delete('/:id', requireRole([ROLES.ADMIN]), deleteProjectStage);
export default router;
