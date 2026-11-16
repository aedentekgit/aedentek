import Propagation from '../models/Propagation.js';
import Invoice from '../models/Invoice.js';
import { livePropagations } from '../utils/seedFinance.js';
import { syncFinanceInvoiceJournal } from './invoiceController.js';

// Helper to generate next sequential invoice number (e.g. INV-2026-0119)
export const generateNextInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const invoices = await Invoice.find({
    invoiceNumber: { $regex: `^${prefix}` },
  }).select('invoiceNumber');

  let maxNum = 0;
  for (const inv of invoices) {
    const match = inv.invoiceNumber.match(/INV-\d{4}-(\d+)/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  // If no previous invoices found for year, start at 0001
  const nextSeq = maxNum > 0 ? maxNum + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

// Helper to generate next sequential propagation number (e.g. PRP-2026-0046)
export const generateNextPropagationNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `PRP-${currentYear}-`;

  const propagations = await Propagation.find({
    propagationNumber: { $regex: `^${prefix}` },
  }).select('propagationNumber');

  let maxNum = 0;
  for (const p of propagations) {
    const match = p.propagationNumber.match(/PRP-\d{4}-(\d+)/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  const nextSeq = maxNum > 0 ? maxNum + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

// GET /api/propagations
export const getPropagations = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const query = {};
    if (status && status !== 'all' && status !== 'All') query.status = new RegExp(`^${String(status).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ propagationNumber: rx }, { clientName: rx }, { title: rx }];
    }
    const propagations = await Propagation.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: propagations.length,
      data: propagations,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/propagations/:id
export const getPropagationById = async (req, res, next) => {
  try {
    const propagation = await Propagation.findById(req.params.id);
    if (!propagation) {
      return res.status(404).json({ success: false, message: 'Propagation not found' });
    }
    res.status(200).json({ success: true, data: propagation });
  } catch (error) {
    next(error);
  }
};

// POST /api/propagations
export const createPropagation = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    // Auto-generate propagation number if omitted
    if (!payload.propagationNumber) {
      payload.propagationNumber = await generateNextPropagationNumber();
    }

    if (!payload.clientName || !payload.title) {
      return res.status(400).json({
        success: false,
        message: 'clientName and title are required fields',
      });
    }

    const propagation = new Propagation(payload);
    const saved = await propagation.save();

    res.status(201).json({
      success: true,
      message: 'Commercial propagation created successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/propagations/:id
export const updatePropagation = async (req, res, next) => {
  try {
    const propagation = await Propagation.findById(req.params.id);
    if (!propagation) {
      return res.status(404).json({ success: false, message: 'Propagation not found' });
    }

    const body = req.body || {};
    if ('clientName' in body && !String(body.clientName || '').trim()) {
      return res.status(400).json({ success: false, message: 'clientName cannot be empty' });
    }
    if ('title' in body && !String(body.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'title cannot be empty' });
    }
    if ('status' in body && !['Draft', 'Sent', 'Accepted', 'Declined'].includes(body.status)) {
      return res.status(400).json({ success: false, message: 'status must be Draft, Sent, Accepted or Declined' });
    }
    delete body._id;
    delete body.propagationNumber;
    Object.assign(propagation, body);
    const saved = await propagation.save();

    res.status(200).json({
      success: true,
      message: 'Propagation updated successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/propagations/:id
export const deletePropagation = async (req, res, next) => {
  try {
    const propagation = await Propagation.findByIdAndDelete(req.params.id);
    if (!propagation) {
      return res.status(404).json({ success: false, message: 'Propagation not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Propagation deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/propagations/:id/convert (1-Click Conversion Engine)
export const convertPropagationToInvoice = async (req, res, next) => {
  try {
    const propagation = await Propagation.findById(req.params.id);
    if (!propagation) {
      return res.status(404).json({ success: false, message: 'Propagation not found' });
    }

    // Idempotency: if already converted, return existing invoice
    if (propagation.status === 'Accepted') {
      const existing = await Invoice.findOne({ propagationId: propagation._id });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: `Propagation already converted to invoice ${existing.invoiceNumber}`,
          invoice: existing,
          propagation,
        });
      }
    }

    // Generate next sequential invoice number
    const nextInvoiceNumber = await generateNextInvoiceNumber();

    // Map items from propagation
    const invoiceItems = (propagation.items || []).map((item, index) => ({
      sNo: index + 1,
      description: item.description,
      hsn: '998314',
      price: item.rate,
      qty: item.qty || item.quantity || 1,
      gstPercent: 18,
      gstRate: 18,
      total: (item.qty || item.quantity || 1) * item.rate,
    }));

    const todayStr = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueStr = dueDate.toISOString().split('T')[0];

    // Determine GST category
    const isB2B = Boolean(propagation.companyGst);
    const gstCategory = isB2B ? 'B2B' : 'B2C';

    const invoicePayload = {
      invoiceNumber: nextInvoiceNumber,
      propagationId: propagation._id,
      propagationNumber: propagation.propagationNumber,
      clientId: propagation.clientId || '',
      clientName: propagation.clientName,
      title: propagation.title,
      issueDate: todayStr,
      dueDate: dueStr,
      items: invoiceItems,
      isGst: true,
      gstCategory: gstCategory,
      gstType: 'CGST+SGST',
      gstRate: 18,
      hsn: '998314',
      subtotal: propagation.subtotal,
      paidAmount: 0,
      status: 'Sent',
      notes: `Converted from Commercial Propagation #${propagation.propagationNumber}. ${propagation.notes || ''}`.trim(),
      companyName: propagation.companyName,
      companyAddress: propagation.companyAddress,
      companyGst: propagation.companyGst,
      companyPan: propagation.companyPan,
      companyEmail: propagation.companyEmail,
      companyPhone: propagation.companyPhone,
      companyLogo: propagation.companyLogo,
      signatoryName: propagation.signatoryName,
      signatoryDesignation: propagation.signatoryDesignation,
      signatorySeal: propagation.signatorySeal,
      bankDetails: propagation.bankDetails,
    };

    const newInvoice = new Invoice(invoicePayload);
    const savedInvoice = await newInvoice.save();
    await syncFinanceInvoiceJournal(savedInvoice);

    // Transition parent propagation status to Accepted
    propagation.status = 'Accepted';
    await propagation.save();

    res.status(201).json({
      success: true,
      message: `Commercial propagation converted to invoice ${savedInvoice.invoiceNumber} successfully`,
      invoice: savedInvoice,
      propagation,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/propagations/reset
export const resetPropagations = async (req, res, next) => {
  try {
    await Propagation.deleteMany({});
    for (const p of livePropagations) {
      await Propagation.create(p);
    }
    const fresh = await Propagation.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: 'Propagations reset to live records',
      count: fresh.length,
      data: fresh,
    });
  } catch (error) {
    next(error);
  }
};
