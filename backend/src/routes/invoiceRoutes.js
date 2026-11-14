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

const router = express.Router();

router.get('/', getInvoices);
router.get('/next-number', getNextNumber);
router.post('/reset', resetInvoices);
router.get('/:id', getInvoiceById);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.post('/:id/payment', recordPayment);

export default router;

