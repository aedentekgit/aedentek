import SalesInvoice from '../../models/accounts/SalesInvoice.js';
import CreditNote from '../../models/accounts/CreditNote.js';
import StockInward from '../../models/accounts/StockInward.js';
import {
  postJournal, replaceJournalForSource, removeJournalForSource,
  nextEntryNumber, CASH_ACCOUNT_FOR_MODE, round2
} from '../../utils/accountsEngine.js';

/** Accounts that carry a General Ledger posting. */
const POSTING_STATUSES = ['Approved', 'Sent', 'Partially Paid', 'Paid', 'Overdue'];

/**
 * Build the double-entry lines for an invoice.
 *   Debit  1100 Accounts Receivable   grandTotal
 *   Credit 4000 Sales Revenue         grandTotal − tax
 *   Credit 2200 Tax Payable            tax
 *   (when settled) Debit 1010/1020 Cash/Bank  paidAmount
 *                  Credit 1100 Accounts Receivable paidAmount
 *   (for stock-backed lines) Debit 4050 Cost of Goods Sold
 *                             Credit 1300 Inventory
 */
const invoiceJournalLines = (invoice, cogs = 0) => {
  const lines = [
    { accountCode: '1100', debit: invoice.grandTotal, credit: 0 },
    { accountCode: '4000', debit: 0, credit: round2(invoice.grandTotal - (invoice.tax || 0)) }
  ];
  if ((invoice.tax || 0) > 0) {
    lines.push({ accountCode: '2200', debit: 0, credit: invoice.tax });
  }
  if ((invoice.paidAmount || 0) > 0) {
    lines.push({
      accountCode: CASH_ACCOUNT_FOR_MODE[invoice.paymentMode] || '1020',
      debit: invoice.paidAmount,
      credit: 0
    });
    lines.push({ accountCode: '1100', debit: 0, credit: invoice.paidAmount });
  }
  if (cogs > 0) {
    lines.push({ accountCode: '4050', debit: round2(cogs), credit: 0 });
    lines.push({ accountCode: '1300', debit: 0, credit: round2(cogs) });
  }
  return lines;
};

/** Post (or remove) the ledger entry that belongs to an invoice. */
const syncInvoiceJournal = async (invoice, cogs = 0) => {
  const shouldPost = POSTING_STATUSES.includes(invoice.status);
  const payload = {
    date: invoice.invoiceDate,
    description: `Sales invoice ${invoice.invoiceNumber} — ${invoice.customer}`,
    sourceModule: 'Sales',
    sourceId: invoice._id.toString(),
    reference: invoice.invoiceNumber,
    branch: invoice.branch,
    lines: invoiceJournalLines(invoice, cogs)
  };
  if (shouldPost) {
    await replaceJournalForSource('Sales', invoice._id.toString(), payload);
  } else {
    await removeJournalForSource('Sales', invoice._id.toString());
  }
};

/**
 * Validate on-hand stock for the invoice's stock-backed lines and return the
 * cost of goods sold. Inventory is credited in the ledger, so the income
 * statement and the balance sheet stay in agreement.
 */
const resolveCostOfGoods = async (invoice) => {
  const inwards = await StockInward.find();
  const bySku = new Map();
  for (const inward of inwards) {
    for (const item of inward.items || []) {
      if (item.sku) bySku.set(item.sku, item);
    }
  }
  let cogs = 0;
  for (const line of invoice.items || []) {
    if (!line.stockRef) continue;
    const item = bySku.get(line.stockRef);
    if (!item) continue;
    const available = item.availableQuantity === null || item.availableQuantity === undefined
      ? item.quantity
      : item.availableQuantity;
    if (available < line.quantity) {
      const err = new Error(`Insufficient stock for ${line.productService} — ${available} available, ${line.quantity} requested`);
      err.statusCode = 400;
      throw err;
    }
    cogs += (Number(item.unitCost) || 0) * (Number(line.quantity) || 0);
  }
  return round2(cogs);
};

