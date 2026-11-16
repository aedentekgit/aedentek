import mongoose from 'mongoose';
import Client from '../models/Client.js';
import ProjectStage from '../models/ProjectStage.js';
import Invoice from '../models/Invoice.js';
import { paginateArray } from '../middleware/paginate.js';
import { addMonths } from '../utils/emiEngine.js';

const findClient = (id) => Client.findOne({
  $or: [{ clientId: id }, ...(String(id).match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
});
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 16);
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const log = (client, title, description, icon, operator) =>
  client.timeline.unshift({ id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`, title, description, timestamp: now(), operator: operator || 'Account Manager', icon });

// ---------------------------------------------------------------- PROJECTS
const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed'];

const readProject = (b, existing = {}) => {
  const out = { ...existing };
  ['title', 'description', 'leadEngineer', 'startDate', 'targetDate', 'status'].forEach((k) => { if (b[k] !== undefined) out[k] = b[k]; });
  if (b.contractValue !== undefined) out.contractValue = Number(b.contractValue);
  if (b.totalMilestones !== undefined) out.totalMilestones = Number(b.totalMilestones);
  if (b.milestonesCompleted !== undefined) out.milestonesCompleted = Number(b.milestonesCompleted);
  return out;
};

const validateProject = (p) => {
  if (!p.title || !String(p.title).trim()) return 'Project title is required';
  if (!Number.isFinite(p.contractValue ?? 0) || (p.contractValue ?? 0) < 0) return 'Contract value must be a non-negative number';
  const total = p.totalMilestones ?? 1;
  const done = p.milestonesCompleted ?? 0;
  if (!Number.isInteger(total) || total < 1) return 'Total milestones must be at least 1';
  if (!Number.isInteger(done) || done < 0 || done > total) return 'Completed milestones must be between 0 and total milestones';
  if (p.status && !PROJECT_STATUSES.includes(p.status)) return `Status must be one of ${PROJECT_STATUSES.join(', ')}`;
  if (p.startDate && p.targetDate && p.targetDate < p.startDate) return 'Target date cannot be before the start date';
  return null;
};

const STAGE_STATUSES = ['Pending', 'In Progress', 'Completed'];
const todayYmd = () => new Date().toISOString().slice(0, 10);

const finalizeProject = (p) => {
  if (p.stages && p.stages.length) {
    // the stage timeline drives completion when the project has one
    const done = p.stages.filter((s) => s.status === 'Completed').length;
    p.progress = Math.round((done / p.stages.length) * 100);
  } else {
    const total = p.totalMilestones || 1;
    p.progress = Math.round(((p.milestonesCompleted || 0) / total) * 100);
  }
  if (p.progress === 100) p.status = 'Completed';
  else if (p.status === 'Completed') p.status = 'In Progress';
  return p;
};

/** Replace the project's stage timeline with the chosen master stage ids (kept stages retain their progress). */
const applyStageIds = async (project, stageIds) => {
  if (!Array.isArray(stageIds)) return 'stageIds must be a list';
  const unique = [...new Set(stageIds.map(String))];
  const valid = unique.filter((x) => mongoose.isValidObjectId(x));
  if (valid.length !== unique.length) return 'One or more selected stages do not exist';
  const docs = await ProjectStage.find({ _id: { $in: valid } });
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const existing = new Map((project.stages || []).map((st) => [String(st.stageId), st]));
  const next = [];
  for (let i = 0; i < unique.length; i += 1) {
    const sid = unique[i];
    const keep = existing.get(sid);
    if (keep) { next.push({ ...(keep.toObject ? keep.toObject() : keep), order: i + 1 }); continue; }
    const d = byId.get(sid);
    if (!d) return 'One or more selected stages do not exist';
    if (d.status !== 'Active') return `Stage '${d.name}' is inactive and cannot be added`;
    next.push({ id: `pstg-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`, stageId: sid, name: d.name, order: i + 1, status: 'Pending', startDate: '', dueDate: '', completedDate: '', notes: '' });
  }
  project.stages = next;
  return null;
};

export const addProject = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const p = readProject(req.body || {}, { contractValue: 0, milestonesCompleted: 0, totalMilestones: 1, status: 'In Progress' });
    const err = validateProject(p);
    if (err) return bad(res, err);
    if (req.body.stageIds !== undefined) {
      const sErr = await applyStageIds(p, req.body.stageIds);
      if (sErr) return bad(res, sErr);
    }
    finalizeProject(p);
    client.projects.push({ ...p, id: `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}`, clientId: client.clientId });
    log(client, 'Project Created', `Project '${p.title}' added`, 'projects', req.body.operator);
    await client.save();
    res.status(201).json({ success: true, message: `Project '${p.title}' created`, data: client });
  } catch (e) { next(e); }
};

export const updateProject = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const proj = client.projects.find((p) => p.id === req.params.projId);
    if (!proj) return bad(res, 'Project not found', 404);
    const merged = readProject(req.body || {}, proj.toObject());
    const err = validateProject(merged);
    if (err) return bad(res, err);
    if (req.body.stageIds !== undefined) {
      const sErr = await applyStageIds(merged, req.body.stageIds);
      if (sErr) return bad(res, sErr);
    }
    finalizeProject(merged);
    Object.assign(proj, merged);
    client.markModified('projects');
    log(client, 'Project Updated', `Project '${merged.title}' modified`, 'edit', req.body.operator);
    await client.save();
    res.json({ success: true, message: `Project '${merged.title}' updated`, data: client });
  } catch (e) { next(e); }
};

export const deleteProject = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const proj = client.projects.find((p) => p.id === req.params.projId);
    if (!proj) return bad(res, 'Project not found', 404);
    client.projects = client.projects.filter((p) => p.id !== req.params.projId);
    client.invoices.forEach((i) => { if (i.projectId === req.params.projId) i.projectId = ''; });
    client.markModified('invoices');
    log(client, 'Project Removed', `Project '${proj.title}' deleted; linked invoices were unassigned`, 'trash', req.body?.operator);
    await client.save();
    res.json({ success: true, message: `Project '${proj.title}' deleted`, data: client });
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------- INVOICE ↔ PROJECT LINK
export const updateInvoiceLink = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const inv = client.invoices.find((i) => i.id === req.params.invId);
    if (!inv) return bad(res, 'Invoice not found', 404);
    const projectId = req.body?.projectId ?? '';
    if (projectId && !client.projects.some((p) => p.id === projectId)) return bad(res, 'Project does not belong to this client');
    inv.projectId = projectId;
    client.markModified('invoices');
    await client.save();
    res.json({ success: true, message: projectId ? 'Invoice linked to project' : 'Invoice unlinked from project', data: client });
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------- CONTRACTS (documents)
const DOC_CATEGORIES = ['MSA', 'SOW', 'NDA', 'LOU', 'Other'];

const fmtSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const sizeFromData = (data) => {
  const b64 = String(data).split(',')[1] || '';
  return fmtSize(Math.floor((b64.length * 3) / 4));
};

const validateDoc = (d) => {
  if (!d.name || !String(d.name).trim()) return 'Contract name is required';
  if (d.category && !DOC_CATEGORIES.includes(d.category)) return `Category must be one of ${DOC_CATEGORIES.join(', ')}`;
  if (d.startDate && d.endDate && d.endDate < d.startDate) return 'End date cannot be before the start date';
  return null;
};

const readDoc = (b, existing = {}) => {
  const out = { ...existing };
  ['name', 'type', 'category', 'startDate', 'endDate', 'notes', 'fileName'].forEach((k) => { if (b[k] !== undefined) out[k] = b[k]; });
  if (b.data !== undefined) {
    out.data = b.data;
    if (b.data) out.size = b.size || sizeFromData(b.data);
  }
  if (b.size !== undefined && !b.data) out.size = b.size;
  if (b.fileName && !b.type) out.type = (String(b.fileName).split('.').pop() || 'PDF').toUpperCase();
  return out;
};

export const addDocument = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);

    // Support array type upload (multiple documents at once)
    const rawList = Array.isArray(req.body)
      ? req.body
      : (Array.isArray(req.body?.documents)
          ? req.body.documents
          : (Array.isArray(req.body?.files) ? req.body.files : null));

    if (rawList && Array.isArray(rawList)) {
      if (!rawList.length) return bad(res, 'At least one document is required');
      const addedDocs = [];
      const today = new Date().toISOString().slice(0, 10);
      const parentMeta = req.body || {};

      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i];
        const d = readDoc(
          {
            category: item.category || parentMeta.category || 'Other',
            startDate: item.startDate || parentMeta.startDate || '',
            endDate: item.endDate || parentMeta.endDate || '',
            notes: item.notes || parentMeta.notes || '',
            ...item
          },
          { type: 'PDF', category: 'Other', size: '—', uploadedAt: today, url: '#' }
        );
        const err = validateDoc(d);
        if (err) return bad(res, `Document ${i + 1} (${d.name || 'unnamed'}): ${err}`);
        const docRecord = {
          ...d,
          id: `doc-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`
        };
        client.documents.push(docRecord);
        addedDocs.push(docRecord);
      }

      log(
        client,
        'Multiple Contracts Added',
        `${addedDocs.length} documents uploaded to repository: ${addedDocs.map(x => x.name).join(', ')}`,
        'note',
        req.body?.operator
      );
      await client.save();
      return res.status(201).json({
        success: true,
        message: `${addedDocs.length} documents uploaded successfully`,
        data: client,
        documents: addedDocs
      });
    }

    // Single document upload (existing flow)
    const d = readDoc(req.body || {}, { type: 'PDF', category: 'MSA', size: '—', uploadedAt: new Date().toISOString().slice(0, 10), url: '#' });
    const err = validateDoc(d);
    if (err) return bad(res, err);
    const newDoc = { ...d, id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
    client.documents.push(newDoc);
    log(client, 'Contract Added', `'${d.name}' (${d.category}) added to repository`, 'note', req.body.operator);
    await client.save();
    res.status(201).json({ success: true, message: `Contract '${d.name}' added`, data: client, document: newDoc });
  } catch (e) { next(e); }
};

export const updateDocument = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const doc = client.documents.find((d) => d.id === req.params.docId);
    if (!doc) return bad(res, 'Contract not found', 404);
    const merged = readDoc(req.body || {}, doc.toObject());
    const err = validateDoc(merged);
    if (err) return bad(res, err);
    Object.assign(doc, merged);
    client.markModified('documents');
    log(client, 'Contract Updated', `'${merged.name}' modified`, 'edit', req.body.operator);
    await client.save();
    res.json({ success: true, message: `Contract '${merged.name}' updated`, data: client });
  } catch (e) { next(e); }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const doc = client.documents.find((d) => d.id === req.params.docId);
    if (!doc) return bad(res, 'Contract not found', 404);
    client.documents = client.documents.filter((d) => d.id !== req.params.docId);
    log(client, 'Contract Removed', `'${doc.name}' deleted from repository`, 'trash', req.body?.operator);
    await client.save();
    res.json({ success: true, message: `Contract '${doc.name}' deleted`, data: client });
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------- SOCIAL CHANNELS
export const addSocial = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const { name, handle = '', desc = '', href = '#', status = 'Active', kind = 'good', cta = 'View Channel', icon = 'globe', tone = 'blue' } = req.body || {};
    if (!name || !String(name).trim()) return bad(res, 'Social channel name is required');
    const newSoc = {
      id: `soc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clientId: client.clientId,
      key: (req.body.key || String(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)) || 'web',
      name: String(name).trim(),
      handle: String(handle).trim(),
      desc: String(desc).trim(),
      href: String(href).trim() || '#',
      status: String(status).trim() || 'Active',
      kind: String(kind).trim() || 'good',
      cta: String(cta).trim() || 'View Channel',
      icon: String(icon).trim() || 'globe',
      tone: String(tone).trim() || 'blue'
    };
    if (!Array.isArray(client.social)) client.social = [];
    client.social.push(newSoc);
    log(client, 'Social Channel Added', `'${newSoc.name}' added to social channels`, 'globe', req.body?.operator);
    await client.save();
    res.status(201).json({ success: true, message: `Social channel '${newSoc.name}' added`, data: client });
  } catch (e) { next(e); }
};

