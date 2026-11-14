import express from 'express';
import { listServiceTypes, getServiceType, createServiceType, updateServiceType, deleteServiceType } from '../controllers/serviceTypeController.js';

const router = express.Router();
router.get('/', listServiceTypes);
router.get('/:id', getServiceType);
router.post('/', createServiceType);
router.put('/:id', updateServiceType);
router.delete('/:id', deleteServiceType);
export default router;
