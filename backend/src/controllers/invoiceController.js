import Invoice from '../models/Invoice.js';
import { getOrInitSettings } from './settingsController.js';
import { liveInvoices } from '../utils/seedFinance.js';
import { generateNextInvoiceNumber } from './propagationController.js';
import { computeDiscount, discountError } from '../utils/invoiceDiscount.js';
import {
  replaceJournalForSource,
  removeJournalForSource,
  round2,
  CASH_ACCOUNT_FOR_MODE
} from '../utils/accountsEngine.js';

/** Sync Finance Invoice with the General Ledger in Accounts */
export const syncFinanceInvoiceJournal = async (invoice) => {
  try {
    if (!invoice || invoice.status === 'Draft') {
      await removeJournalForSource('FinanceInvoice', invoice?._id?.toString() || '');
      return;
    }

    const grandTotal = round2(invoice.totalAmount || 0);
    const tax = round2(invoice.tax || invoice.gstAmount || 0);
    const revenue = round2(Math.max(0, grandTotal - tax));
    const paid = round2(invoice.paidAmount || 0);

    const lines = [
      { accountCode: '1100', debit: grandTotal, credit: 0 },
      { accountCode: '4000', debit: 0, credit: revenue }
    ];
    if (tax > 0) {
      lines.push({ accountCode: '2200', debit: 0, credit: tax });
    }
    if (paid > 0) {
      const cashAcct = CASH_ACCOUNT_FOR_MODE[invoice.paymentMode] || '1020';
      lines.push({ accountCode: cashAcct, debit: paid, credit: 0 });
      lines.push({ accountCode: '1100', debit: 0, credit: paid });
    }

    const payload = {
      date: invoice.issueDate || new Date().toISOString().slice(0, 10),
      description: `Finance invoice ${invoice.invoiceNumber} — ${invoice.clientName}`,
      sourceModule: 'FinanceInvoice',
      sourceId: invoice._id.toString(),
      reference: invoice.invoiceNumber,
      branch: invoice.branch || 'All Branches',
      lines
    };

    await replaceJournalForSource('FinanceInvoice', invoice._id.toString(), payload);
  } catch (err) {
    console.error('Failed to sync finance invoice to GL:', err.message);
  }
};

