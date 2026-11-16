import mongoose from 'mongoose';

const offerLetterSchema = new mongoose.Schema(
  {
    offerNumber: {
      type: String,
      required: [true, 'Offer letter number is required'],
      unique: true,
      trim: true
    },
    candidateName: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true
    },
    candidateEmail: {
      type: String,
      required: [true, 'Candidate email is required'],
      trim: true,
      lowercase: true
    },
    candidatePhone: {
      type: String,
      default: '',
      trim: true
    },
    candidateAddress: {
      type: String,
      default: '',
      trim: true
    },
    position: {
      type: String,
      required: [true, 'Position / Designation is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      default: 'Operations'
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true
    },
    templateRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfferLetterTemplate',
      default: null
    },
    templateName: {
      type: String,
      default: 'Standard Corporate Offer'
    },
    joiningDate: {
      type: String,
      required: [true, 'Joining date is required']
    },
    expiryDate: {
      type: String,
      default: ''
    },
    issueDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0]
    },
    ctc: {
      type: Number,
      required: [true, 'Annual CTC is required'],
      min: [0, 'CTC cannot be negative']
    },
    salaryBreakdown: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      monthlyGross: { type: Number, default: 0 },
      annualGross: { type: Number, default: 0 }
    },
    terms: {
      type: [String],
      default: []
    },
    subject: {
      type: String,
      default: ''
    },
    bodyText: {
      type: String,
      default: ''
    },
    signatoryName: {
      type: String,
      default: 'Ines Okafor'
    },
    signatoryDesignation: {
      type: String,
      default: 'Head of Specification & Human Resources'
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Accepted', 'Declined', 'Cancelled'],
      default: 'Draft',
      index: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.OfferLetter ||
  mongoose.model('OfferLetter', offerLetterSchema);
