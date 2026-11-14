import { AdminSettings } from '../models/AdminSettings.js';
import { cleanNonStaticSettings, SETTING_SECTIONS } from '../utils/defaultSettings.js';

const MASTER_IDENTIFIER = 'master_admin_settings';

/**
 * Helper to get or initialize master settings
 */
export const getOrInitSettings = async () => {
  let settings = await AdminSettings.findOne({ identifier: MASTER_IDENTIFIER });
  if (!settings) {
    settings = await AdminSettings.create({
      identifier: MASTER_IDENTIFIER,
      ...cleanNonStaticSettings,
    });
  }
  return settings;
};

/**
 * @route   GET /api/settings
 * @desc    Get all admin settings (returns clean non-static object if freshly initialized)
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await getOrInitSettings();
    return res.status(200).json({
      success: true,
      message: 'Admin settings retrieved successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/settings
 * @desc    Update all or multiple sections of admin settings
 */
export const updateSettings = async (req, res, next) => {
  try {
    let settings = await getOrInitSettings();

    const incomingData = req.body || {};

    // Update each provided section
    for (const section of SETTING_SECTIONS) {
      if (incomingData[section] !== undefined) {
        settings[section] = {
          ...(settings[section] ? settings[section].toObject() : {}),
          ...incomingData[section],
        };
      }
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Admin settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/settings/:section
 * @desc    Get a specific settings section (e.g. invoiceSender, theme, smtp)
 */
export const getSection = async (req, res, next) => {
  try {
    const { section } = req.params;

    if (!SETTING_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section '${section}'. Allowed sections: ${SETTING_SECTIONS.join(', ')}`,
      });
    }

    const settings = await getOrInitSettings();
    return res.status(200).json({
      success: true,
      section,
      data: settings[section],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/settings/:section
 * @route   PATCH /api/settings/:section
 * @desc    Update a single settings section
 */
export const updateSection = async (req, res, next) => {
  try {
    const { section } = req.params;

    if (!SETTING_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section '${section}'. Allowed sections: ${SETTING_SECTIONS.join(', ')}`,
      });
    }

    const settings = await getOrInitSettings();
    const sectionUpdates = req.body || {};

    // Merge or replace updates in section
    settings[section] = {
      ...(settings[section] ? settings[section].toObject() : {}),
      ...sectionUpdates,
    };

    await settings.save();

    return res.status(200).json({
      success: true,
      message: `Settings section '${section}' updated successfully`,
      section,
      data: settings[section],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/settings/reset
 * @desc    Reset all settings to the clean non-static representation (Section 17)
 */
export const resetSettings = async (req, res, next) => {
  try {
    let settings = await AdminSettings.findOne({ identifier: MASTER_IDENTIFIER });

    if (settings) {
      for (const section of SETTING_SECTIONS) {
        settings[section] = { ...cleanNonStaticSettings[section] };
      }
      await settings.save();
    } else {
      settings = await AdminSettings.create({
        identifier: MASTER_IDENTIFIER,
        ...cleanNonStaticSettings,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'All admin settings reset to clean non-static defaults successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

