import Asset from '../../models/accounts/Asset.js';
import AssetCategory from '../../models/accounts/AssetCategory.js';
import JournalVoucher from '../../models/accounts/JournalVoucher.js';
import {
  postJournal, replaceJournalForSource, removeJournalForSource, reverseJournalEntry,
  nextEntryNumber, CASH_ACCOUNT_FOR_MODE, annualDepreciation, bookValue, round2
} from '../../utils/accountsEngine.js';

const escapeRx = (v) => new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// ===========================================================================
// ASSET RECORDS
// ===========================================================================

const syncAssetJournal = async (asset) => {
  const cashCode = CASH_ACCOUNT_FOR_MODE[asset.paymentMode] || '1020';
  await replaceJournalForSource('Assets', asset._id.toString(), {
    date: asset.purchaseDate,
    description: `Asset purchase ${asset.assetId} — ${asset.assetName}`,
    sourceModule: 'Assets',
    sourceId: asset._id.toString(),
    reference: asset.assetId,
    branch: asset.branch,
    lines: [
      { accountCode: '1500', debit: asset.purchaseCost, credit: 0 },
      { accountCode: cashCode, debit: 0, credit: asset.purchaseCost }
    ]
  });
};

export const getAllAssets = async (req, res, next) => {
  try {
    const { category, status, branch, q } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = escapeRx(q.trim());
      query.$or = [{ assetId: rx }, { assetName: rx }, { location: rx }];
    }

    const assets = await Asset.find(query).sort({ createdAt: -1 });
    const all = await Asset.find();

    return res.status(200).json({
      success: true,
      message: 'Assets retrieved successfully',
      data: assets,
      kpis: {
        totalFixedAssets: round2(all.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0)),
        netBookValue: round2(all.reduce((s, a) => s + (Number(a.currentValue) || 0), 0)),
        totalUnits: all.reduce((s, a) => s + (Number(a.quantity) || 0), 0),
        depreciationRecorded: round2(all.reduce((s, a) => s + (Number(a.accumulatedDepreciation) || 0), 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.assetName || !String(body.assetName).trim()) {
      return res.status(400).json({ success: false, message: 'Asset name is required' });
    }
    if (!body.category) {
      return res.status(400).json({ success: false, message: 'Asset category is required' });
    }
    if (!body.purchaseDate) {
      return res.status(400).json({ success: false, message: 'Purchase date is required' });
    }
    if (!(Number(body.purchaseCost) >= 0)) {
      return res.status(400).json({ success: false, message: 'Purchase cost is required' });
    }
    if (body.assetId) {
      const clash = await Asset.findOne({ assetId: body.assetId });
      if (clash) {
        return res.status(400).json({ success: false, message: `Asset ID ${body.assetId} already exists` });
      }
    }

    const assetId = body.assetId || (await nextEntryNumber(Asset, 'AST', 'assetId'));
    const asset = await Asset.create({ ...body, assetId });
    asset.currentValue = bookValue(asset);
    await asset.save();
    await syncAssetJournal(asset);

    return res.status(201).json({
      success: true,
      message: `Asset ${asset.assetId} registered successfully`,
      data: asset
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    const allowed = [
      'assetName', 'category', 'quantity', 'purchaseDate', 'purchaseCost',
      'usefulLifeYears', 'depreciationMethod', 'depreciationRate', 'salvageValue',
      'location', 'assignedEmployee', 'paymentType', 'paymentMode', 'status', 'branch', 'notes', 'attachments'
    ];
    for (const field of allowed) {
      if (req.body?.[field] !== undefined) asset[field] = req.body[field];
    }
    await asset.save();
    asset.currentValue = bookValue(asset);
    await asset.save();
    await syncAssetJournal(asset);

    return res.status(200).json({
      success: true,
      message: `Asset ${asset.assetId} updated successfully`,
      data: asset
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    await removeJournalForSource('Assets', asset._id.toString());
    await removeJournalForSource('AssetDepreciation', asset._id.toString(), { sourceIdPrefix: true });
    await Asset.findByIdAndDelete(asset._id);
    return res.status(200).json({
      success: true,
      message: `Asset ${asset.assetId} deleted successfully`,
      data: { id: asset._id }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/accounts/assets/:id/depreciate
 * Runs one depreciation period for an asset and posts the GL entry.
 */
export const depreciateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    if (asset.status === 'Disposed' || asset.status === 'Sold') {
      return res.status(409).json({ success: false, message: `A ${asset.status.toLowerCase()} asset cannot be depreciated` });
    }

    const depreciation = annualDepreciation(asset);
    if (depreciation <= 0) {
      return res.status(400).json({ success: false, message: 'This asset has no depreciable amount remaining' });
    }

    asset.accumulatedDepreciation = round2((asset.accumulatedDepreciation || 0) + depreciation);
    await asset.save();
    asset.currentValue = bookValue(asset);
    await asset.save();

    const entry = await postJournal({
      date: req.body?.period
        ? `${req.body.period}-01`
        : new Date().toISOString().slice(0, 10),
      description: `Depreciation — ${asset.assetId} ${asset.assetName}`,
      // Its own source identity so the asset's purchase entry is never
      // replaced by (or reversed alongside) a depreciation posting.
      sourceModule: 'AssetDepreciation',
      sourceId: `${asset._id.toString()}#${req.body?.period || 'adhoc'}`,
      reference: asset.assetId,
      branch: asset.branch,
      lines: [
        { accountCode: '5600', debit: depreciation, credit: 0 },
        { accountCode: '1600', debit: 0, credit: depreciation }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Depreciation of ${depreciation} recorded — book value now ${asset.currentValue}`,
      data: { asset, entry, depreciation }
    });
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// ASSET CATEGORIES
// ===========================================================================

export const getAllAssetCategories = async (req, res, next) => {
  try {
    let categories = await AssetCategory.find().sort({ code: 1 });
    const all = categories;
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q) categories = all.filter((c) => [c.code, c.name, c.branch, c.description].some((v) => String(v || '').toLowerCase().includes(q)));
    return res.status(200).json({
      success: true,
      message: 'Asset categories retrieved successfully',
      data: categories,
      kpis: {
        total: all.length,
        active: all.filter((c) => c.status === 'Active').length,
        linkedBranches: new Set(all.map((c) => c.branch)).size
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createAssetCategory = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    if (!body.code || !String(body.code).trim()) {
      return res.status(400).json({ success: false, message: 'Category code is required' });
    }
    const clash = await AssetCategory.findOne({ code: body.code });
    if (clash) {
      return res.status(400).json({ success: false, message: `Category code ${body.code} already exists` });
    }
    const category = await AssetCategory.create(body);
    return res.status(201).json({
      success: true,
      message: `Asset category ${category.code} created successfully`,
      data: category
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAssetCategory = async (req, res, next) => {
  try {
    const category = await AssetCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Asset category not found' });
    }
    for (const field of ['code', 'name', 'description', 'branch', 'status']) {
      if (req.body?.[field] !== undefined) category[field] = req.body[field];
    }
    await category.save();
    return res.status(200).json({
      success: true,
      message: `Asset category ${category.code} updated successfully`,
      data: category
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAssetCategory = async (req, res, next) => {
  try {
    const category = await AssetCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Asset category not found' });
    }
    const used = await Asset.countDocuments({ category: category.name });
    if (used > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${category.name}" — ${used} asset(s) still use this category`
      });
    }
    await AssetCategory.findByIdAndDelete(category._id);
    return res.status(200).json({
      success: true,
      message: `Asset category ${category.code} deleted successfully`,
      data: { id: category._id }
    });
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// ADJUSTMENT ENTRY / JV
// ===========================================================================

export const getAllJournalVouchers = async (req, res, next) => {
  try {
    const { status, branch, q } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = escapeRx(q.trim());
      query.$or = [{ entryNumber: rx }, { narration: rx }, { referenceNumber: rx }];
    }

    const vouchers = await JournalVoucher.find(query).sort({ createdAt: -1 });
    const all = await JournalVoucher.find();

    return res.status(200).json({
      success: true,
      message: 'Journal vouchers retrieved successfully',
      data: vouchers,
      kpis: {
        totalJVs: all.length,
        postedEntries: all.filter((v) => v.status === 'Posted').length,
        draftEntries: all.filter((v) => v.status === 'Draft' || v.status === 'Pending Approval').length,
        totalValueAdjusted: round2(all.filter((v) => v.status === 'Posted').reduce((s, v) => s + (Number(v.amount) || 0), 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createJournalVoucher = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.narration || !String(body.narration).trim()) {
      return res.status(400).json({ success: false, message: 'Narration is required' });
    }
    if (!body.debitAccount || !body.creditAccount) {
      return res.status(400).json({ success: false, message: 'Both a debit and a credit account are required' });
    }
    if (body.debitAccount === body.creditAccount) {
      return res.status(400).json({ success: false, message: 'The debit and credit accounts must be different' });
    }
    if (!(Number(body.amount) > 0)) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }
    if (!body.date) {
      return res.status(400).json({ success: false, message: 'Entry date is required' });
    }

    const entryNumber = await nextEntryNumber(JournalVoucher, 'JV', 'entryNumber');
    const voucher = await JournalVoucher.create({ ...body, entryNumber });
    return res.status(201).json({
      success: true,
      message: `Journal voucher ${voucher.entryNumber} created successfully`,
      data: voucher
    });
  } catch (error) {
    return next(error);
  }
};

export const updateJournalVoucher = async (req, res, next) => {
  try {
    const voucher = await JournalVoucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Journal voucher not found' });
    }
    if (voucher.status === 'Posted') {
      return res.status(409).json({
        success: false,
        message: 'This journal voucher is posted and locked. Reverse it to make changes.'
      });
    }
    const allowed = ['date', 'entryType', 'referenceNumber', 'narration', 'debitAccount', 'creditAccount', 'amount', 'status', 'branch', 'attachments'];
    for (const field of allowed) {
      if (req.body?.[field] !== undefined) voucher[field] = req.body[field];
    }
    await voucher.save();
    return res.status(200).json({
      success: true,
      message: `Journal voucher ${voucher.entryNumber} updated successfully`,
      data: voucher
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteJournalVoucher = async (req, res, next) => {
  try {
    const voucher = await JournalVoucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Journal voucher not found' });
    }
    if (voucher.status === 'Posted') {
      return res.status(409).json({
        success: false,
        message: 'This journal voucher is posted and locked. Reverse it instead of deleting it.'
      });
    }
    await JournalVoucher.findByIdAndDelete(voucher._id);
    return res.status(200).json({
      success: true,
      message: `Journal voucher ${voucher.entryNumber} deleted successfully`,
      data: { id: voucher._id }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/accounts/adjustment-entry/:id/post
 * Writes the immutable GL entry and locks the voucher.
 */
export const postJournalVoucher = async (req, res, next) => {
  try {
    const voucher = await JournalVoucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Journal voucher not found' });
    }
    if (voucher.status === 'Posted') {
      return res.status(409).json({ success: false, message: 'This journal voucher is already posted' });
    }
    if (voucher.status === 'Reversed') {
      return res.status(409).json({ success: false, message: 'A reversed journal voucher cannot be posted' });
    }

    const entry = await postJournal({
      date: voucher.date,
      description: `JV ${voucher.entryNumber} — ${voucher.narration}`,
      sourceModule: 'AdjustmentEntry',
      sourceId: voucher._id.toString(),
      reference: voucher.entryNumber,
      branch: voucher.branch,
      lines: [
        { accountCode: voucher.debitAccount, debit: voucher.amount, credit: 0 },
        { accountCode: voucher.creditAccount, debit: 0, credit: voucher.amount }
      ]
    });

    voucher.status = 'Posted';
    voucher.postedEntryId = entry._id;
    await voucher.save();

    return res.status(200).json({
      success: true,
      message: `Journal voucher ${voucher.entryNumber} posted to the general ledger`,
      data: { voucher, entry }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/accounts/adjustment-entry/:id/reverse
 * Creates an offsetting voucher with debit and credit swapped.
 */
export const reverseJournalVoucher = async (req, res, next) => {
  try {
    const voucher = await JournalVoucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Journal voucher not found' });
    }
    if (voucher.status === 'Reversed') {
      return res.status(409).json({ success: false, message: 'This journal voucher is already reversed' });
    }
    if (voucher.status !== 'Posted') {
      return res.status(409).json({ success: false, message: 'Only a posted journal voucher can be reversed' });
    }

    const entryNumber = await nextEntryNumber(JournalVoucher, 'JV', 'entryNumber');
    const reversal = await JournalVoucher.create({
      entryNumber,
      date: new Date().toISOString().slice(0, 10),
      entryType: voucher.entryType,
      referenceNumber: voucher.entryNumber,
      narration: `Reversal of ${voucher.entryNumber} — ${req.body?.reason || 'Reversal requested'}`,
      debitAccount: voucher.creditAccount,
      creditAccount: voucher.debitAccount,
      amount: voucher.amount,
      status: 'Posted',
      branch: voucher.branch
    });

    const entry = await postJournal({
      date: reversal.date,
      description: `Reversal of JV ${voucher.entryNumber}`,
      sourceModule: 'AdjustmentEntry',
      sourceId: reversal._id.toString(),
      reference: voucher.entryNumber,
      branch: voucher.branch,
      lines: [
        { accountCode: reversal.debitAccount, debit: reversal.amount, credit: 0 },
        { accountCode: reversal.creditAccount, debit: 0, credit: reversal.amount }
      ]
    });

    voucher.status = 'Reversed';
    voucher.reversedByEntry = reversal.entryNumber;
    voucher.reversedEntryId = reversal._id;
    await voucher.save();

    return res.status(200).json({
      success: true,
      message: `Journal voucher ${voucher.entryNumber} reversed by ${reversal.entryNumber}`,
      data: { voucher, reversal, entry }
    });
  } catch (error) {
    return next(error);
  }
};
