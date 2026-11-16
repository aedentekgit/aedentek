import express from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  addWebsite,
  deleteWebsite,
  updateWebsite,
  updateCredential,
  addCredential,
  deleteCredential,
  resetClients
} from '../controllers/clientController.js';
import {
  addProject, updateProject, deleteProject, updateInvoiceLink,
  addProjectStageEntry, updateProjectStageEntry, deleteProjectStageEntry,
  getBilling, saveBilling, clearBilling, addBillingRow, updateBillingRow, deleteBillingRow, getClientList,
  addDocument, updateDocument, deleteDocument,
  addSocial, updateSocial, deleteSocial
} from '../controllers/clientSubController.js';

const router = express.Router();

router.get('/', getAllClients);
router.post('/reset', resetClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);
router.post('/:id/websites', addWebsite);
router.put('/:id/websites/:webId', updateWebsite);
router.delete('/:id/websites/:webId', deleteWebsite);
router.post('/:id/social', addSocial);
router.put('/:id/social/:socId', updateSocial);
router.delete('/:id/social/:socId', deleteSocial);
router.post('/:id/credentials', addCredential);
router.put('/:id/credentials/:credId', updateCredential);
router.delete('/:id/credentials/:credId', deleteCredential);

router.post('/:id/projects', addProject);
router.put('/:id/projects/:projId', updateProject);
router.delete('/:id/projects/:projId', deleteProject);
router.post('/:id/projects/:projId/stages', addProjectStageEntry);
router.put('/:id/projects/:projId/stages/:entryId', updateProjectStageEntry);
router.delete('/:id/projects/:projId/stages/:entryId', deleteProjectStageEntry);
router.put('/:id/invoices/:invId', updateInvoiceLink);
router.get('/:id/billing', getBilling);
router.put('/:id/billing', saveBilling);
router.delete('/:id/billing', clearBilling);
router.post('/:id/billing/rows', addBillingRow);
router.put('/:id/billing/rows/:rowId', updateBillingRow);
router.delete('/:id/billing/rows/:rowId', deleteBillingRow);
router.get('/:id/lists/:name', getClientList);
router.post('/:id/documents', addDocument);
router.put('/:id/documents/:docId', updateDocument);
router.delete('/:id/documents/:docId', deleteDocument);

export default router;

