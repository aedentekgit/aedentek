import Expense from '../../models/accounts/Expense.js';
import ExpenseCategory from '../../models/accounts/ExpenseCategory.js';
import StockInward from '../../models/accounts/StockInward.js';
import {
  postJournal, replaceJournalForSource, removeJournalForSource,
  nextEntryNumber, CASH_ACCOUNT_FOR_MODE, round2
} from '../../utils/accountsEngine.js';

const escapeRx = (v) => new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// ===========================================================================
// EXPENSES
// ===========================================================================

const syncExpenseJournal = async (expense) => {
  const accountCode = expense.accountCode && expense.accountCode !== '5000'
    ? expense.accountCode
    : '5000';
  const cashCode = CASH_ACCOUNT_FOR_MODE[expense.paymentMode] || '1020';
  await replaceJournalForSource('Expenses', expense._id.toString(), {
    date: expense.date,
    description: `Expense — ${expense.title}`,
    sourceModule: 'Expenses',
    sourceId: expense._id.toString(),
    reference: expense.title,
    branch: expense.branch,
    lines: [
      { accountCode, debit: expense.amount, credit: 0 },
      { accountCode: cashCode, debit: 0, credit: expense.amount }
    ]
  });
};

export const getAllExpenses = async (req, res, next) => {
  try {
    const { category, branch, q, from, to } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }
    if (q && q.trim()) {
      const rx = escapeRx(q.trim());
      query.$or = [{ title: rx }, { description: rx }, { notes: rx }, { category: rx }];
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    const all = await Expense.find();
    const total = round2(all.reduce((s, e) => s + (Number(e.amount) || 0), 0));
    const byCategory = new Map();
    for (const e of all) {
      byCategory.set(e.category, round2((byCategory.get(e.category) || 0) + (Number(e.amount) || 0)));
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    return res.status(200).json({
      success: true,
      message: 'Expenses retrieved successfully',
      data: expenses,
      kpis: {
        totalExpenses: total,
        operatingOverhead: total,
        topCategory: top ? top[0] : '—',
        topCategoryAmount: top ? top[1] : 0
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title || !String(body.title).trim()) {
      return res.status(400).json({ success: false, message: 'Expense title is required' });
    }
    if (!body.category) {
      return res.status(400).json({ success: false, message: 'Expense category is required' });
    }
    if (!(Number(body.amount) > 0)) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero' });
    }
    if (!body.date) {
      return res.status(400).json({ success: false, message: 'Expense date is required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) || Number.isNaN(Date.parse(body.date))) {
      return res.status(400).json({ success: false, message: 'Expense date must be a valid date (YYYY-MM-DD)' });
    }

    const category = await ExpenseCategory.findOne({ name: body.category });
    const expense = await Expense.create({
      ...body,
      accountCode: body.accountCode || category?.accountCode || '5000'
    });
    await syncExpenseJournal(expense);

    return res.status(201).json({
      success: true,
      message: `Expense "${expense.title}" recorded successfully`,
      data: expense
    });
  } catch (error) {
    return next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    const allowed = ['title', 'description', 'category', 'amount', 'paymentMode', 'branch', 'date', 'notes', 'accountCode', 'attachments'];
    for (const field of allowed) {
      if (req.body?.[field] !== undefined) expense[field] = req.body[field];
    }
    if (!String(expense.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'Expense title is required' });
    }
    if (!String(expense.category || '').trim()) {
      return res.status(400).json({ success: false, message: 'Expense category is required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expense.date)) || Number.isNaN(Date.parse(expense.date))) {
      return res.status(400).json({ success: false, message: 'Expense date must be a valid date (YYYY-MM-DD)' });
    }
    if (!(Number(expense.amount) > 0)) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero' });
    }
    await expense.save();
    await syncExpenseJournal(expense);
    return res.status(200).json({
      success: true,
      message: `Expense "${expense.title}" updated successfully`,
      data: expense
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    await removeJournalForSource('Expenses', expense._id.toString());
    await Expense.findByIdAndDelete(expense._id);
    return res.status(200).json({
      success: true,
      message: `Expense "${expense.title}" deleted successfully`,
      data: { id: expense._id }
    });
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// EXPENSE CATEGORIES
// ===========================================================================

export const getAllExpenseCategories = async (req, res, next) => {
  try {
    let categories = await ExpenseCategory.find().sort({ code: 1 });
    const all = categories;
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q) categories = all.filter((c) => [c.code, c.name, c.branch, c.description].some((v) => String(v || '').toLowerCase().includes(q)));
    return res.status(200).json({
      success: true,
      message: 'Expense categories retrieved successfully',
      data: categories,
      kpis: {
        total: all.length,
        active: all.filter((c) => c.status === 'Active').length,
        inactive: all.filter((c) => c.status !== 'Active').length
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createExpenseCategory = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    if (!body.code || !String(body.code).trim()) {
      return res.status(400).json({ success: false, message: 'Category code is required' });
    }
    const clash = await ExpenseCategory.findOne({ code: body.code });
    if (clash) {
      return res.status(400).json({ success: false, message: `Category code ${body.code} already exists` });
    }
    const category = await ExpenseCategory.create(body);
    return res.status(201).json({
      success: true,
      message: `Expense category ${category.code} created successfully`,
      data: category
    });
  } catch (error) {
    return next(error);
  }
};

export const updateExpenseCategory = async (req, res, next) => {
  try {
    const category = await ExpenseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Expense category not found' });
    }
    for (const field of ['code', 'name', 'description', 'accountCode', 'branch', 'status']) {
      if (req.body?.[field] !== undefined) category[field] = req.body[field];
    }
    await category.save();
    return res.status(200).json({
      success: true,
      message: `Expense category ${category.code} updated successfully`,
      data: category
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteExpenseCategory = async (req, res, next) => {
  try {
    const category = await ExpenseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Expense category not found' });
    }
    const used = await Expense.countDocuments({ category: category.name });
    if (used > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${category.name}" — ${used} expense(s) still use this category`
      });
    }
    await ExpenseCategory.findByIdAndDelete(category._id);
    return res.status(200).json({
      success: true,
      message: `Expense category ${category.code} deleted successfully`,
      data: { id: category._id }
    });
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// STOCK INWARD
// ===========================================================================

export const getAllStockInwards = async (req, res, next) => {
  try {
    const { category, status, branch, q } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = escapeRx(q.trim());
      query.$or = [{ inwardNumber: rx }, { supplier: rx }, { supplierInvoice: rx }];
    }

    const inwards = await StockInward.find(query).sort({ createdAt: -1 });
    const all = await StockInward.find();

    return res.status(200).json({
      success: true,
      message: 'Stock inwards retrieved successfully',
      data: inwards,
      kpis: {
        totalInwards: all.length,
        totalProcuredValue: round2(all.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0)),
        paidToSuppliers: round2(all.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0)),
        accountsPayable: round2(all.reduce((s, i) => s + (Number(i.balanceDue) || 0), 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getStockInwardById = async (req, res, next) => {
  try {
    const inward = await StockInward.findById(req.params.id);
    if (!inward) {
      return res.status(404).json({ success: false, message: 'Stock inward not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Stock inward retrieved successfully',
      data: inward
    });
  } catch (error) {
    return next(error);
  }
};

const syncStockJournal = async (inward) => {
  const cashCode = '1020';
  await replaceJournalForSource('StockInward', inward._id.toString(), {
    date: inward.date,
    description: `Stock inward ${inward.inwardNumber} — ${inward.supplier}`,
    sourceModule: 'StockInward',
    sourceId: inward._id.toString(),
    reference: inward.inwardNumber,
    branch: inward.branch,
    lines: [
      { accountCode: '1300', debit: inward.totalAmount, credit: 0 },
      ...(inward.paidAmount > 0 ? [{ accountCode: cashCode, debit: 0, credit: inward.paidAmount }] : []),
      ...(inward.balanceDue > 0 ? [{ accountCode: '2000', debit: 0, credit: inward.balanceDue }] : [])
    ]
  });
};

export const createStockInward = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.supplier || !String(body.supplier).trim()) {
      return res.status(400).json({ success: false, message: 'Supplier is required' });
    }
    if (!body.date) {
      return res.status(400).json({ success: false, message: 'Inward date is required' });
    }
    if (!Array.isArray(body.items) || !body.items.length) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }
    const badItem = body.items.find((i) => !i.description || (Number(i.quantity) || 0) < 1);
    if (badItem) {
      return res.status(400).json({ success: false, message: 'Every item needs a description and a quantity of at least 1' });
    }

    const inwardNumber = await nextEntryNumber(StockInward, 'SI', 'inwardNumber');
    const inward = await StockInward.create({ ...body, inwardNumber });
    await syncStockJournal(inward);

    return res.status(201).json({
      success: true,
      message: `Stock inward ${inward.inwardNumber} recorded successfully`,
      data: inward
    });
  } catch (error) {
    return next(error);
  }
};

export const updateStockInward = async (req, res, next) => {
  try {
    const inward = await StockInward.findById(req.params.id);
    if (!inward) {
      return res.status(404).json({ success: false, message: 'Stock inward not found' });
    }
    const allowed = ['supplier', 'supplierInvoice', 'date', 'category', 'branch', 'items', 'payments', 'status', 'notes', 'attachments'];
    for (const field of allowed) {
      if (req.body?.[field] !== undefined) inward[field] = req.body[field];
    }
    await inward.save();
    await syncStockJournal(inward);
    return res.status(200).json({
      success: true,
      message: `Stock inward ${inward.inwardNumber} updated successfully`,
      data: inward
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteStockInward = async (req, res, next) => {
  try {
    const inward = await StockInward.findById(req.params.id);
    if (!inward) {
      return res.status(404).json({ success: false, message: 'Stock inward not found' });
    }
    await removeJournalForSource('StockInward', inward._id.toString());
    await StockInward.findByIdAndDelete(inward._id);
    return res.status(200).json({
      success: true,
      message: `Stock inward ${inward.inwardNumber} deleted successfully`,
      data: { id: inward._id }
    });
  } catch (error) {
    return next(error);
  }
};
