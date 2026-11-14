import ServiceType from '../models/ServiceType.js';

export const SEED_SERVICE_TYPES = [
  { name: 'AWS Cloud', code: 'AWS', description: 'Amazon Web Services consoles and IAM users', status: 'Active' },
  { name: 'MySQL', code: 'MYSQL', description: 'MySQL / Aurora database access', status: 'Active' },
  { name: 'PostgreSQL', code: 'PG', description: 'PostgreSQL database access', status: 'Active' },
  { name: 'GitHub', code: 'GIT', description: 'Source repositories and deployment keys', status: 'Active' },
  { name: 'cPanel / Hosting', code: 'CPANEL', description: 'Shared hosting and cPanel logins', status: 'Active' },
  { name: 'Custom API', code: 'API', description: 'Third-party API keys and tokens', status: 'Active' },
  { name: 'Vimeo Video', code: 'VIMEO', description: 'Video streaming platform logins', status: 'Inactive' }
];

const ensureSeeded = async () => {
  if ((await ServiceType.countDocuments()) === 0) await ServiceType.insertMany(SEED_SERVICE_TYPES);
};

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const collation = { locale: 'en', strength: 2 };

// GET /api/service-types?status=Active&q=
export const listServiceTypes = async (req, res, next) => {
  try {
    await ensureSeeded();
    const { status, q } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (q && String(q).trim()) {
      const re = new RegExp(escapeRe(String(q).trim()), 'i');
      query.$or = [{ name: re }, { code: re }, { description: re }];
    }
    const data = await ServiceType.find(query).sort({ name: 1 });
    const everything = await ServiceType.find({}, 'status');
    const kpis = { total: everything.length, active: everything.filter((x) => x.status === 'Active').length, inactive: everything.filter((x) => x.status !== 'Active').length };
    res.json({ success: true, data, count: data.length, kpis });
  } catch (e) { next(e); }
};

export const getServiceType = async (req, res, next) => {
  try {
    const doc = await ServiceType.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ success: false, message: 'Service type not found' });
    res.json({ success: true, data: doc });
  } catch (e) { next(e); }
};

export const createServiceType = async (req, res, next) => {
  try {
    const { name, code = '', description = '', status = 'Active' } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Service type name is required' });
    if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be Active or Inactive' });
    const dup = await ServiceType.findOne({ name: String(name).trim() }).collation(collation);
    if (dup) return res.status(409).json({ success: false, message: `Service type '${dup.name}' already exists` });
    const doc = await ServiceType.create({ name: String(name).trim(), code, description, status });
    res.status(201).json({ success: true, message: 'Service type created', data: doc });
  } catch (e) { next(e); }
};

export const updateServiceType = async (req, res, next) => {
  try {
    const doc = await ServiceType.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ success: false, message: 'Service type not found' });
    const b = req.body || {};
    if ('name' in b) {
      if (!String(b.name || '').trim()) return res.status(400).json({ success: false, message: 'Service type name is required' });
      const dup = await ServiceType.findOne({ name: String(b.name).trim(), _id: { $ne: doc._id } }).collation(collation);
      if (dup) return res.status(409).json({ success: false, message: `Service type '${dup.name}' already exists` });
      doc.name = String(b.name).trim();
    }
    if ('status' in b) {
      if (!['Active', 'Inactive'].includes(b.status)) return res.status(400).json({ success: false, message: 'Status must be Active or Inactive' });
      doc.status = b.status;
    }
    if ('code' in b) doc.code = b.code;
    if ('description' in b) doc.description = b.description;
    await doc.save();
    res.json({ success: true, message: 'Service type updated', data: doc });
  } catch (e) { next(e); }
};

export const deleteServiceType = async (req, res, next) => {
  try {
    const doc = await ServiceType.findByIdAndDelete(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ success: false, message: 'Service type not found' });
    res.json({ success: true, message: `Service type '${doc.name}' deleted`, data: { _id: doc._id } });
  } catch (e) { next(e); }
};