// GET /api/invoices
export const getInvoices = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const query = {};
    if (status && status !== 'all' && status !== 'All') query.status = new RegExp(`^${String(status).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ invoiceNumber: rx }, { clientName: rx }, { title: rx }];
    }
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices/next-number
export const getNextNumber = async (req, res, next) => {
  try {
    const nextNumber = await generateNextInvoiceNumber();
    res.status(200).json({ success: true, nextNumber });
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices/:id
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

// POST /api/invoices
export const createInvoice = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    // Validate what the CALLER supplied (settings-derived defaults are filled in afterwards).
    const formatError = validateInvoiceFields(payload);
    if (formatError) return res.status(400).json({ success: false, message: formatError });
    {
      const sub = Array.isArray(payload.items) && payload.items.length
        ? payload.items.reduce((a, it) => a + (Number(it.price) || 0) * (Number(it.qty === undefined ? 1 : it.qty) || 0), 0)
        : undefined;
      const dErr = discountError(payload.discountType, payload.discountValue, sub);
      if (dErr) return res.status(400).json({ success: false, message: dErr });
    }

    // Auto-generate invoice number if missing
    if (!payload.invoiceNumber) {
      payload.invoiceNumber = await generateNextInvoiceNumber();
    }

    if (!payload.clientName) {
      return res.status(400).json({
        success: false,
        message: 'clientName is required',
      });
    }

    // New invoices snapshot the DEFAULT invoice-sender and bank profile (Settings) unless the caller
    // supplied its own values, so every new document carries the current defaults.
    try {
      const settings = await getOrInitSettings();
      const s = settings.invoiceSender && settings.invoiceSender.toObject ? settings.invoiceSender.toObject() : (settings.invoiceSender || {});
      const b = settings.bankDetails && settings.bankDetails.toObject ? settings.bankDetails.toObject() : (settings.bankDetails || {});
      const issuer = {
        companyName: s.companyName, companyAddress: s.companyAddress, companyGst: s.companyGst, companyPan: s.companyPan,
        companyEmail: s.companyEmail, companyPhone: s.companyPhone, companyLogo: s.companyLogo,
        signatoryName: s.signatoryName, signatoryDesignation: s.signatoryDesignation, signatorySeal: s.signatorySeal
      };
      for (const [k, v] of Object.entries(issuer)) {
        if (payload[k] === undefined && String(v || '').trim()) payload[k] = v;
      }
      if (payload.bankDetails === undefined && String(b.accountNumber || b.bankName || '').trim()) {
        payload.bankDetails = { ...b };
      }
    } catch (e) { /* settings unavailable: fall back to model defaults */ }

    const invoice = new Invoice(payload);
    const saved = await invoice.save();
    await syncFinanceInvoiceJournal(saved);

    res.status(201).json({
      success: true,
      message: 'Tax invoice created successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Shared field-format checks (GSTIN / PAN / e-mail / date order).
const GSTIN_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validateInvoiceFields = (inv) => {
  if (inv.buyerGstin && !GSTIN_RX.test(String(inv.buyerGstin).toUpperCase())) return 'Buyer GSTIN must be a valid 15-character GSTIN';
  if (inv.buyerPan && !PAN_RX.test(String(inv.buyerPan).toUpperCase())) return 'Buyer PAN must be a valid 10-character PAN';
  if (inv.clientEmail && !EMAIL_RX.test(inv.clientEmail)) return 'Client email is not a valid email address';
  if (inv.companyEmail && !EMAIL_RX.test(inv.companyEmail)) return 'Company email is not a valid email address';
  if (inv.companyGst && !GSTIN_RX.test(String(inv.companyGst).toUpperCase())) return 'Company GSTIN must be a valid 15-character GSTIN';
  if (inv.companyPan && !PAN_RX.test(String(inv.companyPan).toUpperCase())) return 'Company PAN must be a valid 10-character PAN';
  if (inv.issueDate && inv.dueDate && String(inv.dueDate) < String(inv.issueDate)) return 'Due date cannot be earlier than the issue date';
  return null;
};

// PUT /api/invoices/:id
export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const body = req.body || {};
    const bad = (message) => res.status(400).json({ success: false, message });
    const isYmd = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) && !Number.isNaN(Date.parse(v));

    // Only these fields are editable; invoice number, payments and company defaults are not.
    const editable = ['clientName', 'title', 'issueDate', 'dueDate', 'gstCategory', 'gstType', 'buyerGstin', 'buyerPan',
      'buyerAddress', 'hsn', 'notes', 'lutNumber', 'exemptionReason', 'status',
      'clientId', 'clientMode', 'clientEmail', 'clientPhone', 'projectName',
      'companyName', 'companyTagline', 'companyContactPerson', 'companyEmail', 'companyPhone', 'companyGst', 'companyPan',
      'companyAddress', 'companyLogo', 'signatoryName', 'signatoryDesignation', 'signatorySeal', 'discountType', 'discountValue'];
    for (const key of editable) {
      if (body[key] !== undefined) invoice[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
    }
    if (body.bankDetails && typeof body.bankDetails === 'object') {
      const bankKeys = ['bankName', 'accountName', 'accountType', 'accountNumber', 'ifsc', 'swiftCode', 'branch', 'upiId', 'qrCode', 'bankAddress'];
      const nextBank = { ...(invoice.bankDetails && invoice.bankDetails.toObject ? invoice.bankDetails.toObject() : (invoice.bankDetails || {})) };
      for (const k of bankKeys) if (body.bankDetails[k] !== undefined) nextBank[k] = String(body.bankDetails[k] ?? '').trim();
      invoice.bankDetails = nextBank;
    }

    const formatError = validateInvoiceFields(invoice);
    if (formatError) return bad(formatError);

    if (!String(invoice.clientName || '').trim()) return bad('Client name is required');
    if (invoice.issueDate && !isYmd(invoice.issueDate)) return bad('Issue date must be a valid date (YYYY-MM-DD)');
    if (invoice.dueDate && !isYmd(invoice.dueDate)) return bad('Due date must be a valid date (YYYY-MM-DD)');

    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length === 0) return bad('At least one line item is required');
      const items = [];
      for (const [i, raw] of body.items.entries()) {
        const description = String(raw.description || '').trim();
        const price = Number(raw.price);
        const qty = raw.qty === undefined || raw.qty === '' ? 1 : Number(raw.qty);
        if (!description) return bad(`Line item ${i + 1}: description is required`);
        if (!Number.isFinite(price) || price < 0) return bad(`Line item ${i + 1}: price must be zero or more`);
        if (!Number.isFinite(qty) || qty < 0) return bad(`Line item ${i + 1}: quantity must be zero or more`);
        items.push({ sNo: i + 1, description, hsn: raw.hsn || invoice.hsn, price, qty, total: Math.round(price * qty * 100) / 100 });
      }
      invoice.items = items;
    }

    // Totals are always recomputed on the server from the line items.
    if (invoice.items && invoice.items.length) {
      const subtotal = Math.round(invoice.items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0) * 100) / 100;
      const rate = invoice.gstCategory === 'Export LUT' || invoice.gstType === 'Export LUT' || invoice.gstType === 'Exempted'
        ? 0
        : Number(body.gstRate ?? (Number(invoice.gstRate) > 0 ? invoice.gstRate : 18));
      const dErr = discountError(invoice.discountType || 'none', invoice.discountValue || 0, subtotal);
      if (dErr) return bad(dErr);
      const discountAmount = computeDiscount(subtotal, invoice.discountType, invoice.discountValue);
      const taxable = subtotal - discountAmount;
      const gstAmount = Math.round((taxable * rate) / 100);
      const total = taxable + gstAmount;
      const paid = Number(invoice.paidAmount || 0);
      if (paid > total + 0.001) return bad('The total cannot be lower than the amount already paid');
      invoice.subtotal = subtotal;
      invoice.discountAmount = discountAmount;
      if (!invoice.discountType || invoice.discountType === 'none') invoice.discountValue = 0;
      invoice.gstRate = rate;
      invoice.gstAmount = gstAmount;
      invoice.tax = gstAmount;
      invoice.cgstAmount = invoice.gstType === 'CGST+SGST' ? Math.round(gstAmount / 2) : 0;
      invoice.sgstAmount = invoice.gstType === 'CGST+SGST' ? gstAmount - Math.round(gstAmount / 2) : 0;
      invoice.igstAmount = invoice.gstType === 'IGST' ? gstAmount : 0;
      invoice.totalAmount = total;
      invoice.balance = Math.max(0, total - paid);
      if (total > 0 && invoice.balance === 0) invoice.status = 'Paid';
      else if (paid > 0 && invoice.balance > 0) invoice.status = 'Partially Paid';
      else if (invoice.status === 'Paid' || invoice.status === 'Partially Paid') invoice.status = 'Sent';
    }

    const saved = await invoice.save();
    await syncFinanceInvoiceJournal(saved);
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/invoices/:id/payment (Record settlement)
export const recordPayment = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const amount = Number(req.body.amount || 0);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    const newPaid = Number(invoice.paidAmount || 0) + amount;
    invoice.paidAmount = Math.min(newPaid, invoice.totalAmount);
    invoice.balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);

    if (req.body.paymentRef) {
      invoice.paymentRef = req.body.paymentRef;
    }
    if (req.body.paymentMode) {
      invoice.paymentMode = req.body.paymentMode;
    }

    invoice.status = invoice.balance === 0 ? 'Paid' : 'Partially Paid';

    const saved = await invoice.save();
    await syncFinanceInvoiceJournal(saved);

    res.status(200).json({
      success: true,
      message: `Recorded payment of ₹ ${amount.toLocaleString('en-IN')}`,
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/invoices/:id
export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    await removeJournalForSource('FinanceInvoice', req.params.id);

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/invoices/reset
export const resetInvoices = async (req, res, next) => {
  try {
    await Invoice.deleteMany({});
    try {
      await removeJournalForSource('FinanceInvoice', '', { sourceIdPrefix: true });
    } catch (e) {}
    for (const inv of liveInvoices) {
      const created = await Invoice.create(inv);
      await syncFinanceInvoiceJournal(created);
    }
    const fresh = await Invoice.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: 'Invoices reset to live records',
      count: fresh.length,
      data: fresh,
    });
  } catch (error) {
    next(error);
  }
};