export const updateSocial = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    if (!Array.isArray(client.social)) client.social = [];
    const soc = client.social.find((s) => s.id === req.params.socId);
    if (!soc) return bad(res, 'Social channel not found', 404);
    const b = req.body || {};
    if ('name' in b && !String(b.name).trim()) return bad(res, 'Social channel name cannot be empty');
    ['key', 'name', 'handle', 'desc', 'href', 'status', 'kind', 'cta', 'icon', 'tone'].forEach((k) => {
      if (b[k] !== undefined) soc[k] = b[k];
    });
    client.markModified('social');
    log(client, 'Social Channel Updated', `'${soc.name}' modified`, 'edit', req.body?.operator);
    await client.save();
    res.json({ success: true, message: `Social channel '${soc.name}' updated`, data: client });
  } catch (e) { next(e); }
};

export const deleteSocial = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    if (!Array.isArray(client.social)) client.social = [];
    const idx = client.social.findIndex((s) => s.id === req.params.socId);
    if (idx === -1) return bad(res, 'Social channel not found', 404);
    const removed = client.social[idx];
    client.social.splice(idx, 1);
    client.markModified('social');
    log(client, 'Social Channel Removed', `'${removed.name}' removed`, 'trash', req.body?.operator);
    await client.save();
    res.json({ success: true, message: `Social channel '${removed.name}' deleted`, data: client });
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------- PROJECT STAGE TIMELINE
const findProject = async (req, res) => {
  const client = await findClient(req.params.id);
  if (!client) { bad(res, 'Client not found', 404); return {}; }
  const proj = client.projects.find((p) => p.id === req.params.projId);
  if (!proj) { bad(res, 'Project not found', 404); return {}; }
  return { client, proj };
};

