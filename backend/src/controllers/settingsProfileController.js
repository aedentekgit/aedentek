import { SettingsProfile } from '../models/SettingsProfile.js';
import { AdminSettings } from '../models/AdminSettings.js';
import { cleanNonStaticSettings } from '../utils/defaultSettings.js';
import { getOrInitSettings } from './settingsController.js';

const FIELDS = {
  invoiceSender: ['companyName', 'companyTagline', 'status', 'companyContactPerson', 'companyEmail', 'companyPhone', 'companyGst',
    'companyPan', 'companyLogo', 'companyAddress', 'signatoryName', 'signatoryDesignation', 'signatorySeal'],
  bankDetails: ['bankName', 'accountName', 'accountType', 'accountNumber', 'ifsc', 'swiftCode', 'status', 'branch', 'upiId', 'qrCode', 'bankAddress']
};
const ENUMS = {
  status: ['Active', 'Secondary', ''],
  accountType: ['Current', 'Savings', '']
};
const REQUIRED = {
  invoiceSender: [['companyName', 'Company name'], ['companyEmail', 'Billing email'], ['companyAddress', 'Registered address']],
  bankDetails: [['bankName', 'Bank name'], ['accountName', 'Account name'], ['accountNumber', 'Account number']]
};
const labelOf = (type, d) => (type === 'invoiceSender' ? d.companyName : [d.bankName, d.accountNumber ? `•••• ${String(d.accountNumber).slice(-4)}` : ''].filter(Boolean).join(' '));

// Whitelist + normalise the incoming data; returns { data } or { error }.
const clean = (type, input, base = {}) => {
  const data = { ...base };
  for (const key of FIELDS[type]) {
    if (input && input[key] !== undefined) data[key] = input[key] == null ? '' : String(input[key]).trim();
  }
  for (const [key, label] of REQUIRED[type]) {
    if (!String(data[key] || '').trim()) return { error: `${label} is required` };
  }
  for (const [key, allowed] of Object.entries(ENUMS)) {
    if (FIELDS[type].includes(key) && data[key] !== undefined && !allowed.includes(data[key])) return { error: `${key} must be one of: ${allowed.filter(Boolean).join(', ')}` };
  }
  if (type === 'invoiceSender' && data.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.companyEmail)) return { error: 'Billing email is not a valid email address' };
  if (type === 'invoiceSender' && data.companyGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(data.companyGst).toUpperCase())) return { error: 'Company GSTIN must be a valid 15-character GSTIN' };
  if (type === 'invoiceSender' && data.companyPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(data.companyPan).toUpperCase())) return { error: 'Company PAN must be a valid 10-character PAN' };
  return { data };
};

// Mirror the default profile (or an empty record when none) into the master settings.
export const syncDefaultToSettings = async (type) => {
  const settings = await getOrInitSettings();
  const def = await SettingsProfile.findOne({ type, isDefault: true });
  settings[type] = def ? { ...cleanNonStaticSettings[type], ...def.data } : { ...cleanNonStaticSettings[type] };
  settings.markModified(type);
  await settings.save();
};

const assertType = (type) => (FIELDS[type] ? null : 'type must be invoiceSender or bankDetails');

// One-time migration: a pre-existing single record in settings becomes the first (default) profile.
const migrateIfEmpty = async (type) => {
  if ((await SettingsProfile.countDocuments({ type })) > 0) return;
  const settings = await getOrInitSettings();
  const cur = settings[type] ? (settings[type].toObject ? settings[type].toObject() : settings[type]) : {};
  const key = type === 'invoiceSender' ? 'companyName' : 'accountNumber';
  if (String(cur[key] || '').trim()) {
    const { data } = clean(type, cur);
    if (data) await SettingsProfile.create({ type, data, label: labelOf(type, data), isDefault: true });
  }
};

export const listProfiles = async (req, res, next) => {
  try {
    const { type } = req.query;
    if (type) {
      const err = assertType(type);
      if (err) return res.status(400).json({ success: false, message: err });
      await migrateIfEmpty(type);
    }
    const profiles = await SettingsProfile.find(type ? { type } : {}).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, count: profiles.length, data: profiles });
  } catch (error) { return next(error); }
};

export const createProfile = async (req, res, next) => {
  try {
    const { type, data: input, isDefault } = req.body || {};
    const err = assertType(type);
    if (err) return res.status(400).json({ success: false, message: err });
    const { data, error } = clean(type, input);
    if (error) return res.status(400).json({ success: false, message: error });
    await migrateIfEmpty(type);
    const first = (await SettingsProfile.countDocuments({ type })) === 0;
    const makeDefault = first || Boolean(isDefault);
    if (makeDefault) await SettingsProfile.updateMany({ type }, { isDefault: false });
    const profile = await SettingsProfile.create({ type, data, label: labelOf(type, data), isDefault: makeDefault });
    if (makeDefault) await syncDefaultToSettings(type);
    return res.status(201).json({ success: true, message: 'Profile saved', data: profile });
  } catch (error) { return next(error); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const profile = await SettingsProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    const { data, error } = clean(profile.type, req.body && (req.body.data || req.body), profile.data || {});
    if (error) return res.status(400).json({ success: false, message: error });
    profile.data = data;
    profile.label = labelOf(profile.type, data);
    profile.markModified('data');
    await profile.save();
    if (profile.isDefault) await syncDefaultToSettings(profile.type);
    return res.status(200).json({ success: true, message: 'Profile updated', data: profile });
  } catch (error) { return next(error); }
};

export const setDefaultProfile = async (req, res, next) => {
  try {
    const profile = await SettingsProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    await SettingsProfile.updateMany({ type: profile.type }, { isDefault: false });
    profile.isDefault = true;
    await profile.save();
    await syncDefaultToSettings(profile.type);
    return res.status(200).json({ success: true, message: `${profile.label || 'Profile'} is now the default`, data: profile });
  } catch (error) { return next(error); }
};

export const deleteProfile = async (req, res, next) => {
  try {
    const profile = await SettingsProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    if (profile.isDefault) {
      // Promote the oldest remaining profile so documents keep a default.
      const next = await SettingsProfile.findOne({ type: profile.type }).sort({ createdAt: 1 });
      if (next) { next.isDefault = true; await next.save(); }
      await syncDefaultToSettings(profile.type);
    }
    return res.status(200).json({ success: true, message: 'Profile deleted', id: req.params.id });
  } catch (error) { return next(error); }
};
