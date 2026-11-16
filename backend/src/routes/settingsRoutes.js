import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getSection,
  updateSection,
  resetSettings,
} from '../controllers/settingsController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = Router();

// Master settings endpoints — Restricted strictly to Administrator
router.use(requireRole([ROLES.ADMIN]));

router.route('/')
  .get(getSettings)
  .put(updateSettings);

// Reset to clean non-static defaults
router.post('/reset', resetSettings);

// Single section endpoints (e.g. /api/settings/theme, /api/settings/invoiceSender)
router.route('/:section')
  .get(getSection)
  .put(updateSection)
  .patch(updateSection);

export default router;

