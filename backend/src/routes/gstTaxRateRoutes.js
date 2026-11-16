import { Router } from 'express';
import {
  getAllTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  setDefaultTaxRate,
} from '../controllers/gstTaxRateController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = Router();

router.route('/')
  .get(requireRole([ROLES.ADMIN, ROLES.MANAGER]), getAllTaxRates)
  .post(requireRole([ROLES.ADMIN]), createTaxRate);

router.post('/:id/default', requireRole([ROLES.ADMIN]), setDefaultTaxRate);

router.route('/:id')
  .get(requireRole([ROLES.ADMIN, ROLES.MANAGER]), getTaxRateById)
  .put(requireRole([ROLES.ADMIN]), updateTaxRate)
  .delete(requireRole([ROLES.ADMIN]), deleteTaxRate);

export default router;

