import mongoose from 'mongoose';

const propagationItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    qty: { type: Number, default: 1, min: 0 },
    quantity: { type: Number, default: 1, min: 0 },
    rate: { type: Number, required: true, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const propagationSchema = new mongoose.Schema(
  {
    propagationNumber: { type: String, required: true, unique: true, trim: true },
    quotationNumber: { type: String, trim: true },
    clientId: { type: String, default: '' },
    clientName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    issueDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    validUntil: { type: String, default: '' },
    items: [propagationItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Accepted', 'Declined'],
      default: 'Draft',
    },
    notes: { type: String, default: '' },
    companyName: { type: String, default: 'AEDENTEK Cloud Solutions LLC' },
    companyAddress: { type: String, default: 'Thomas St, Madurai, Tamil Nadu, India' },
    companyGst: { type: String, default: '33AABCA9988C1Z4' },
    companyPan: { type: String, default: 'AABCA9988C' },
    companyEmail: { type: String, default: 'billing@aedentek.com' },
    companyPhone: { type: String, default: '+91 98765 43210' },
    companyLogo: { type: String, default: '' },
    signatoryName: { type: String, default: 'Rahul Sen' },
    signatoryDesignation: { type: String, default: 'Authorised Signatory' },
    signatorySeal: { type: String, default: '' },
    bankDetails: {
      bankName: { type: String, default: 'HDFC Bank' },
      accountName: { type: String, default: 'AEDENTEK Cloud Solutions LLC' },
      accountNumber: { type: String, default: '50200088192831' },
      accountType: { type: String, default: 'Current' },
      ifsc: { type: String, default: 'HDFC0000240' },
      swiftCode: { type: String, default: 'HDFCINBBXXX' },
      branch: { type: String, default: 'Madurai Main Branch' },
      upiId: { type: String, default: 'aedentek@hdfcbank' },
      qrCode: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: auto-compute item amounts, subtotal, total, and sync quotationNumber
propagationSchema.pre('save', function (next) {
  if (this.propagationNumber && !this.quotationNumber) {
    this.quotationNumber = this.propagationNumber;
  } else if (this.quotationNumber && !this.propagationNumber) {
    this.propagationNumber = this.quotationNumber;
  }

  let calculatedSubtotal = 0;
  if (Array.isArray(this.items)) {
    this.items.forEach((item) => {
      const q = Number(item.qty !== undefined ? item.qty : item.quantity || 1);
      const r = Number(item.rate || 0);
      item.qty = q;
      item.quantity = q;
      item.amount = q * r;
      calculatedSubtotal += item.amount;
    });
  }

  if (!this.subtotal || this.isModified('items')) {
    this.subtotal = calculatedSubtotal;
  }
  if (!this.total || this.isModified('items') || this.isModified('subtotal') || this.isModified('tax')) {
    this.total = this.subtotal + (Number(this.tax) || 0);
  }

  next();
});

const Propagation = mongoose.model('Propagation', propagationSchema);
export default Propagation;

