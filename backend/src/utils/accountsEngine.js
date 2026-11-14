/**
 * ACCOUNTS ENGINE
 * ------------------------------------------------------------------
 * The double-entry accounting core. Every business module posts balanced
 * journal lines through postJournal(); the four financial statements are
 * pure aggregations over the resulting General Ledger.
 *
 *   postJournal()  → GeneralLedger → Trial Balance / P&L / Balance Sheet / GL Book
 */
import JournalEntry from '../models/accounts/JournalEntry.js';

// ---------------------------------------------------------------------
// Chart of Accounts
// ---------------------------------------------------------------------
export const CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Cash & Bank Master', type: 'Asset', normalBalance: 'Debit', group: 'Liquid Assets' },
  { code: '1010', name: 'Cash on Hand / Petty Cash', type: 'Asset', normalBalance: 'Debit', group: 'Liquid Assets' },
  { code: '1020', name: 'Commercial Bank Accounts', type: 'Asset', normalBalance: 'Debit', group: 'Liquid Assets' },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'Debit', group: 'Receivables' },
  { code: '1300', name: 'Merchandise & Supplements Inventory', type: 'Asset', normalBalance: 'Debit', group: 'Inventory' },
  { code: '1500', name: 'Gym Equipment & Fixed Assets', type: 'Asset', normalBalance: 'Debit', group: 'Fixed Assets' },
  { code: '1600', name: 'Accumulated Depreciation', type: 'Asset', normalBalance: 'Credit', group: 'Fixed Assets' },
  { code: '2000', name: 'Accounts Payable (Vendors)', type: 'Liability', normalBalance: 'Credit', group: 'Payables' },
  { code: '2100', name: 'Unearned Membership Revenue', type: 'Liability', normalBalance: 'Credit', group: 'Liabilities' },
  { code: '2200', name: 'Sales Tax / GST Payable', type: 'Liability', normalBalance: 'Credit', group: 'Liabilities' },
  { code: '3000', name: "Owner's Equity & Retained Earnings", type: 'Equity', normalBalance: 'Credit', group: 'Equity' },
  { code: '4000', name: 'Sales Revenue (Retail POS)', type: 'Revenue', normalBalance: 'Credit', group: 'Revenue' },
  { code: '4050', name: 'Cost of Goods Sold', type: 'COGS', normalBalance: 'Debit', group: 'Cost of Sales' },
  { code: '4100', name: 'Membership Plan Revenue', type: 'Revenue', normalBalance: 'Credit', group: 'Revenue' },
  { code: '4200', name: 'Personal Training Revenue', type: 'Revenue', normalBalance: 'Credit', group: 'Revenue' },
  { code: '4900', name: 'Sales Returns & Credit Notes', type: 'Contra Revenue', normalBalance: 'Debit', group: 'Contra Revenue' },
  { code: '5000', name: 'Operating Expenses (OPEX)', type: 'Expense', normalBalance: 'Debit', group: 'Expenses' },
  { code: '5100', name: 'Rent Expense', type: 'Expense', normalBalance: 'Debit', group: 'Expenses' },
  { code: '5200', name: 'Electricity & Utilities', type: 'Expense', normalBalance: 'Debit', group: 'Expenses' },
  { code: '5300', name: 'Maintenance & Repairs', type: 'Expense', normalBalance: 'Debit', group: 'Expenses' },
  { code: '5400', name: 'Marketing & Advertising', type: 'Expense', normalBalance: 'Debit', group: 'Expenses' },
  { code: '5500', name: 'Staff Salaries & Payroll', type: 'Expense', normalBalance: 'Debit', group: 'Expenses' },
  { code: '5600', name: 'Depreciation Expense', type: 'Expense', normalBalance: 'Debit', group: 'Expenses' }
];

export const ACCOUNT_MAP = new Map(CHART_OF_ACCOUNTS.map((a) => [a.code, a]));

/** Cash-side account for a payment mode. */
export const CASH_ACCOUNT_FOR_MODE = {
  Cash: '1010',
  'Petty Cash': '1010',
  Card: '1020',
  'Credit Card': '1020',
  'Bank Transfer': '1020',
  UPI: '1020',
  Cheque: '1020'
};

export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const isCashMode = (mode) => ['Cash', 'Petty Cash'].includes(mode);

// ---------------------------------------------------------------------
// Entry numbering
// ---------------------------------------------------------------------
/**
 * Next sequential document number for a prefix, e.g. 'INV' -> 'INV-000007'.
 */
