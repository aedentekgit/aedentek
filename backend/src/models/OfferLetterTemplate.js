import mongoose from 'mongoose';

const offerLetterTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Template code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    subject: {
      type: String,
      default: 'Offer of Employment: {position} at {companyName}'
    },
    headerTitle: {
      type: String,
      default: 'EMPLOYMENT OFFER & APPOINTMENT LETTER'
    },
    bodyTemplate: {
      type: String,
      default: `Dear {candidateName},

We are pleased to offer you the position of {position} in the {department} Department at {companyName} ({branch} branch). We were thoroughly impressed by your credentials and believe your expertise will be invaluable to our growth.

Your anticipated start date will be {joiningDate}. You will receive a total Cost to Company (CTC) of {ctc} per annum, structured as per the schedule detailed in Annexure A.

Please review the terms and conditions outlined below and signify your acceptance by returning a signed duplicate copy on or before {expiryDate}.`
    },
    terms: {
      type: [String],
      default: [
        'Probation: You will be on probation for a period of three (3) months from the joining date.',
        'Notice Period: During probation, notice period shall be 15 days. Post-confirmation, notice period shall be 30 days.',
        'Working Hours: Standard working hours are 9:30 AM to 6:30 PM, Monday through Friday.',
        'Confidentiality: You agree to uphold company proprietary information, client intellectual property, and trade secrets.',
        'Documentation: Appointment is contingent upon verified background references and statutory KYC submissions.'
      ]
    },
    salaryStructure: {
      basicPercent: { type: Number, default: 50, min: 0, max: 100 },
      hraPercent: { type: Number, default: 20, min: 0, max: 100 },
      specialAllowancePercent: { type: Number, default: 30, min: 0, max: 100 }
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    signatoryName: {
      type: String,
      default: 'Ines Okafor'
    },
    signatoryDesignation: {
      type: String,
      default: 'Head of Specification & Human Resources'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.OfferLetterTemplate ||
  mongoose.model('OfferLetterTemplate', offerLetterTemplateSchema);
