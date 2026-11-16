import Branch from '../models/Branch.js';
import Staff from '../models/Staff.js';
import LeaveType from '../models/LeaveType.js';
import { safeContains } from '../utils/hrCrud.js';

const ENTITY = 'Branch';
const isDuplicate = (error) => error && error.code === 11000;
const duplicate = (res) =>
  res.status(409).json({ success: false, message: 'A branch with this name already exists' });

const kpis = (docs) => ({
  total: docs.length,
  active: docs.filter((d) => d.status === 'Active').length,
  inactive: docs.filter((d) => d.status !== 'Active').length
});

// GET /api/hr/branches?status=&q=
export const getAllBranches = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.q) {
      const rx = safeContains(req.query.q);
      query.$or = [{ name: rx }, { code: rx }, { city: rx }, { manager: rx }];
    }
    const docs = await Branch.find(query).sort({ name: 1 });
    const all = req.query.status || req.query.q ? await Branch.find() : docs;
    // Staff head-count per branch (by name).
    const counts = await Staff.aggregate([{ $group: { _id: '$branch', n: { $sum: 1 } } }]);
    const byName = new Map(counts.map((c) => [c._id, c.n]));
    const data = docs.map((d) => ({ ...d.toObject(), staffCount: byName.get(d.name) || 0 }));
    const defaultDoc = all.find((d) => d.isDefault && d.status === 'Active') || all.find((d) => d.isDefault) || all[0];
    const defaultBranch = defaultDoc ? defaultDoc.name : '';
    return res.status(200).json({ success: true, message: 'Branches retrieved successfully', data, kpis: kpis(all), defaultBranch });
  } catch (error) {
    return next(error);
  }
};

// GET /api/hr/branches/options — active branch names for dropdowns
export const getBranchOptions = async (req, res, next) => {
  try {
    const docs = await Branch.find({ status: 'Active' }).sort({ name: 1 });
    const defaultDoc = docs.find((d) => d.isDefault) || docs[0];
    const defaultBranch = defaultDoc ? defaultDoc.name : '';
    return res.status(200).json({
      success: true,
      message: 'Branch options retrieved successfully',
      data: docs.map((d) => d.name),
      defaultBranch
    });
  } catch (error) {
    return next(error);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const doc = await Branch.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: `${ENTITY} not found` });
    return res.status(200).json({ success: true, message: `${ENTITY} retrieved successfully`, data: doc });
  } catch (error) {
    return next(error);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const wantsDefault = payload.isDefault === true || payload.isDefault === 'true';
    if (wantsDefault) {
      await Branch.updateMany({}, { isDefault: false });
      payload.isDefault = true;
    } else {
      const count = await Branch.countDocuments();
      payload.isDefault = count === 0;
    }
    const doc = await Branch.create(payload);
    return res.status(201).json({ success: true, message: `${ENTITY} created successfully`, data: doc });
  } catch (error) {
    return isDuplicate(error) ? duplicate(res) : next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const doc = await Branch.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: `${ENTITY} not found` });
    const oldName = doc.name;
    if (req.body.isDefault === true || req.body.isDefault === 'true') {
      await Branch.updateMany({ _id: { $ne: doc._id } }, { isDefault: false });
      req.body.isDefault = true;
    } else if (req.body.isDefault === false || req.body.isDefault === 'false') {
      req.body.isDefault = false;
    }
    Object.assign(doc, req.body);
    await doc.save();
    if (doc.name !== oldName) {
      // Branch names are stored as strings on dependants — keep them in step.
      await Staff.updateMany({ branch: oldName }, { branch: doc.name });
      await LeaveType.updateMany({ branch: oldName }, { branch: doc.name });
    }
    return res.status(200).json({ success: true, message: `${ENTITY} updated successfully`, data: doc });
  } catch (error) {
    return isDuplicate(error) ? duplicate(res) : next(error);
  }
};

export const setDefaultBranch = async (req, res, next) => {
  try {
    const doc = await Branch.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: `${ENTITY} not found` });
    await Branch.updateMany({}, { isDefault: false });
    doc.isDefault = true;
    doc.status = 'Active';
    await doc.save();
    return res.status(200).json({
      success: true,
      message: `${doc.name} set as default branch`,
      data: doc
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const doc = await Branch.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: `${ENTITY} not found` });
    const inUse = await Staff.countDocuments({ branch: doc.name });
    if (inUse > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete ${doc.name}: ${inUse} employee(s) are assigned to it. Reassign them or mark the branch Inactive.`
      });
    }
    await doc.deleteOne();
    return res.status(200).json({
      success: true,
      message: `${ENTITY} deleted successfully`,
      data: { id: req.params.id }
    });
  } catch (error) {
    return next(error);
  }
};