export const nextEntryNumber = async (Model, prefix, field = 'entryNumber') => {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const latest = await Model.find({ [field]: pattern }).sort({ [field]: -1 }).limit(1);
  const last = latest[0]?.[field] || `${prefix}-000000`;
  const seq = Number(String(last).slice(prefix.length + 1)) + 1;
  return `${prefix}-${String(seq).padStart(6, '0')}`;
};

// ---------------------------------------------------------------------
// Journal posting
// ---------------------------------------------------------------------
/**
 * Post a balanced journal entry to the General Ledger.
 *
 * @param {object} p
 * @param {string} p.date           YYYY-MM-DD
 * @param {string} p.description    Narration
 * @param {string} p.sourceModule   Sales | Expenses | StockInward | CreditNote | Assets | AdjustmentEntry | Banking | Payroll
 * @param {string} p.sourceId       Document id
 * @param {string} p.reference      Human-readable document reference
 * @param {string} p.branch
 * @param {Array}  p.lines          [{ accountCode, debit, credit }]
 * @returns {Promise<import('mongoose').Document>}
 */
export const postJournal = async ({
  date, description, sourceModule = 'Manual', sourceId = '', reference = '', branch = 'All Branches', lines = []
}) => {
  const cleaned = lines
    .map((l) => ({
      accountCode: String(l.accountCode || '').trim(),
      accountName: ACCOUNT_MAP.get(String(l.accountCode || '').trim())?.name || l.accountName || '',
      debit: round2(l.debit),
      credit: round2(l.credit)
    }))
    .filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));

  if (!cleaned.length) {
    const err = new Error('A journal entry needs at least one line with a non-zero amount');
    err.statusCode = 400;
    throw err;
  }

  const totalDebit = round2(cleaned.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(cleaned.reduce((s, l) => s + l.credit, 0));

  // The fundamental accounting rule.
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    const err = new Error(
      `Unbalanced entry rejected! Total Debit (${totalDebit}) must equal Total Credit (${totalCredit}).`
    );
    err.statusCode = 400;
    throw err;
  }

  const entryNumber = await nextEntryNumber(JournalEntry, 'GL');
  return JournalEntry.create({
    entryNumber,
    date,
    description,
    sourceModule,
    sourceId: sourceId ? String(sourceId) : '',
    reference,
    branch,
    lines: cleaned,
    totalDebit,
    totalCredit,
    balanced: true,
    postedAt: new Date().toISOString()
  });
};

/**
 * Reverse an existing GL entry by writing an offsetting contra entry.
 * The original entry is never altered — only linked.
 */
export const reverseJournalEntry = async (entry, { reason = 'Reversal', branch, date } = {}) => {
  const contra = await postJournal({
    date: date || new Date().toISOString().slice(0, 10),
    description: `Reversal of ${entry.entryNumber} — ${reason}`,
    sourceModule: entry.sourceModule,
    // The contra entry carries its own source id so it is never mistaken for
    // the source document's own entry (which would make a later replace or
    // delete reverse the reversal).
    sourceId: entry.sourceId ? `${entry.sourceId}#rev` : '',
    reference: entry.reference,
    branch: branch || entry.branch,
    lines: entry.lines.map((l) => ({
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: l.credit,
      credit: l.debit
    }))
  });
  entry.reversedBy = contra.entryNumber;
  await entry.save();
  return contra;
};

/**
 * Replace the GL entry for a given source document: reverse the previous one
 * (if any) and post a fresh one. Used on every update so the ledger never
 * double-counts.
 */
export const replaceJournalForSource = async (sourceModule, sourceId, payload) => {
  const existing = await JournalEntry.find({ sourceModule, sourceId });
  for (const entry of existing) {
    if (!entry.reversedBy) await reverseJournalEntry(entry, { reason: 'Document updated' });
  }
  return postJournal(payload);
};

