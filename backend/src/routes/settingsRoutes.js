import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getSection,
  updateSection,
  resetSettings,
} from '../controllers/settingsController.js';

const router = Router();

// Master settings endpoints
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