const saveProjectStages = async (client, proj) => {
  const plain = proj.toObject();
  finalizeProject(plain);
  proj.progress = plain.progress;
  proj.status = plain.status;
  client.markModified('projects');
  await client.save();
};

// POST /:id/projects/:projId/stages  { stageId }
export const addProjectStageEntry = async (req, res, next) => {
  try {
    const { client, proj } = await findProject(req, res);
    if (!client) return undefined;
    const holder = { stages: proj.stages.map((x) => x.toObject()) };
    const ids = [...holder.stages.sort((a, b) => a.order - b.order).map((x) => x.stageId), String(req.body?.stageId || '')];
    if (holder.stages.some((x) => x.stageId === String(req.body?.stageId))) return bad(res, 'Stage is already part of this project', 409);
    const err = await applyStageIds(holder, ids);
    if (err) return bad(res, err);
    proj.stages = holder.stages;
    await saveProjectStages(client, proj);
    return res.status(201).json({ success: true, message: 'Stage added to project', data: client });
  } catch (e) { return next(e); }
};

// PUT /:id/projects/:projId/stages/:entryId  { status, startDate, dueDate, notes }
export const updateProjectStageEntry = async (req, res, next) => {
  try {
    const { client, proj } = await findProject(req, res);
    if (!client) return undefined;
    const st = proj.stages.find((x) => x.id === req.params.entryId);
    if (!st) return bad(res, 'Stage not found on this project', 404);
    const b = req.body || {};
    if (b.status !== undefined && !STAGE_STATUSES.includes(b.status)) return bad(res, `Status must be one of ${STAGE_STATUSES.join(', ')}`);
    const start = b.startDate !== undefined ? b.startDate : st.startDate;
    const due = b.dueDate !== undefined ? b.dueDate : st.dueDate;
    if (start && due && due < start) return bad(res, 'Due date cannot be before the start date');
    ['startDate', 'dueDate', 'notes'].forEach((k) => { if (b[k] !== undefined) st[k] = b[k]; });
    if (b.status !== undefined) {
      st.status = b.status;
      if (b.status === 'Completed') st.completedDate = b.completedDate || st.completedDate || todayYmd();
      else st.completedDate = '';
      if (b.status === 'In Progress' && !st.startDate) st.startDate = todayYmd();
    }
    await saveProjectStages(client, proj);
    return res.json({ success: true, message: `Stage '${st.name}' updated`, data: client });
  } catch (e) { return next(e); }
};

