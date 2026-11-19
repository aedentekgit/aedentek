import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  getNextNumber,
  resetInvoices,
} from '../controllers/invoiceController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireRole([ROLES.ADMIN, ROLES.MANAGER]));

router.get('/', getInvoices);
router.get('/next-number', getNextNumber);
router.post('/reset', requireRole([ROLES.ADMIN]), resetInvoices);
router.get('/:id', getInvoiceById);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.post('/:id/payment', recordPayment);

export default router;

