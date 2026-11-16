import express from 'express';
import {
  getChartOfAccounts, getJournalEntries, getJournalEntryById,
  getDashboard, getTrialBalance, getProfitAndLoss, getBalanceSheet, getGeneralLedgerReport
} from '../controllers/accounts/acctCoreController.js';
import {
  getAllSales, getSalesInvoiceById, createSalesInvoice, updateSalesInvoice,
  deleteSalesInvoice, collectPayment,
  getAllCreditNotes, createCreditNote, updateCreditNote, deleteCreditNote, applyCreditNote
} from '../controllers/accounts/acctSalesController.js';
import {
  getAllExpenses, createExpense, updateExpense, deleteExpense,
  getAllExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
  getAllStockInwards, getStockInwardById, createStockInward, updateStockInward, deleteStockInward
} from '../controllers/accounts/acctOpsController.js';
import {
  getAllAssets, createAsset, updateAsset, deleteAsset, depreciateAsset,
  getAllAssetCategories, createAssetCategory, updateAssetCategory, deleteAssetCategory,
  getAllJournalVouchers, createJournalVoucher, updateJournalVoucher, deleteJournalVoucher,
  postJournalVoucher, reverseJournalVoucher
} from '../controllers/accounts/acctAssetsController.js';
import {
  getBankingTransactions, getAllBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount,
  getAllBankTransfers, createBankTransfer, deleteBankTransfer
} from '../controllers/accounts/acctBankingController.js';

import { getAllEmis, calculateEmi, getEmiById, createEmi, updateEmi, payEmi, deleteEmi } from '../controllers/accounts/acctEmiController.js';

import { getInwardExpenses } from '../controllers/accounts/acctInwardExpenseController.js';
import { requireRole, ROLES } from '../middleware/rbac.js';

const router = express.Router();

// Role-based protection: Accounts module is restricted to Admin and Manager (Staff forbidden)
router.use(requireRole([ROLES.ADMIN, ROLES.MANAGER]));

// --- Chart of accounts & general ledger -----------------------------------
router.get('/chart-of-accounts', getChartOfAccounts);
router.get('/journal', getJournalEntries);
router.get('/journal/:id', getJournalEntryById);

// --- Dashboard & reports ---------------------------------------------------
router.get('/dashboard', getDashboard);
router.get('/reports/trial-balance', getTrialBalance);
router.get('/reports/profit-loss', getProfitAndLoss);
router.get('/reports/balance-sheet', getBalanceSheet);
router.get('/reports/general-ledger', getGeneralLedgerReport);

// --- 1. Sales ---------------------------------------------------------------
router.get('/sales', getAllSales);
router.get('/sales/:id', getSalesInvoiceById);
router.post('/sales', createSalesInvoice);
router.put('/sales/:id', updateSalesInvoice);
router.delete('/sales/:id', deleteSalesInvoice);
router.post('/sales/:id/collect', collectPayment);

// --- 6. Credit notes --------------------------------------------------------
router.get('/credit-notes', getAllCreditNotes);
router.post('/credit-notes', createCreditNote);
router.put('/credit-notes/:id', updateCreditNote);
router.delete('/credit-notes/:id', deleteCreditNote);
router.post('/credit-notes/:id/apply', applyCreditNote);

// --- Combined inward + expense list ------------------------------------------
router.get('/inward-expenses', getInwardExpenses);

// --- 3. Expenses ------------------------------------------------------------
router.get('/expenses', getAllExpenses);
router.post('/expenses', createExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

// --- 4. Expense categories --------------------------------------------------
router.get('/expense-categories', getAllExpenseCategories);
router.post('/expense-categories', createExpenseCategory);
router.put('/expense-categories/:id', updateExpenseCategory);
router.delete('/expense-categories/:id', deleteExpenseCategory);

// --- 5. Stock inward --------------------------------------------------------
// --- EMI plans (replaces the Stock Inward screen in the UI) ------------------
router.get('/emi', getAllEmis);
router.post('/emi/calculate', calculateEmi);
router.get('/emi/:id', getEmiById);
router.post('/emi', createEmi);
router.put('/emi/:id', updateEmi);
router.post('/emi/:id/pay', payEmi);
router.delete('/emi/:id', deleteEmi);

router.get('/stock-inward', getAllStockInwards);
router.get('/stock-inward/:id', getStockInwardById);
router.post('/stock-inward', createStockInward);
router.put('/stock-inward/:id', updateStockInward);
router.delete('/stock-inward/:id', deleteStockInward);

// --- 7. Asset records -------------------------------------------------------
router.get('/assets', getAllAssets);
router.post('/assets', createAsset);
router.put('/assets/:id', updateAsset);
router.delete('/assets/:id', deleteAsset);
router.post('/assets/:id/depreciate', depreciateAsset);

// --- 8. Asset categories ----------------------------------------------------
router.get('/asset-categories', getAllAssetCategories);
router.post('/asset-categories', createAssetCategory);
router.put('/asset-categories/:id', updateAssetCategory);
router.delete('/asset-categories/:id', deleteAssetCategory);

// --- 9. Adjustment entry / JV ----------------------------------------------
router.get('/adjustment-entry', getAllJournalVouchers);
router.post('/adjustment-entry', createJournalVoucher);
router.put('/adjustment-entry/:id', updateJournalVoucher);
router.delete('/adjustment-entry/:id', deleteJournalVoucher);
router.post('/adjustment-entry/:id/post', postJournalVoucher);
router.post('/adjustment-entry/:id/reverse', reverseJournalVoucher);

// --- 10. Banking & payments -------------------------------------------------
router.get('/banking/transactions', getBankingTransactions);
router.get('/banking/accounts', getAllBankAccounts);
router.post('/banking/accounts', createBankAccount);
router.put('/banking/accounts/:id', updateBankAccount);
router.delete('/banking/accounts/:id', deleteBankAccount);
router.get('/banking/transfers', getAllBankTransfers);
router.post('/banking/transfers', createBankTransfer);
router.delete('/banking/transfers/:id', deleteBankTransfer);

export default router;
