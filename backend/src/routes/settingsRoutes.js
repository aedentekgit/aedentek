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

// Sections every signed-in role needs to render the app: theme on every page, and the
// issuer / bank / GST details printed on invoices (Finance is open to Managers).
// SMTP, MSG91, OTP, Firebase and mobile-app sections hold credentials and stay Admin-only.
export const SHARED_SETTINGS_SECTIONS = ['theme', 'invoiceSender', 'bankDetails', 'gstSettings'];

const isAdmin = (req) => req.user?.role === ROLES.ADMIN;

// Non-admin reads: return only the shared sections from the full settings payload.
const readSettings = (req, res, next) => {
  if (isAdmin(req)) return getSettings(req, res, next);
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body && body.success && body.data) {
      const src = typeof body.data.toObject === 'function' ? body.data.toObject() : body.data;
      const data = {};
      for (const key of SHARED_SETTINGS_SECTIONS) if (src[key] !== undefined) data[key] = src[key];
      return json({ ...body, data });
    }
    return json(body);
  };
  return getSettings(req, res, next);
};

const readSection = (req, res, next) => {
  if (isAdmin(req) || SHARED_SETTINGS_SECTIONS.includes(req.params.section)) return getSection(req, res, next);
  return requireRole([ROLES.ADMIN])(req, res, next);
};

router.get('/', readSettings);

// Everything else (writes, reset, credential sections) is restricted to Administrator
router.get('/:section', readSection);
router.use(requireRole([ROLES.ADMIN]));

router.put('/', updateSettings);

// Reset to clean non-static defaults
router.post('/reset', resetSettings);

// Single section endpoints (e.g. /api/settings/theme, /api/settings/invoiceSender)
router.route('/:section')
  .put(updateSection)
  .patch(updateSection);

export default router;

