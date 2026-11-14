import ProjectStage from '../models/ProjectStage.js';

export const SEED_PROJECT_STAGES = [
  { name: 'Requirement Analysis', description: 'Scope, requirements and sign-off', sequence: 1, status: 'Active' },
  { name: 'Design', description: 'UI / UX and solution design', sequence: 2, status: 'Active' },
  { name: 'Development', description: 'Build and integration', sequence: 3, status: 'Active' },
  { name: 'Testing', description: 'QA and user acceptance', sequence: 4, status: 'Active' },
  { name: 'Deployment', description: 'Go-live and release', sequence: 5, status: 'Active' },
  { name: 'Handover', description: 'Documentation and client handover', sequence: 6, status: 'Active' },
  { name: 'Support & Maintenance', description: 'Post go-live support', sequence: 7, status: 'Inactive' }
];

const collation = { locale: 'en', strength: 2 };
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureSeeded = async () => {
  if ((await ProjectStage.countDocuments()) === 0) await ProjectStage.insertMany(SEED_PROJECT_STAGES);
};

// GET /api/project-stages?status=Active&q=
export const listProjectStages = async (req, res, next) => {
  try {
    await ensureSeeded();
    const { status, q } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (q && String(q).trim()) {
      const re = new RegExp(escapeRe(String(q).trim()), 'i');
      query.$or = [{ name: re }, { description: re }];
    }
    const data = await ProjectStage.find(query).sort({ sequence: 1, name: 1 });
    const everything = await ProjectStage.find({}, 'status');
    const kpis = { total: everything.length, active: everything.filter((x) => x.status === 'Active').length, inactive: everything.filter((x) => x.status !== 'Active').length };
    res.json({ success: true, data, count: data.length, kpis });
  } catch (e) { next(e); }
};

export const getProjectStage = async (req, res, next) => {
  try {
    const doc = await ProjectStage.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ success: false, message: 'Project stage not found' });
    res.json({ success: true, data: doc });
  } catch (e) { next(e); }
};

const validate = (b, partial) => {
  if (!partial || 'name' in b) { if (!b.name || !String(b.name).trim()) return 'Stage name is required'; }
  if ('status' in b && !['Active', 'Inactive'].includes(b.status)) return 'Status must be Active or Inactive';
  if ('sequence' in b && b.sequence !== '' && (!Number.isFinite(Number(b.sequence)) || Number(b.sequence) < 0)) return 'Sequence must be 0 or more';
  return null;
};

export const createProjectStage = async (req, res, next) => {
  try {
    const b = req.body || {};
    const err = validate(b, false);
    if (err) return res.status(400).json({ success: false, message: err });
    const name = String(b.name).trim();
    if (await ProjectStage.findOne({ name }).collation(collation)) return res.status(409).json({ success: false, message: `Stage '${name}' already exists` });
    let sequence = Number(b.sequence);
    if (!Number.isFinite(sequence) || b.sequence === '' || b.sequence === undefined) {
      const last = await ProjectStage.findOne().sort({ sequence: -1 });
      sequence = (last?.sequence || 0) + 1;
    }
    const doc = await ProjectStage.create({ name, description: b.description || '', sequence, status: b.status || 'Active' });
    res.status(201).json({ success: true, message: 'Project stage created', data: doc });
  } catch (e) { next(e); }
};

export const updateProjectStage = async (req, res, next) => {
  try {
    const doc = await ProjectStage.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ success: false, message: 'Project stage not found' });
    const b = req.body || {};
    const err = validate(b, true);
    if (err) return res.status(400).json({ success: false, message: err });
    if ('name' in b) {
      const name = String(b.name).trim();
      if (await ProjectStage.findOne({ name, _id: { $ne: doc._id } }).collation(collation)) return res.status(409).json({ success: false, message: `Stage '${name}' already exists` });
      doc.name = name;
    }
    ['description', 'status'].forEach((k) => { if (k in b) doc[k] = b[k]; });
    if ('sequence' in b && b.sequence !== '') doc.sequence = Number(b.sequence);
    await doc.save();
    res.json({ success: true, message: 'Project stage updated', data: doc });
  } catch (e) { next(e); }
};

export const deleteProjectStage = async (req, res, next) => {
  try {
    const doc = await ProjectStage.findByIdAndDelete(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ success: false, message: 'Project stage not found' });
    res.json({ success: true, message: `Project stage '${doc.name}' deleted`, data: { _id: doc._id } });
  } catch (e) { next(e); }
};