/** Remove the GL entries belonging to a document (used when the document is deleted). */
export const removeJournalForSource = async (sourceModule, sourceId, { sourceIdPrefix = false } = {}) => {
  const query = sourceIdPrefix
    ? { sourceModule, sourceId: new RegExp(`^${String(sourceId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }
    : { sourceModule, sourceId };
  const entries = await JournalEntry.find(query);
  for (const entry of entries) {
    if (!entry.reversedBy) await reverseJournalEntry(entry, { reason: 'Document deleted' });
  }
  return entries.length;
};

// ---------------------------------------------------------------------
// Depreciation engine
// ---------------------------------------------------------------------
/**
 * Annual depreciation for an asset.
 *  Straight Line      : (purchaseCost − salvageValue) / usefulLifeYears
 *  Reducing Balance  : currentValue × (depreciationRate / 100)
 */
export const annualDepreciation = (asset) => {
  const cost = Number(asset?.purchaseCost) || 0;
  const salvage = Number(asset?.salvageValue) || 0;
  const life = Number(asset?.usefulLifeYears) || 0;
  const rate = Number(asset?.depreciationRate) || 0;

  if (asset?.depreciationMethod === 'Reducing Balance') {
    return round2((Number(asset?.currentValue) || 0) * (rate / 100));
  }
  if (life <= 0) return 0;
  return round2(Math.max(0, (cost - salvage) / life));
};

/** Book value never falls below the salvage value. */
export const bookValue = (asset) => {
  const cost = Number(asset?.purchaseCost) || 0;
  const salvage = Number(asset?.salvageValue) || 0;
  const accumulated = Number(asset?.accumulatedDepreciation) || 0;
  return round2(Math.max(salvage, cost - accumulated));
};

// ---------------------------------------------------------------------
// Ledger aggregation helpers
// ---------------------------------------------------------------------
/**
 * Sum every journal line by account code.
 * @returns {Map<string, {debit:number, credit:number}>}
 */
export const aggregateByAccount = (entries) => {
  const map = new Map();
  for (const entry of entries) {
    for (const line of entry.lines || []) {
      const key = line.accountCode;
      if (!map.has(key)) map.set(key, { debit: 0, credit: 0 });
      const bucket = map.get(key);
      bucket.debit = round2(bucket.debit + (Number(line.debit) || 0));
      bucket.credit = round2(bucket.credit + (Number(line.credit) || 0));
    }
  }
  return map;
};

/** Net (debit − credit) balance for one account code. */
export const netBalance = (map, code) => {
  const bucket = map.get(code);
  if (!bucket) return 0;
  return round2(bucket.debit - bucket.credit);
};

/**
 * Balance signed by the account's normal balance, so a liability reads as a
 * positive number when it has a credit balance.
 */
export const signedBalance = (map, code) => {
  const bucket = map.get(code) || { debit: 0, credit: 0 };
  const normal = ACCOUNT_MAP.get(code)?.normalBalance || 'Debit';
  return normal === 'Credit'
    ? round2(bucket.credit - bucket.debit)
    : round2(bucket.debit - bucket.credit);
};

const inRange = (date, from, to) => {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

const branchFilter = (branch) => (entry) =>
  !branch || branch === 'All Branches' || entry.branch === branch;

/**
 * Load the ledger for a date/branch window.
 */
export const loadLedger = async ({ from, to, branch } = {}) => {
  const query = {};
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }
  const entries = await JournalEntry.find(query).sort({ date: 1, entryNumber: 1 });
  return branch && branch !== 'All Branches' ? entries.filter(branchFilter(branch)) : entries;
};

// ---------------------------------------------------------------------
// 1. Trial Balance
// ---------------------------------------------------------------------
export const buildTrialBalance = (entries) => {
  const map = aggregateByAccount(entries);
  const rows = CHART_OF_ACCOUNTS.map((account) => {
    const bucket = map.get(account.code) || { debit: 0, credit: 0 };
    const net = round2(bucket.debit - bucket.credit);
    const debit = net >= 0 ? net : 0;
    const credit = net < 0 ? round2(-net) : 0;
    return {
      code: account.code,
      name: account.name,
      type: account.type,
      debit,
      credit,
      balance: net
    };
  });
  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));
  return {
    rows,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01
    }
  };
};

// ---------------------------------------------------------------------
// 2. Profit & Loss
// ---------------------------------------------------------------------
/**
 * @param {Array} entries     Ledger for the period
 * @param {number} cogsFallback  Cost of goods sold used only when nothing has
 *                               been posted to the 4050 account yet.
 */
export const buildProfitAndLoss = (entries, { cogs: cogsFallback = 0 } = {}) => {
  const map = aggregateByAccount(entries);
  const creditOf = (code) => {
    const b = map.get(code) || { debit: 0, credit: 0 };
    return round2(b.credit - b.debit);
  };
  const debitOf = (code) => {
    const b = map.get(code) || { debit: 0, credit: 0 };
    return round2(b.debit - b.credit);
  };

  const membership = creditOf('4100');
  const pt = creditOf('4200');
  const pos = creditOf('4000');
  const returns = debitOf('4900');
  const grossRevenue = round2(membership + pt + pos);
  const netRevenue = round2(grossRevenue - returns);

  // Cost of goods sold comes off the ledger (posted when stock is sold) so the
  // income statement and the balance sheet always agree.
  const postedCogs = debitOf('4050');
  const cogs = postedCogs > 0 ? postedCogs : round2(cogsFallback);

  // Every expense account counts, including the generic 5000 bucket — an
  // expense posts to exactly one account (its category's), so there is no
  // double counting to guard against, and excluding 5000 would overstate
  // net profit and break the balance sheet.
  const opexRows = CHART_OF_ACCOUNTS
    .filter((a) => a.type === 'Expense')
    .map((a) => ({ code: a.code, name: a.name, amount: debitOf(a.code) }))
    .filter((r) => r.amount > 0);
  const opexTotal = round2(opexRows.reduce((s, r) => s + r.amount, 0));

  const grossProfit = round2(netRevenue - cogs);
  const netProfit = round2(grossProfit - opexTotal);

  return {
    revenue: { membership, personalTraining: pt, pos, gross: grossRevenue, returns, net: netRevenue },
    cogs: round2(cogs),
    grossProfit,
    opex: { total: opexTotal, byCategory: opexRows },
    netProfit
  };
};

// ---------------------------------------------------------------------
// 3. Balance Sheet
// ---------------------------------------------------------------------
export const buildBalanceSheet = (entries, { periodProfit = 0 } = {}) => {
  const map = aggregateByAccount(entries);
  const bal = (code) => signedBalance(map, code);

  const cashOnHand = bal('1010');
  const bankBalance = bal('1020');
  const receivables = bal('1100');
  const inventory = bal('1300');
  const currentAssets = round2(cashOnHand + bankBalance + receivables + inventory);

  const fixedAssets = bal('1500');
  const accumulatedDepreciation = bal('1600');
  const netFixedAssets = round2(fixedAssets - accumulatedDepreciation);

  const totalAssets = round2(currentAssets + netFixedAssets);

  const payables = bal('2000');
  const unearned = bal('2100');
  const taxPayable = bal('2200');
  const totalLiabilities = round2(payables + unearned + taxPayable);

  const capital = bal('3000');
  const equityTotal = round2(capital + periodProfit);

  const totalLiabilitiesEquity = round2(totalLiabilities + equityTotal);

  return {
    assets: {
      current: {
        cashOnHand,
        bankBalance,
        receivables,
        inventory,
        total: currentAssets
      },
      fixed: { gross: fixedAssets, accumulatedDepreciation, net: netFixedAssets },
      total: totalAssets
    },
    liabilities: { payables, unearned, taxPayable, total: totalLiabilities },
    equity: { capital, currentPeriodProfit: round2(periodProfit), total: equityTotal },
    totals: {
      assets: totalAssets,
      liabilitiesEquity: totalLiabilitiesEquity,
      balanced: Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01
    }
  };
};

// ---------------------------------------------------------------------
// 4. General Ledger Book
// ---------------------------------------------------------------------
export const buildGeneralLedgerBook = (entries, { account } = {}) => {
  const rows = [];
  for (const entry of entries) {
    for (const line of entry.lines || []) {
      if (account && line.accountCode !== account) continue;
      rows.push({
        date: entry.date,
        entryNumber: entry.entryNumber,
        accountCode: line.accountCode,
        accountName: line.accountName,
        sourceModule: entry.sourceModule,
        sourceId: entry.sourceId,
        reference: entry.reference,
        description: entry.description,
        debit: round2(line.debit),
        credit: round2(line.credit),
        branch: entry.branch
      });
    }
  }
  return {
    rows,
    totals: {
      debit: round2(rows.reduce((s, r) => s + r.debit, 0)),
      credit: round2(rows.reduce((s, r) => s + r.credit, 0))
    }
  };
};

// ---------------------------------------------------------------------
// 5. Monthly trends (income vs expense)
// ---------------------------------------------------------------------
export const buildMonthlyTrends = (entries, { months = 6 } = {}) => {
  const buckets = new Map();
  for (const entry of entries) {
    const period = String(entry.date || '').slice(0, 7);
    if (!period) continue;
    if (!buckets.has(period)) buckets.set(period, { period, income: 0, expense: 0 });
    const bucket = buckets.get(period);
    for (const line of entry.lines || []) {
      const account = ACCOUNT_MAP.get(line.accountCode);
      if (!account) continue;
      const amount = round2((Number(line.debit) || 0) - (Number(line.credit) || 0));
      if (account.type === 'Revenue') bucket.income = round2(bucket.income - amount);
      if (account.type === 'Expense') bucket.expense = round2(bucket.expense + amount);
    }
  }
  return [...buckets.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-months);
};
