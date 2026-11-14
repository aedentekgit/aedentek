import { Router } from 'express';
import { listProfiles, createProfile, updateProfile, deleteProfile, setDefaultProfile } from '../controllers/settingsProfileController.js';

const router = Router();
router.route('/').get(listProfiles).post(createProfile);
router.post('/:id/default', setDefaultProfile);
router.route('/:id').put(updateProfile).delete(deleteProfile);
export default router;