// ---------------------------------------------------------------------------
// GET /api/accounts/sales
// ---------------------------------------------------------------------------
export const getAllSales = async (req, res, next) => {
  try {
    const { status, branch, q } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ invoiceNumber: rx }, { customer: rx }, { notes: rx }];
    }

    const invoices = await SalesInvoice.find(query).sort({ createdAt: -1 });
    const all = await SalesInvoice.find();
    const live = all.filter((i) => i.status !== 'Cancelled' && i.status !== 'Draft');

    return res.status(200).json({
      success: true,
      message: 'Sales invoices retrieved successfully',
      data: invoices,
      kpis: {
        totalInvoices: live.length,
        totalSales: round2(live.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0)),
        collectedRevenue: round2(live.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0)),
        outstandingReceivables: round2(live.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/accounts/sales/:id
// ---------------------------------------------------------------------------
export const getSalesInvoiceById = async (req, res, next) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sales invoice not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Sales invoice retrieved successfully',
      data: invoice
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/accounts/sales
// ---------------------------------------------------------------------------
export const createSalesInvoice = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.customer || !String(body.customer).trim()) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }
    if (!body.invoiceDate) {
      return res.status(400).json({ success: false, message: 'Invoice date is required' });
    }
    if (!Array.isArray(body.items) || !body.items.length) {
      return res.status(400).json({ success: false, message: 'At least one line item is required' });
    }
    const badItem = body.items.find((i) => !i.productService || (Number(i.quantity) || 0) < 1);
    if (badItem) {
      return res.status(400).json({ success: false, message: 'Every line item needs a product/service and a quantity of at least 1' });
    }

    const invoiceNumber = await nextEntryNumber(SalesInvoice, 'INV', 'invoiceNumber');
    const invoice = await SalesInvoice.create({ ...body, invoiceNumber });
    const cogs = await resolveCostOfGoods(invoice);
    await syncInvoiceJournal(invoice, cogs);

    return res.status(201).json({
      success: true,
      message: `Sales invoice ${invoice.invoiceNumber} created successfully`,
      data: invoice
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/accounts/sales/:id
// ---------------------------------------------------------------------------
export const updateSalesInvoice = async (req, res, next) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sales invoice not found' });
    }
    if (invoice.status === 'Cancelled') {
      return res.status(409).json({ success: false, message: 'A cancelled invoice cannot be edited' });
    }

    const body = req.body || {};
    if (body.items && (!Array.isArray(body.items) || !body.items.length)) {
      return res.status(400).json({ success: false, message: 'An invoice needs at least one line item' });
    }

    const allowed = [
      'customer', 'invoiceDate', 'dueDate', 'paymentTerms', 'items', 'discount', 'tax',
      'paymentMode', 'status', 'branch', 'notes', 'attachments'
    ];
    for (const field of allowed) {
      if (body[field] !== undefined) invoice[field] = body[field];
    }
    if (body.paidAmount !== undefined) {
      invoice.paidAmount = Math.max(0, Math.min(Number(body.paidAmount) || 0, invoice.grandTotal));
    }

    await invoice.save();
    const cogs = await resolveCostOfGoods(invoice);
    await syncInvoiceJournal(invoice, cogs);

    return res.status(200).json({
      success: true,
      message: `Sales invoice ${invoice.invoiceNumber} updated successfully`,
      data: invoice
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/accounts/sales/:id
// ---------------------------------------------------------------------------
export const deleteSalesInvoice = async (req, res, next) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sales invoice not found' });
    }
    await removeJournalForSource('Sales', invoice._id.toString());
    await SalesInvoice.findByIdAndDelete(invoice._id);
    return res.status(200).json({
      success: true,
      message: `Sales invoice ${invoice.invoiceNumber} deleted successfully`,
      data: { id: invoice._id }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/accounts/sales/:id/collect
// ---------------------------------------------------------------------------
export const collectPayment = async (req, res, next) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sales invoice not found' });
    }
    if (invoice.status === 'Cancelled' || invoice.status === 'Draft') {
      return res.status(409).json({ success: false, message: `A ${invoice.status.toLowerCase()} invoice cannot collect payment` });
    }

    const amount = Number(req.body?.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }
    if (amount > invoice.outstandingAmount + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds the outstanding balance of ${invoice.outstandingAmount}`
      });
    }

    invoice.paidAmount = round2((invoice.paidAmount || 0) + amount);
    if (req.body?.paymentMode) invoice.paymentMode = req.body.paymentMode;
    await invoice.save();
    const cogs = await resolveCostOfGoods(invoice);
    await syncInvoiceJournal(invoice, cogs);

    return res.status(200).json({
      success: true,
      message: `Payment of ${amount} collected — invoice is now ${invoice.status.toLowerCase()}`,
      data: invoice
    });
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// CREDIT NOTES
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/accounts/credit-notes
// ---------------------------------------------------------------------------
export const getAllCreditNotes = async (req, res, next) => {
  try {
    const { status, branch, q } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ creditNoteNumber: rx }, { customer: rx }, { referenceInvoice: rx }];
    }

    const notes = await CreditNote.find(query).sort({ createdAt: -1 });
    const all = await CreditNote.find();
    const live = all.filter((c) => c.status !== 'Cancelled' && c.status !== 'Draft');

    return res.status(200).json({
      success: true,
      message: 'Credit notes retrieved successfully',
      data: notes,
      kpis: {
        totalNotes: live.length,
        totalCreditValue: round2(live.reduce((s, c) => s + (Number(c.totalCredit) || 0), 0)),
        refundedCash: round2(live.reduce((s, c) => s + (Number(c.refundedAmount) || 0), 0)),
        appliedToInvoices: round2(live.reduce((s, c) => s + (Number(c.appliedAmount) || 0), 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/accounts/credit-notes
// ---------------------------------------------------------------------------
export const createCreditNote = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.customer || !String(body.customer).trim()) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }
    if (!Array.isArray(body.items) || !body.items.length) {
      return res.status(400).json({ success: false, message: 'At least one credit item is required' });
    }

    const creditNoteNumber = await nextEntryNumber(CreditNote, 'CN', 'creditNoteNumber');
    const note = await CreditNote.create({ ...body, creditNoteNumber });

    // A direct refund disburses cash immediately.
    if (note.settlementMethod === 'Direct Refund' && note.status !== 'Draft' && note.status !== 'Cancelled') {
      note.refundedAmount = note.totalCredit;
      note.status = 'Refunded';
      await note.save();
      await postJournal({
        date: new Date().toISOString().slice(0, 10),
        description: `Credit note ${note.creditNoteNumber} refunded to ${note.customer}`,
        sourceModule: 'CreditNote',
        sourceId: note._id.toString(),
        reference: note.creditNoteNumber,
        branch: note.branch,
        lines: [
          { accountCode: '4900', debit: note.totalCredit, credit: 0 },
          { accountCode: CASH_ACCOUNT_FOR_MODE[note.paymentMode] || '1010', debit: 0, credit: note.totalCredit }
        ]
      });
    }

    return res.status(201).json({
      success: true,
      message: `Credit note ${note.creditNoteNumber} created successfully`,
      data: note
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/accounts/credit-notes/:id/apply
// ---------------------------------------------------------------------------
export const applyCreditNote = async (req, res, next) => {
  try {
    const note = await CreditNote.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Credit note not found' });
    }
    if (note.status === 'Applied' || note.status === 'Cancelled') {
      return res.status(409).json({ success: false, message: `This credit note is already ${note.status.toLowerCase()}` });
    }

    const invoiceId = req.body?.invoiceId || note.referenceInvoiceId;
    if (!invoiceId) {
      return res.status(400).json({ success: false, message: 'A reference invoice is required to apply a credit note' });
    }
    const invoice = await SalesInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Reference invoice not found' });
    }
    if (note.totalCredit > invoice.outstandingAmount + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Credit of ${note.totalCredit} exceeds the invoice outstanding balance of ${invoice.outstandingAmount}`
      });
    }

    // Invoice rebalancing
    invoice.paidAmount = round2((invoice.paidAmount || 0) + note.totalCredit);
    await invoice.save();

    note.appliedAmount = note.totalCredit;
    note.status = 'Applied';
    note.referenceInvoiceId = invoice._id;
    note.referenceInvoice = invoice.invoiceNumber;
    await note.save();

    await postJournal({
      date: new Date().toISOString().slice(0, 10),
      description: `Credit note ${note.creditNoteNumber} applied to invoice ${invoice.invoiceNumber}`,
      sourceModule: 'CreditNote',
      sourceId: note._id.toString(),
      reference: note.creditNoteNumber,
      branch: note.branch,
      lines: [
        { accountCode: '4900', debit: note.totalCredit, credit: 0 },
        { accountCode: '1100', debit: 0, credit: note.totalCredit }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Credit note applied — invoice ${invoice.invoiceNumber} is now ${invoice.status.toLowerCase()}`,
      data: { creditNote: note, invoice }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/accounts/credit-notes/:id
// ---------------------------------------------------------------------------
export const updateCreditNote = async (req, res, next) => {
  try {
    const note = await CreditNote.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Credit note not found' });
    }
    if (note.status === 'Applied' || note.status === 'Cancelled') {
      return res.status(409).json({ success: false, message: `An ${note.status.toLowerCase()} credit note cannot be edited` });
    }
    const allowed = ['customer', 'referenceInvoice', 'reason', 'items', 'settlementMethod', 'paymentMode', 'status', 'branch', 'notes', 'attachments'];
    for (const field of allowed) {
      if (req.body?.[field] !== undefined) note[field] = req.body[field];
    }
    await note.save();
    return res.status(200).json({
      success: true,
      message: `Credit note ${note.creditNoteNumber} updated successfully`,
      data: note
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/accounts/credit-notes/:id
// ---------------------------------------------------------------------------
export const deleteCreditNote = async (req, res, next) => {
  try {
    const note = await CreditNote.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Credit note not found' });
    }
    if (note.status === 'Applied') {
      return res.status(409).json({ success: false, message: 'An applied credit note cannot be deleted' });
    }
    await removeJournalForSource('CreditNote', note._id.toString());
    await CreditNote.findByIdAndDelete(note._id);
    return res.status(200).json({
      success: true,
      message: `Credit note ${note.creditNoteNumber} deleted successfully`,
      data: { id: note._id }
    });
  } catch (error) {
    return next(error);
  }
};