// DELETE /:id/projects/:projId/stages/:entryId
export const deleteProjectStageEntry = async (req, res, next) => {
  try {
    const { client, proj } = await findProject(req, res);
    if (!client) return undefined;
    const st = proj.stages.find((x) => x.id === req.params.entryId);
    if (!st) return bad(res, 'Stage not found on this project', 404);
    proj.stages = proj.stages.filter((x) => x.id !== req.params.entryId).map((x, i) => ({ ...x.toObject(), order: i + 1 }));
    await saveProjectStages(client, proj);
    return res.json({ success: true, message: `Stage '${st.name}' removed from project`, data: client });
  } catch (e) { return next(e); }
};

// ---------------------------------------------------------------- AGREEMENT MONTHLY BILLING
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const GST_MODES = ['Without GST', 'With GST'];

const priced = (base, settings) => {
  const baseAmount = r2(base);
  const gstAmount = settings.gstMode === 'With GST' ? r2((baseAmount * (Number(settings.gstRate) || 0)) / 100) : 0;
  return { baseAmount, gstAmount, totalAmount: r2(baseAmount + gstAmount) };
};

export const validateBillingSettings = (b) => {
  if (b.amount !== undefined) {
    const a = Number(b.amount);
    if (!Number.isFinite(a) || a < 0) return 'Monthly amount must be 0 or more';
    if (a > 1e9) return 'Monthly amount is too large';
  }
  if (b.gstMode !== undefined && !GST_MODES.includes(b.gstMode)) return `GST option must be one of ${GST_MODES.join(', ')}`;
  if (b.gstRate !== undefined) {
    const g = Number(b.gstRate);
    if (!Number.isFinite(g) || g < 0 || g > 100) return 'GST rate must be between 0 and 100';
  }
  return null;
};

