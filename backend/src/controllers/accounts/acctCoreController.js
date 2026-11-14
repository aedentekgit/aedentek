import Account from '../../models/accounts/Account.js';
import JournalEntry from '../../models/accounts/JournalEntry.js';
import SalesInvoice from '../../models/accounts/SalesInvoice.js';
import Expense from '../../models/accounts/Expense.js';
import CreditNote from '../../models/accounts/CreditNote.js';
import StockInward from '../../models/accounts/StockInward.js';
import Emi from '../../models/accounts/Emi.js';
import { progressOf } from '../../utils/emiEngine.js';
import Asset from '../../models/accounts/Asset.js';
import JournalVoucher from '../../models/accounts/JournalVoucher.js';
import BankAccount from '../../models/accounts/BankAccount.js';
import BankTransfer from '../../models/accounts/BankTransfer.js';
import {
  CHART_OF_ACCOUNTS, loadLedger, buildTrialBalance, buildProfitAndLoss,
  buildBalanceSheet, buildGeneralLedgerBook, buildMonthlyTrends,
  aggregateByAccount, netBalance, round2
} from '../../utils/accountsEngine.js';

// ---------------------------------------------------------------------------
// GET /api/accounts/chart-of-accounts
// ---------------------------------------------------------------------------
export const getChartOfAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find().sort({ code: 1 });
    const list = accounts.length ? accounts : CHART_OF_ACCOUNTS;
    return res.status(200).json({
      success: true,
      message: 'Chart of accounts retrieved successfully',
      data: list
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/accounts/journal  — the General Ledger book
// ---------------------------------------------------------------------------
export const getJournalEntries = async (req, res, next) => {
  try {
    const { from, to, account, sourceModule, branch, q } = req.query;
    const entries = await loadLedger({ from, to, branch });

    const filtered = entries.filter((e) => {
      if (sourceModule && e.sourceModule !== sourceModule) return false;
      if (account) {
        const hit = (e.lines || []).some((l) => l.accountCode === account);
        if (!hit) return false;
      }
      if (q && q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = `${e.entryNumber} ${e.description} ${e.reference}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    const book = buildGeneralLedgerBook(filtered, { account });
    return res.status(200).json({
      success: true,
      message: 'General ledger retrieved successfully',
      data: book.rows,
      totals: book.totals
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/accounts/journal/:id
// ---------------------------------------------------------------------------
export const getJournalEntryById = async (req, res, next) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Journal entry retrieved successfully',
      data: entry
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// Cost of goods sold derived from stock-backed sales lines
// ---------------------------------------------------------------------------
const computeCogs = async (invoices) => {
  const inwards = await StockInward.find();
  const costBySku = new Map();
  for (const inward of inwards) {
    for (const item of inward.items || []) {
      if (item.sku) costBySku.set(item.sku, Number(item.unitCost) || 0);
    }
  }
  let cogs = 0;
  for (const invoice of invoices) {
    for (const item of invoice.items || []) {
      if (!item.stockRef) continue;
      const unitCost = costBySku.get(item.stockRef);
      if (unitCost === undefined) continue;
      cogs += unitCost * (Number(item.quantity) || 0);
    }
  }
  return round2(cogs);
};

// ---------------------------------------------------------------------------
// GET /api/accounts/dashboard
// ---------------------------------------------------------------------------
export const getDashboard = async (req, res, next) => {
  try {
    const { branch, from, to } = req.query;
    const inScope = (doc) =>
      !branch || branch === 'All Branches' || doc.branch === branch;

    const [invoices, expenses, credits, assets, vouches, bankAccounts, inwards] = await Promise.all([
      SalesInvoice.find().sort({ createdAt: -1 }),
      Expense.find().sort({ date: -1 }),
      CreditNote.find(),
      Asset.find(),
      JournalVoucher.find(),
      BankAccount.find(),
      StockInward.find()
    ]);

    // Optional date window (header date filter). Dated documents are windowed;
    // fixed assets and bank balances are point-in-time figures and are not.
    const inRange = (value) => {
      const d = String(value || '');
      return (!from || d >= from) && (!to || d <= to);
    };
    const scopedInvoices = invoices.filter(inScope).filter((i) => inRange(i.invoiceDate));
    const scopedExpenses = expenses.filter(inScope).filter((e) => inRange(e.date));
    const scopedCredits = credits.filter(inScope).filter((c) => inRange(c.date || c.creditDate || c.issueDate || (c.createdAt && new Date(c.createdAt).toISOString().slice(0, 10))));
    const scopedAssets = assets.filter(inScope);
    const scopedVouches = vouches.filter(inScope);
    const scopedInwards = inwards.filter(inScope).filter((i) => inRange(i.date));
    const scopedBankAccounts = bankAccounts.filter(inScope);

    const totalSales = round2(scopedInvoices
      .filter((i) => i.status !== 'Cancelled' && i.status !== 'Draft')
      .reduce((s, i) => s + (Number(i.grandTotal) || 0), 0));
    const totalExpenses = round2(scopedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0));
    const totalReceivables = round2(scopedInvoices.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0));
    const totalCredits = round2(scopedCredits
      .filter((c) => c.status !== 'Cancelled' && c.status !== 'Draft')
      .reduce((s, c) => s + (Number(c.totalCredit) || 0), 0));
    const totalAssets = round2(scopedAssets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0));
    const netBookValue = round2(scopedAssets.reduce((s, a) => s + (Number(a.currentValue) || 0), 0));

    const pettyCash = scopedBankAccounts.filter((a) => a.accountType === 'Petty Cash');
    const commercial = scopedBankAccounts.filter((a) => a.accountType !== 'Petty Cash');
    const cashBalance = round2(pettyCash.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0));
    const bankBalance = round2(commercial.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0));

    const entries = await loadLedger({ from, to, branch });

    // Net profit is an income-statement figure, not "all credits minus all
    // debits" — the latter would net off balance-sheet accounts and always
    // land on zero. Reuse the P&L engine so both agree.
    const cogs = await computeCogs(scopedInvoices);
    const { netProfit } = buildProfitAndLoss(entries, { cogs });

    // Expense distribution by category
    const byCategory = new Map();
    for (const expense of scopedExpenses) {
      byCategory.set(expense.category, round2((byCategory.get(expense.category) || 0) + (Number(expense.amount) || 0)));
    }
    const expenseMix = [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return res.status(200).json({
      success: true,
      message: 'Accounts dashboard retrieved successfully',
      data: {
        kpis: {
          totalSales,
          totalExpenses,
          totalReceivables,
          totalCredits,
          totalAssets,
          netBookValue,
          cashBalance,
          bankBalance,
          netProfit
        },
        pending: {
          salesInvoices: scopedInvoices.filter((i) => i.status === 'Draft').length,
          payments: scopedInvoices.filter((i) => i.status === 'Partially Paid' || i.status === 'Overdue').length,
          expenses: scopedExpenses.length,
          journalVouchers: scopedVouches.filter((v) => v.status !== 'Posted' && v.status !== 'Reversed').length,
          creditNotes: scopedCredits.filter((c) => c.status === 'Draft' || c.status === 'Approved').length,
          stockInwards: scopedInwards.length,
          activeEmis: (await Emi.find()).filter((e) => (!branch || branch === 'All Branches' || e.branch === branch) && progressOf(e).status !== 'Completed').length
        },
        trends: buildMonthlyTrends(entries, { months: 6 }),
        expenseMix
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/accounts/reports/trial-balance
// ---------------------------------------------------------------------------
export const getTrialBalance = async (req, res, next) => {
  try {
    const { asOf, branch } = req.query;
    const entries = await loadLedger({ to: asOf, branch });
    const report = buildTrialBalance(entries);
    return res.status(200).json({
      success: true,
      message: 'Trial balance retrieved successfully',
      data: report
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/accounts/reports/profit-loss
// ---------------------------------------------------------------------------
export const getProfitAndLoss = async (req, res, next) => {
  try {
    const { from, to, branch } = req.query;
    const entries = await loadLedger({ from, to, branch });
    const invoices = await SalesInvoice.find();
    const cogs = await computeCogs(
      invoices.filter((i) => !branch || branch === 'All Branches' || i.branch === branch)
    );
    const report = buildProfitAndLoss(entries, { cogs });
    return res.status(200).json({
      success: true,
      message: 'Profit and loss retrieved successfully',
      data: report
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/accounts/reports/balance-sheet
// ---------------------------------------------------------------------------
export const getBalanceSheet = async (req, res, next) => {
  try {
    const { asOf, from, to, branch } = req.query;
    const entries = await loadLedger({ to: asOf, branch });
    const periodEntries = await loadLedger({ from, to, branch });
    const periodProfit = buildProfitAndLoss(periodEntries).netProfit;
    const report = buildBalanceSheet(entries, { periodProfit });
    return res.status(200).json({
      success: true,
      message: 'Balance sheet retrieved successfully',
      data: report
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/accounts/reports/general-ledger
// ---------------------------------------------------------------------------
export const getGeneralLedgerReport = async (req, res, next) => {
  try {
    const { from, to, account, branch } = req.query;
    const entries = await loadLedger({ from, to, branch });
    const report = buildGeneralLedgerBook(entries, { account });
    return res.status(200).json({
      success: true,
      message: 'General ledger book retrieved successfully',
      data: report
    });
  } catch (error) {
    return next(error);
  }
};
