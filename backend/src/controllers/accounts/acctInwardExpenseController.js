import Expense from '../../models/accounts/Expense.js';
import StockInward from '../../models/accounts/StockInward.js';
import { round2 } from '../../utils/accountsEngine.js';

const escapeRx = (v) => new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const fromExpense = (e) => ({
  _id: e._id.toString(),
  kind: 'Expense',
  reference: e.title,
  party: '',
  date: e.date,
  category: e.category,
  branch: e.branch,
  paymentMode: e.paymentMode || '',
  amount: round2(e.amount),
  paidAmount: round2(e.amount),
  balanceDue: 0,
  status: 'Paid',
  notes: e.notes || '',
  raw: e.toObject()
});

const fromInward = (i) => {
  const modes = Array.from(new Set((i.payments || []).filter((p) => Number(p.amount) > 0).map((p) => p.mode).filter(Boolean)));
  return {
    _id: i._id.toString(),
    kind: 'Inward',
    reference: i.inwardNumber,
    party: i.supplier,
    date: i.date,
    category: i.category,
    branch: i.branch,
    paymentMode: modes.length > 1 ? 'Split' : modes[0] || '',
    amount: round2(i.totalAmount),
    paidAmount: round2(i.paidAmount),
    balanceDue: round2(i.balanceDue),
    status: i.status,
    notes: i.notes || '',
    items: (i.items || []).length,
    raw: i.toObject()
  };
};

/**
 * GET /api/accounts/inward-expenses?type=&category=&branch=&q=&from=&to=
 * One chronological list of stock inward (procurement) and operating expenses.
 * Create / edit / delete keep using /expenses and /stock-inward.
 */
export const getInwardExpenses = async (req, res, next) => {
  try {
    const { type, category, branch, q, from, to } = req.query;
    const [expenses, inwards] = await Promise.all([Expense.find(), StockInward.find()]);

    let rows = [...expenses.map(fromExpense), ...inwards.map(fromInward)];
    if (type === 'Inward' || type === 'Expense') rows = rows.filter((r) => r.kind === type);
    if (category && category !== 'All') rows = rows.filter((r) => r.category === category);
    if (branch && branch !== 'All Branches') rows = rows.filter((r) => r.branch === branch);
    if (from) rows = rows.filter((r) => String(r.date || '') >= from);
    if (to) rows = rows.filter((r) => String(r.date || '') <= to);
    if (q && q.trim()) {
      const rx = escapeRx(q.trim());
      rows = rows.filter((r) => [r.reference, r.party, r.category, r.branch, r.notes].some((v) => rx.test(String(v || ''))));
    }
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.reference).localeCompare(String(a.reference)));

    // KPIs describe the filtered view; cancelled inwards are ignored.
    const live = rows.filter((r) => r.status !== 'Cancelled');
    const sum = (list, key) => round2(list.reduce((s, r) => s + (Number(r[key]) || 0), 0));
    const exp = live.filter((r) => r.kind === 'Expense');
    const inw = live.filter((r) => r.kind === 'Inward');

    return res.status(200).json({
      success: true,
      message: 'Inward and expense records retrieved successfully',
      data: rows,
      kpis: {
        totalRecords: rows.length,
        expenseCount: exp.length,
        inwardCount: inw.length,
        totalExpenses: sum(exp, 'amount'),
        totalInward: sum(inw, 'amount'),
        totalSpend: round2(sum(exp, 'amount') + sum(inw, 'amount')),
        payable: sum(inw, 'balanceDue')
      }
    });
  } catch (error) {
    return next(error);
  }
};