export const agreementMonths = (from, to) => {
  const out = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '') || to < from) return out;
  for (let i = 0; i < 600; i += 1) {
    const due = addMonths(from, i);
    if (!due || due > to) break;
    out.push({ month: due.slice(0, 7), dueDate: due });
  }
  return out;
};

/** Build / refresh the month-by-month schedule from the agreement From → To dates. Paid and manual rows are never touched. */
export const regenerateSchedule = (client) => {
  const settings = client.monthlyBilling ? client.monthlyBilling.toObject?.() || client.monthlyBilling : {};
  const months = agreementMonths(client.agreementFrom, client.agreementTo);
  const rows = client.monthlySchedule.map((x) => x.toObject());
  const keep = rows.filter((x) => x.manual || x.status === 'Paid');
  const byMonth = new Map(rows.filter((x) => !x.manual).map((x) => [x.month, x]));
  const next = [...keep];
  months.forEach((m, i) => {
    const existing = byMonth.get(m.month);
    if (existing && existing.status === 'Paid') return; // already in keep
    next.push({
      id: existing?.id || `bill-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      month: m.month, dueDate: m.dueDate, status: 'Pending', paidDate: '', notes: existing?.notes || '', manual: false,
      ...priced(settings.amount || 0, settings)
    });
  });
  next.sort((a, b) => (a.month === b.month ? Number(a.manual) - Number(b.manual) : a.month < b.month ? -1 : 1));
  client.monthlySchedule = next;
};

const billingKpis = (client) => {
  const rows = client.monthlySchedule || [];
  const sum = (list) => r2(list.reduce((s, x) => s + (x.totalAmount || 0), 0));
  const paid = rows.filter((x) => x.status === 'Paid');
  const pending = rows.filter((x) => x.status !== 'Paid');
  return {
    months: rows.length, paidMonths: paid.length, pendingMonths: pending.length,
    totalBase: r2(rows.reduce((s, x) => s + (x.baseAmount || 0), 0)),
    totalGst: r2(rows.reduce((s, x) => s + (x.gstAmount || 0), 0)),
    totalValue: sum(rows), totalPaid: sum(paid), totalPending: sum(pending)
  };
};

// GET /:id/billing?status=&page=&limit=
export const getBilling = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    let rows = (client.monthlySchedule || []).map((x) => x.toObject());
    if (req.query.status && req.query.status !== 'All') rows = rows.filter((x) => x.status === req.query.status);
    return res.json({
      success: true, data: rows, kpis: billingKpis(client),
      settings: client.monthlyBilling ? client.monthlyBilling.toObject() : {},
      agreement: { from: client.agreementFrom, to: client.agreementTo }
    });
  } catch (e) { return next(e); }
};

// PUT /:id/billing  { amount, gstMode, gstRate }  → saves the settings and refreshes unpaid months
export const saveBilling = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const b = req.body || {};
    const err = validateBillingSettings(b);
    if (err) return bad(res, err);
    if (!client.agreementFrom || !client.agreementTo) return bad(res, 'Set the agreement From and To dates before configuring monthly billing');
    const cur = client.monthlyBilling ? client.monthlyBilling.toObject() : {};
    client.monthlyBilling = {
      amount: b.amount !== undefined ? Number(b.amount) : cur.amount || 0,
      gstMode: b.gstMode !== undefined ? b.gstMode : cur.gstMode || 'Without GST',
      gstRate: b.gstRate !== undefined ? Number(b.gstRate) : cur.gstRate ?? 18
    };
    regenerateSchedule(client);
    log(client, 'Monthly Billing Configured', `${client.monthlyBilling.gstMode} · ₹${client.monthlyBilling.amount}/month`, 'finance', b.operator);
    await client.save();
    return res.json({ success: true, message: 'Monthly billing saved and schedule generated', data: client, kpis: billingKpis(client) });
  } catch (e) { return next(e); }
};

// DELETE /:id/billing  → clears the settings and every unpaid, auto-generated month
export const clearBilling = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    client.monthlySchedule = client.monthlySchedule.filter((x) => x.status === 'Paid');
    client.monthlyBilling = { amount: 0, gstMode: 'Without GST', gstRate: 18 };
    await client.save();
    return res.json({ success: true, message: 'Monthly billing cleared (paid months are kept)', data: client });
  } catch (e) { return next(e); }
};

const BILL_STATUSES = ['Pending', 'Paid'];

// POST /:id/billing/rows  { month, baseAmount, notes } — extra / manual month
export const addBillingRow = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const b = req.body || {};
    if (!/^\d{4}-\d{2}$/.test(b.month || '')) return bad(res, 'Month must be in YYYY-MM format');
    const settings = client.monthlyBilling ? client.monthlyBilling.toObject() : {};
    const amount = b.baseAmount !== undefined ? Number(b.baseAmount) : settings.amount || 0;
    if (!Number.isFinite(amount) || amount < 0) return bad(res, 'Amount must be 0 or more');
    client.monthlySchedule.push({
      id: `bill-${Date.now()}-${Math.floor(Math.random() * 1000)}`, month: b.month, dueDate: b.dueDate || `${b.month}-01`,
      status: 'Pending', paidDate: '', notes: b.notes || '', manual: true, ...priced(amount, settings)
    });
    client.monthlySchedule = [...client.monthlySchedule].sort((x, y) => (x.month < y.month ? -1 : x.month > y.month ? 1 : 0));
    await client.save();
    return res.status(201).json({ success: true, message: 'Billing month added', data: client, kpis: billingKpis(client) });
  } catch (e) { return next(e); }
};

// PUT /:id/billing/rows/:rowId  { status, paidDate, baseAmount, dueDate, notes }
export const updateBillingRow = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    const row = client.monthlySchedule.find((x) => x.id === req.params.rowId);
    if (!row) return bad(res, 'Billing month not found', 404);
    const b = req.body || {};
    if (b.status !== undefined && !BILL_STATUSES.includes(b.status)) return bad(res, `Status must be one of ${BILL_STATUSES.join(', ')}`);
    if (b.baseAmount !== undefined && (!Number.isFinite(Number(b.baseAmount)) || Number(b.baseAmount) < 0)) return bad(res, 'Amount must be 0 or more');
    const settings = client.monthlyBilling ? client.monthlyBilling.toObject() : {};
    if (b.baseAmount !== undefined) Object.assign(row, priced(b.baseAmount, settings));
    ['dueDate', 'notes'].forEach((k) => { if (b[k] !== undefined) row[k] = b[k]; });
    if (b.status !== undefined) {
      row.status = b.status;
      row.paidDate = b.status === 'Paid' ? b.paidDate || row.paidDate || todayYmd() : '';
    } else if (b.paidDate !== undefined && row.status === 'Paid') row.paidDate = b.paidDate;
    client.markModified('monthlySchedule');
    await client.save();
    return res.json({ success: true, message: 'Billing month updated', data: client, kpis: billingKpis(client) });
  } catch (e) { return next(e); }
};

// DELETE /:id/billing/rows/:rowId
export const deleteBillingRow = async (req, res, next) => {
  try {
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    if (!client.monthlySchedule.some((x) => x.id === req.params.rowId)) return bad(res, 'Billing month not found', 404);
    client.monthlySchedule = client.monthlySchedule.filter((x) => x.id !== req.params.rowId);
    await client.save();
    return res.json({ success: true, message: 'Billing month removed', data: client, kpis: billingKpis(client) });
  } catch (e) { return next(e); }
};

// ---------------------------------------------------------------- PAGINATED EMBEDDED LISTS
const LISTS = {
  websites: 'websites',
  social: 'social',
  credentials: 'credentials',
  projects: 'projects',
  invoices: 'invoices',
  payments: 'payments',
  documents: 'documents',
  contacts: 'contacts',
  tickets: 'tickets',
  timeline: 'timeline',
  monthlySchedule: 'monthlySchedule'
};

// GET /:id/lists/:name?page=&limit=&projectId=
export const getClientList = async (req, res, next) => {
  try {
    const key = LISTS[req.params.name];
    if (!key) return bad(res, 'Unknown list', 404);
    const client = await findClient(req.params.id);
    if (!client) return bad(res, 'Client not found', 404);
    let rows = (client[key] || []).map((x) => (x.toObject ? x.toObject() : x));
    if (key === 'invoices') {
      try {
        const invList = await Invoice.find({
          $or: [
            { clientId: client.clientId },
            { clientName: client.name },
            { clientName: client.company }
          ]
        }).sort({ createdAt: -1 });

        const mappedInvs = invList.map((inv) => ({
          id: inv._id.toString(),
          no: inv.invoiceNumber,
          invoiceNumber: inv.invoiceNumber,
          title: inv.title || inv.projectName || 'Commercial Invoice',
          issueDate: inv.issueDate,
          date: inv.issueDate,
          dueDate: inv.dueDate,
          amount: inv.totalAmount,
          total: inv.totalAmount,
          paid: inv.paidAmount,
          balance: inv.balance,
          status: inv.status,
          projectId: inv.projectName || '',
          isFinanceInvoice: true
        }));

        const existingNos = new Set(mappedInvs.map((i) => i.no || i.invoiceNumber));
        for (const r of rows) {
          if (!existingNos.has(r.no || r.invoiceNumber)) {
            mappedInvs.push(r);
          }
        }
        rows = mappedInvs;
      } catch (err) {}

      if (req.query.projectId) {
        rows = req.query.projectId === 'none' ? rows.filter((x) => !x.projectId) : rows.filter((x) => x.projectId === req.query.projectId);
      }
    }
    if (key === 'documents') rows = rows.map(({ data, ...rest }) => ({ ...rest, hasFile: !!data })); // never ship file bytes in a list
    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e) { return next(e); }
};

void paginateArray;

// ---------------------------------------------------------------- DOCUMENT ROWS FROM THE REGISTER / EDIT PAGE
const fmtSizeOf = (data) => {
  const b64 = String(data).split(',')[1] || '';
  const bytes = Math.floor((b64.length * 3) / 4);
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** Validate rows coming from the client form: [{ id?, name, data?, type?, size? }]. Returns an error string or null. */
export const validateDocumentRows = (rows) => {
  if (!Array.isArray(rows)) return 'documents must be a list';
  for (const r of rows) {
    if (!r || !String(r.name || '').trim()) return 'Every document needs a name';
    if (!r.id && !r.data) return `Document '${r.name}' needs an uploaded file`;
    if (r.data && !/^data:[^;]+;base64,/.test(r.data)) return `Document '${r.name}' has an invalid file`;
  }
  return null;
};

/** Make client.documents match the rows: keep + rename existing (same id), add new, drop the rest. */
export const syncDocumentRows = (client, rows) => {
  const existing = new Map(client.documents.map((d) => [d.id, d.toObject()]));
  const today = new Date().toISOString().slice(0, 10);
  client.documents = rows.map((r, i) => {
    const old = r.id ? existing.get(r.id) : null;
    if (old) {
      return { ...old, name: String(r.name).trim(), ...(r.data ? { data: r.data, size: fmtSizeOf(r.data), type: r.type || old.type, uploadedAt: today } : {}) };
    }
    return {
      id: `doc-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`, name: String(r.name).trim(), category: 'Other',
      type: r.type || 'FILE', size: fmtSizeOf(r.data), uploadedAt: today, url: '#', data: r.data
    };
  });
};
