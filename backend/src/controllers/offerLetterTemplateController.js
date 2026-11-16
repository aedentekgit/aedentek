import OfferLetterTemplate from '../models/OfferLetterTemplate.js';

// GET /api/hr/offer-letter-templates
export const getAllTemplates = async (req, res, next) => {
  try {
    const templates = await OfferLetterTemplate.find().sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: templates,
      total: templates.length
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/hr/offer-letter-templates/:id
export const getTemplateById = async (req, res, next) => {
  try {
    const template = await OfferLetterTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Offer letter template not found'
      });
    }
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/hr/offer-letter-templates
export const createTemplate = async (req, res, next) => {
  try {
    const {
      name,
      code,
      description,
      subject,
      headerTitle,
      bodyTemplate,
      terms,
      salaryStructure,
      isDefault = false,
      signatoryName,
      signatoryDesignation,
      status = 'Active'
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Template name and code are required'
      });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await OfferLetterTemplate.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Template code '${cleanCode}' already exists`
      });
    }

    if (isDefault) {
      await OfferLetterTemplate.updateMany({}, { $set: { isDefault: false } });
    }

    const template = new OfferLetterTemplate({
      name: name.trim(),
      code: cleanCode,
      description: description || '',
      subject: subject || 'Offer of Employment: {position} at {companyName}',
      headerTitle: headerTitle || 'EMPLOYMENT OFFER & APPOINTMENT LETTER',
      bodyTemplate: bodyTemplate || undefined,
      terms: Array.isArray(terms) && terms.length ? terms : undefined,
      salaryStructure: salaryStructure || { basicPercent: 50, hraPercent: 20, specialAllowancePercent: 30 },
      isDefault: !!isDefault,
      signatoryName: signatoryName || 'Ines Okafor',
      signatoryDesignation: signatoryDesignation || 'Head of Specification & Human Resources',
      status
    });

    const saved = await template.save();
    res.status(201).json({
      success: true,
      message: `Offer letter template '${saved.name}' created successfully`,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/hr/offer-letter-templates/:id
export const updateTemplate = async (req, res, next) => {
  try {
    const template = await OfferLetterTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Offer letter template not found'
      });
    }

    const {
      name,
      code,
      description,
      subject,
      headerTitle,
      bodyTemplate,
      terms,
      salaryStructure,
      isDefault,
      signatoryName,
      signatoryDesignation,
      status
    } = req.body;

    if (code && code.toUpperCase() !== template.code) {
      const existing = await OfferLetterTemplate.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Template code '${code}' already exists`
        });
      }
      template.code = code.toUpperCase();
    }

    if (name) template.name = name.trim();
    if (description !== undefined) template.description = description;
    if (subject) template.subject = subject;
    if (headerTitle) template.headerTitle = headerTitle;
    if (bodyTemplate !== undefined) template.bodyTemplate = bodyTemplate;
    if (terms) template.terms = terms;
    if (salaryStructure) template.salaryStructure = salaryStructure;
    if (signatoryName) template.signatoryName = signatoryName;
    if (signatoryDesignation) template.signatoryDesignation = signatoryDesignation;
    if (status) template.status = status;

    if (isDefault !== undefined && isDefault !== template.isDefault) {
      if (isDefault) {
        await OfferLetterTemplate.updateMany({ _id: { $ne: template._id } }, { $set: { isDefault: false } });
        template.isDefault = true;
      } else {
        template.isDefault = false;
      }
    }

    const updated = await template.save();
    res.status(200).json({
      success: true,
      message: `Offer letter template '${updated.name}' updated successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/hr/offer-letter-templates/:id/default
export const setDefaultTemplate = async (req, res, next) => {
  try {
    const template = await OfferLetterTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Offer letter template not found' });
    }

    await OfferLetterTemplate.updateMany({}, { $set: { isDefault: false } });
    template.isDefault = true;
    await template.save();

    res.status(200).json({
      success: true,
      message: `Template '${template.name}' set as system default`,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hr/offer-letter-templates/:id
export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await OfferLetterTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Offer letter template not found' });
    }

    await OfferLetterTemplate.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: `Offer letter template '${template.name}' deleted successfully`,
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};
