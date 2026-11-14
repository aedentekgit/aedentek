import express from 'express';
import { listProjectStages, getProjectStage, createProjectStage, updateProjectStage, deleteProjectStage } from '../controllers/projectStageController.js';

const router = express.Router();
router.get('/', listProjectStages);
router.get('/:id', getProjectStage);
router.post('/', createProjectStage);
router.put('/:id', updateProjectStage);
router.delete('/:id', deleteProjectStage);
export default router;
