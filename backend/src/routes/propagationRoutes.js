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

const router = express.Router();

router.get('/', getPropagations);
router.post('/reset', resetPropagations);
router.get('/:id', getPropagationById);
router.post('/', createPropagation);
router.put('/:id', updatePropagation);
router.delete('/:id', deletePropagation);
router.post('/:id/convert', convertPropagationToInvoice);

export default router;

