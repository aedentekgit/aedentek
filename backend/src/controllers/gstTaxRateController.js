import { GstTaxRate } from '../models/GstTaxRate.js';
import { getOrInitSettings } from './settingsController.js';

// Mirror the default slab into the GST settings (default HSN / rate / tax type).
export const syncDefaultSlab = async () => {
  const settings = await getOrInitSettings();
  const def = await GstTaxRate.findOne({ isDefault: true });
  const cur = settings.gstSettings && settings.gstSettings.toObject ? settings.gstSettings.toObject() : (settings.gstSettings || {});
  settings.gstSettings = def
    ? { ...cur, defaultHsn: def.hsnCode, defaultGstRate: def.gstRate, defaultTaxType: def.taxType || '' }
    : { ...cur, defaultHsn: '', defaultGstRate: null, defaultTaxType: '' };
  settings.markModified('gstSettings');
  await settings.save();
};

/**
 * @route   POST /api/gst-rates/:id/default
 * @desc    Make a slab the default (only one default at a time)
 */
export const setDefaultTaxRate = async (req, res, next) => {
  try {
    const rate = await GstTaxRate.findById(req.params.id);
    if (!rate) return res.status(404).json({ success: false, message: 'GST Tax Rate slab not found' });
    if (rate.status === 'Inactive') return res.status(400).json({ success: false, message: 'An inactive slab cannot be the default' });
    await GstTaxRate.updateMany({ _id: { $ne: rate._id } }, { isDefault: false });
    rate.isDefault = true;
    await rate.save();
    await syncDefaultSlab();
    return res.status(200).json({ success: true, message: 'Default GST slab updated', data: rate });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/gst-rates
 * @desc    Get all statutory GST & HSN tax slabs
 */
export const getAllTaxRates = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { hsnCode: { $regex: search, $options: 'i' } },
        { serviceName: { $regex: search, $options: 'i' } },
      ];
    }

    const rates = await GstTaxRate.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: rates.length,
      data: rates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/gst-rates/:id
 * @desc    Get single GST tax slab
 */
export const getTaxRateById = async (req, res, next) => {
  try {
    const rate = await GstTaxRate.findById(req.params.id);
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'GST Tax Rate slab not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: rate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/gst-rates
 * @desc    Create a new GST & HSN Tax Slab
 */
export const createTaxRate = async (req, res, next) => {
  try {
    const { hsnCode, gstRate, taxType, serviceName, status, isDefault } = req.body;

    if (isDefault) {
      // Unset previous defaults if this is default
      await GstTaxRate.updateMany({ isDefault: true }, { isDefault: false });
    }

    const isFirst = (await GstTaxRate.countDocuments()) === 0;
    const makeDefault = Boolean(isDefault) || isFirst;
    if (makeDefault && !isDefault) await GstTaxRate.updateMany({ isDefault: true }, { isDefault: false });

    const newRate = new GstTaxRate({
      hsnCode,
      gstRate,
      taxType,
      serviceName,
      status,
      isDefault: makeDefault,
    });

    await newRate.save();
    if (newRate.isDefault) await syncDefaultSlab();

    return res.status(201).json({
      success: true,
      message: 'GST Tax Rate slab created successfully',
      data: newRate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/gst-rates/:id
 * @desc    Update a GST tax slab
 */
export const updateTaxRate = async (req, res, next) => {
  try {
    const rate = await GstTaxRate.findById(req.params.id);
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'GST Tax Rate slab not found',
      });
    }

    const { hsnCode, gstRate, taxType, serviceName, status, isDefault } = req.body;

    if (isDefault && !rate.isDefault) {
      await GstTaxRate.updateMany({ _id: { $ne: rate._id } }, { isDefault: false });
    }

    if (hsnCode !== undefined) rate.hsnCode = hsnCode;
    if (gstRate !== undefined) rate.gstRate = gstRate;
    if (taxType !== undefined) rate.taxType = taxType;
    if (serviceName !== undefined) rate.serviceName = serviceName;
    if (status !== undefined) rate.status = status;
    if (isDefault !== undefined) rate.isDefault = Boolean(isDefault);

    await rate.save();
    if (rate.isDefault) await syncDefaultSlab();

    return res.status(200).json({
      success: true,
      message: 'GST Tax Rate slab updated successfully',
      data: rate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/gst-rates/:id
 * @desc    Delete a GST tax slab
 */
export const deleteTaxRate = async (req, res, next) => {
  try {
    const rate = await GstTaxRate.findByIdAndDelete(req.params.id);
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'GST Tax Rate slab not found',
      });
    }

    if (rate.isDefault) {
      const next = await GstTaxRate.findOne({ status: { $ne: 'Inactive' } }).sort({ createdAt: 1 });
      if (next) { next.isDefault = true; await next.save(); }
      await syncDefaultSlab();
    }

    return res.status(200).json({
      success: true,
      message: 'GST Tax Rate slab deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

