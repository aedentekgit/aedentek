import { Router } from 'express';
import {
  getAllTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  setDefaultTaxRate,
} from '../controllers/gstTaxRateController.js';

const router = Router();

router.route('/')
  .get(getAllTaxRates)
  .post(createTaxRate);

router.post('/:id/default', setDefaultTaxRate);

router.route('/:id')
  .get(getTaxRateById)
  .put(updateTaxRate)
  .delete(deleteTaxRate);

export default router;

