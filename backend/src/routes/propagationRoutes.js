import express from 'express';
import {
  getPropagations,
  getPropagationById,
  createPropagation,
  updatePropagation,
  deletePropagation,
  convertPropagationToInvoice,
  resetPropagations,
} from '../controllers/propagationController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireRole([ROLES.ADMIN, ROLES.MANAGER]));

router.get('/', getPropagations);
router.post('/reset', requireRole([ROLES.ADMIN]), resetPropagations);
router.get('/:id', getPropagationById);
router.post('/', createPropagation);
router.put('/:id', updatePropagation);
router.delete('/:id', deletePropagation);
router.post('/:id/convert', convertPropagationToInvoice);

export default router;

