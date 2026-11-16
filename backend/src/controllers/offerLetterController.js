import OfferLetter from '../models/OfferLetter.js';
import OfferLetterTemplate from '../models/OfferLetterTemplate.js';

// Helper to compute salary breakdown from annual CTC & percentages
function computeSalary(annualCtc, salaryStructure = {}) {
  const ctc = Number(annualCtc) || 0;
  const monthlyGross = Math.round(ctc / 12);
  const basicPct = Number(salaryStructure.basicPercent ?? 50) / 100;
  const hraPct = Number(salaryStructure.hraPercent ?? 20) / 100;

  const basic = Math.round(monthlyGross * basicPct);
  const hra = Math.round(monthlyGross * hraPct);
  const specialAllowance = Math.max(0, monthlyGross - basic - hra);

  return {
    basic,
    hra,
    specialAllowance,
    monthlyGross,
    annualGross: ctc
  };
}

// Helper to render letter body replacing variables
function renderTemplateTokens(bodyTemplate, vars) {
  let text = bodyTemplate || '';
  Object.keys(vars).forEach((key) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    text = text.replace(regex, vars[key] || '');
  });
  return text;
}

// Helper to format currency in Indian style for letter
function fmtCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

// GET /api/hr/offer-letters
export const getAllOfferLetters = async (req, res, next) => {
  try {
    const { q, status, branch, department, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (branch && branch !== 'All Branches') {
      filter.branch = branch;
    }
    if (department && department !== 'All') {
      filter.department = department;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { candidateName: regex },
        { candidateEmail: regex },
        { position: regex },
        { offerNumber: regex }
      ];
    }

    const offers = await OfferLetter.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await OfferLetter.countDocuments(filter);

    // Compute summary KPI counts
    const allOffers = await OfferLetter.find({}, 'status ctc');
    const totalOffers = allOffers.length;
    const draftCount = allOffers.filter((o) => o.status === 'Draft').length;
    const sentCount = allOffers.filter((o) => o.status === 'Sent').length;
    const acceptedCount = allOffers.filter((o) => o.status === 'Accepted').length;
    const declinedCount = allOffers.filter((o) => o.status === 'Declined').length;
    const totalCtcCommitted = allOffers
      .filter((o) => o.status === 'Accepted' || o.status === 'Sent')
      .reduce((sum, o) => sum + (Number(o.ctc) || 0), 0);

    res.status(200).json({
      success: true,
      data: offers,
      total,
      page: Number(page),
      limit: Number(limit),
      kpis: {
        totalOffers,
        draftCount,
        sentCount,
        acceptedCount,
        declinedCount,
        totalCtcCommitted
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/hr/offer-letters/:id
export const getOfferLetterById = async (req, res, next) => {
  try {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer letter not found' });
    }
    res.status(200).json({ success: true, data: offer });
  } catch (error) {
    next(error);
  }
};

// POST /api/hr/offer-letters
export const createOfferLetter = async (req, res, next) => {
  try {
    const {
      candidateName,
      candidateEmail,
      candidatePhone = '',
      candidateAddress = '',
      position,
      department = 'Operations',
      branch,
      templateId,
      joiningDate,
      expiryDate = '',
      ctc,
      status = 'Draft',
      notes = ''
    } = req.body;

    if (!candidateName || !candidateEmail || !position || !branch || !joiningDate || ctc === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Candidate Name, Email, Position, Branch, Joining Date, and Annual CTC are required'
      });
    }

    // Resolve template
    let template = null;
    if (templateId) {
      template = await OfferLetterTemplate.findById(templateId);
    }
    if (!template) {
      template = await OfferLetterTemplate.findOne({ isDefault: true }) ||
                 await OfferLetterTemplate.findOne() ||
                 {
                   name: 'Standard Corporate Offer',
                   salaryStructure: { basicPercent: 50, hraPercent: 20, specialAllowancePercent: 30 },
                   bodyTemplate: 'Dear {candidateName},\n\nWe offer you {position} in {department} at {companyName}.',
                   terms: ['Standard employment terms apply.'],
                   signatoryName: 'Ines Okafor',
                   signatoryDesignation: 'Head of Specification & Human Resources'
                 };
    }

    // Auto-generate offerNumber: OL-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = await OfferLetter.countDocuments();
    const offerNumber = `OL-${year}-${String(count + 1).padStart(4, '0')}`;

    // Compute salary breakdown
    const salaryBreakdown = computeSalary(ctc, template.salaryStructure);

    // Compute default acceptance expiry date if not provided (+7 days from now)
    let effectiveExpiryDate = expiryDate;
    if (!effectiveExpiryDate) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      effectiveExpiryDate = d.toISOString().split('T')[0];
    }

    // Token substitutions for rendered body
    const tokens = {
      candidateName: candidateName.trim(),
      position: position.trim(),
      department: department.trim(),
      branch: branch.trim(),
      companyName: 'Aedentek CRM (Calder & Moss)',
      joiningDate,
      expiryDate: effectiveExpiryDate,
      ctc: fmtCurrency(ctc),
      signatoryName: template.signatoryName || 'Ines Okafor',
      signatoryDesignation: template.signatoryDesignation || 'Head of Specification & Human Resources'
    };

    const renderedSubject = renderTemplateTokens(template.subject || 'Offer of Employment: {position} at {companyName}', tokens);
    const renderedBody = renderTemplateTokens(template.bodyTemplate || '', tokens);

    const newOffer = new OfferLetter({
      offerNumber,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim(),
      candidatePhone: candidatePhone.trim(),
      candidateAddress: candidateAddress.trim(),
      position: position.trim(),
      department: department.trim(),
      branch: branch.trim(),
      templateRef: template._id || null,
      templateName: template.name,
      joiningDate,
      expiryDate: effectiveExpiryDate,
      ctc: Number(ctc),
      salaryBreakdown,
      terms: template.terms || [],
      subject: renderedSubject,
      bodyText: renderedBody,
      signatoryName: template.signatoryName || 'Ines Okafor',
      signatoryDesignation: template.signatoryDesignation || 'Head of Specification & Human Resources',
      status,
      notes: notes.trim()
    });

    const saved = await newOffer.save();
    res.status(201).json({
      success: true,
      message: `Offer letter ${saved.offerNumber} created successfully for ${saved.candidateName}`,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/hr/offer-letters/:id
export const updateOfferLetter = async (req, res, next) => {
  try {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer letter not found' });
    }

    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      candidateAddress,
      position,
      department,
      branch,
      joiningDate,
      expiryDate,
      ctc,
      status,
      notes,
      terms,
      bodyText,
      signatoryName,
      signatoryDesignation
    } = req.body;

    if (candidateName) offer.candidateName = candidateName.trim();
    if (candidateEmail) offer.candidateEmail = candidateEmail.trim();
    if (candidatePhone !== undefined) offer.candidatePhone = candidatePhone.trim();
    if (candidateAddress !== undefined) offer.candidateAddress = candidateAddress.trim();
    if (position) offer.position = position.trim();
    if (department) offer.department = department.trim();
    if (branch) offer.branch = branch.trim();
    if (joiningDate) offer.joiningDate = joiningDate;
    if (expiryDate !== undefined) offer.expiryDate = expiryDate;
    if (status) offer.status = status;
    if (notes !== undefined) offer.notes = notes.trim();
    if (terms) offer.terms = terms;
    if (bodyText !== undefined) offer.bodyText = bodyText;
    if (signatoryName) offer.signatoryName = signatoryName;
    if (signatoryDesignation) offer.signatoryDesignation = signatoryDesignation;

    if (ctc !== undefined && Number(ctc) !== offer.ctc) {
      offer.ctc = Number(ctc);
      offer.salaryBreakdown = computeSalary(offer.ctc);
    }

    const updated = await offer.save();
    res.status(200).json({
      success: true,
      message: `Offer letter ${updated.offerNumber} updated successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hr/offer-letters/:id
export const deleteOfferLetter = async (req, res, next) => {
  try {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer letter not found' });
    }

    await OfferLetter.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: `Offer letter ${offer.offerNumber} deleted successfully`,
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};
