import Emi from '../../models/accounts/Emi.js';
import { nextEntryNumber, round2 } from '../../utils/accountsEngine.js';
import { computeEmi, progressOf, validateEmiInput } from '../../utils/emiEngine.js';

const escapeRx = (v) => new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const FIELDS = ['productName', 'category', 'principal', 'emiCount', 'interestRate', 'startDate', 'emiDate', 'paidCount', 'initialPayment', 'processingCharges', 'transactionFee', 'branch', 'notes', 'attachments'];

/** Plain object with the live progress fields merged in (derived money is always recomputed, so older records without fees stay correct). */
const decorate = (doc) => {
  const { schedule, ...calc } = computeEmi(doc); // eslint-disable-line no-unused-vars
  return { ...doc.toObject(), ...calc, ...progressOf(doc) };
};

/** Pick + normalise writable fields from a request body. */
const clean = (body, base = {}) => {
  const out = { ...base };
  FIELDS.forEach((f) => { if (body[f] !== undefined) out[f] = body[f]; });
  if (out.paidCount === undefined || out.paidCount === '') out.paidCount = 0;
  ['initialPayment', 'processingCharges', 'transactionFee'].forEach((k) => {
    if (out[k] === undefined || out[k] === '' || out[k] === null) out[k] = 0;
  });
  if (typeof out.productName === 'string') out.productName = out.productName.trim();
  if (typeof out.category === 'string') out.category = out.category.trim();
  if (out.emiDate !== undefined && typeof out.emiDate === 'string') out.emiDate = out.emiDate.trim();
  if (body.startDate && !body.emiDate && (!base.emiDate || base.emiDate === base.startDate)) {
    out.emiDate = out.startDate;
  } else if (!out.emiDate && out.startDate) {
    out.emiDate = out.startDate;
  }
  if (!out.branch || !String(out.branch).trim()) out.branch = 'All Branches';
  return out;
};

const derived = (v) => {
  const { schedule, ...rest } = computeEmi(v); // eslint-disable-line no-unused-vars
  return rest;
};

const badRequest = (res, errors) =>
  res.status(400).json({ success: false, message: errors[0], errors });

// GET /api/accounts/emi?category=&status=&branch=&q=
export const getAllEmis = async (req, res, next) => {
  try {
    const { category, status, branch, q } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = escapeRx(q.trim());
      query.$or = [{ emiNumber: rx }, { productName: rx }, { category: rx }];
    }
    const [docs, all] = await Promise.all([Emi.find(query).sort({ createdAt: -1 }), Emi.find()]);
    let data = docs.map(decorate);
    if (status && status !== 'All') data = data.filter((d) => d.status === status);
    const live = all.map(decorate);
    const open = live.filter((d) => d.status !== 'Completed');
    return res.status(200).json({
      success: true,
      message: 'EMI plans retrieved successfully',
      data,
      kpis: {
        totalPlans: live.length,
        activeEmis: open.length,
        monthlyOutflow: round2(open.reduce((s, d) => s + d.monthlyOutflow, 0)),
        totalCharges: round2(live.reduce((s, d) => s + d.totalCharges, 0)),
        outstanding: round2(live.reduce((s, d) => s + d.outstandingAmount, 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/accounts/emi/calculate — preview only, nothing is saved
export const calculateEmi = (req, res) => {
  const body = clean(req.body);
  const errors = validateEmiInput(body);
  if (errors.length) return badRequest(res, errors);
  return res.status(200).json({ success: true, message: 'EMI calculated', data: computeEmi(body) });
};

// GET /api/accounts/emi/:id — includes the full instalment schedule
export const getEmiById = async (req, res, next) => {
  try {
    const doc = await Emi.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'EMI plan not found' });
    const { schedule } = computeEmi(doc);
    return res.status(200).json({
      success: true,
      message: 'EMI plan retrieved successfully',
      data: { ...decorate(doc), schedule }
    });
  } catch (error) {
    return next(error);
  }
};

export const createEmi = async (req, res, next) => {
  try {
    const body = clean(req.body);
    const errors = validateEmiInput(body);
    if (errors.length) return badRequest(res, errors);
    const emiNumber = await nextEntryNumber(Emi, 'EMI', 'emiNumber');
    const doc = await Emi.create({ ...body, emiNumber, ...derived(body) });
    return res.status(201).json({ success: true, message: 'EMI plan created successfully', data: decorate(doc) });
  } catch (error) {
    return next(error);
  }
};

export const updateEmi = async (req, res, next) => {
  try {
    const doc = await Emi.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'EMI plan not found' });
    const merged = clean(req.body, {
      productName: doc.productName, category: doc.category, principal: doc.principal, emiCount: doc.emiCount,
      interestRate: doc.interestRate, startDate: doc.startDate, emiDate: doc.emiDate || doc.startDate, paidCount: doc.paidCount,
      initialPayment: doc.initialPayment || 0, processingCharges: doc.processingCharges || 0, transactionFee: doc.transactionFee || 0,
      branch: doc.branch, notes: doc.notes, attachments: doc.attachments || []
    });
    const errors = validateEmiInput(merged);
    if (errors.length) return badRequest(res, errors);
    Object.assign(doc, merged, derived(merged));
    await doc.save();
    return res.status(200).json({ success: true, message: 'EMI plan updated successfully', data: decorate(doc) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/accounts/emi/:id/pay — record the next instalment as paid
export const payEmi = async (req, res, next) => {
  try {
    const doc = await Emi.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'EMI plan not found' });
    if (doc.paidCount >= doc.emiCount) {
      return res.status(409).json({ success: false, message: 'All EMIs for this plan are already paid' });
    }
    doc.paidCount += 1;
    await doc.save();
    return res.status(200).json({ success: true, message: `EMI ${doc.paidCount} of ${doc.emiCount} marked as paid`, data: decorate(doc) });
  } catch (error) {
    return next(error);
  }
};

export const deleteEmi = async (req, res, next) => {
  try {
    const doc = await Emi.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'EMI plan not found' });
    return res.status(200).json({ success: true, message: 'EMI plan deleted successfully', data: { id: req.params.id } });
  } catch (error) {
    return next(error);
  }
};
