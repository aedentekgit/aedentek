import { computeDiscount } from '../utils/invoiceDiscount.js';
import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    sNo: { type: Number, default: 1 },
    description: { type: String, required: true },
    hsn: { type: String, default: '998314' },
    price: { type: Number, required: true, default: 0, min: 0 },
    qty: { type: Number, default: 1, min: 0 },
    gstPercent: { type: Number, default: 18, min: 0 },
    gstRate: { type: Number, default: 18, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    propagationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Propagation', default: null },
    propagationNumber: { type: String, default: '' },
    clientId: { type: String, default: '' },
    clientMode: { type: String, enum: ['registered', 'manual'], default: 'registered' },
    clientEmail: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    projectName: { type: String, default: '' },
    clientName: { type: String, required: true, trim: true },
    title: { type: String, default: '', trim: true },
    issueDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    dueDate: { type: String, default: '' },
    items: [invoiceItemSchema],
    isGst: { type: Boolean, default: true },
    gstCategory: {
      type: String,
      enum: ['B2B', 'B2C', 'Export LUT', 'N/A'],
      default: 'B2B',
    },
    clientGstNumber: { type: String, default: '' },
    buyerGstin: { type: String, default: '' },
    buyerPan: { type: String, default: '' },
    buyerAddress: { type: String, default: '' },
    hsn: { type: String, default: '998314' },
    gstRate: { type: Number, default: 18, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    gstType: {
      type: String,
      enum: ['CGST+SGST', 'IGST', 'Export LUT', 'Exempted'],
      default: 'CGST+SGST',
    },
    cgstAmount: { type: Number, default: 0, min: 0 },
    sgstAmount: { type: Number, default: 0, min: 0 },
    igstAmount: { type: Number, default: 0, min: 0 },
    lutNumber: { type: String, default: '' },
    exemptionReason: { type: String, default: '' },
    subtotal: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['none', 'percent', 'flat'], default: 'none' },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'],
      default: 'Sent',
    },
    paymentRef: { type: String, default: '' },
    paymentMode: { type: String, default: '' },
    notes: { type: String, default: '' },
    companyName: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    companyGst: { type: String, default: '' },
    companyPan: { type: String, default: '' },
    companyEmail: { type: String, default: '' },
    companyPhone: { type: String, default: '' },
    companyLogo: { type: String, default: '' },
    companyTagline: { type: String, default: '' },
    companyContactPerson: { type: String, default: '' },
    signatoryName: { type: String, default: '' },
    signatoryDesignation: { type: String, default: '' },
    signatorySeal: { type: String, default: '' },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountType: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
      branch: { type: String, default: '' },
      upiId: { type: String, default: '' },
      qrCode: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: auto-calculate items total, subtotal, GST regimes, total, balance, and status
invoiceSchema.pre('save', function (next) {
  // Sync buyer GSTIN
  if (this.buyerGstin && !this.clientGstNumber) {
    this.clientGstNumber = this.buyerGstin;
  } else if (this.clientGstNumber && !this.buyerGstin) {
    this.buyerGstin = this.clientGstNumber;
  }

  let calculatedSubtotal = 0;
  if (Array.isArray(this.items)) {
    this.items.forEach((item, index) => {
      item.sNo = item.sNo || index + 1;
      const q = Number(item.qty || 1);
      const p = Number(item.price || 0);
      item.total = q * p;
      calculatedSubtotal += item.total;
    });
  }

  this.subtotal = calculatedSubtotal > 0 ? calculatedSubtotal : Number(this.subtotal || 0);

  // Discount comes off the subtotal first; GST is charged on the discounted (taxable) amount
  this.discountAmount = computeDiscount(this.subtotal, this.discountType, this.discountValue);
  if (this.discountType === 'none' || !this.discountType) this.discountValue = 0;
  const taxable = this.subtotal - this.discountAmount;

  // Compute GST based on regime
  if (this.gstCategory === 'Export LUT' || this.gstType === 'Export LUT' || !this.isGst) {
    this.gstRate = 0;
    this.gstAmount = 0;
    this.cgstAmount = 0;
    this.sgstAmount = 0;
    this.igstAmount = 0;
    this.tax = 0;
  } else {
    const rate = Number(this.gstRate !== undefined ? this.gstRate : 18);
    this.gstRate = rate;
    this.gstAmount = Math.round((taxable * rate) / 100);
    this.tax = this.gstAmount;

    if (this.gstType === 'CGST+SGST') {
      this.cgstAmount = Math.round(this.gstAmount / 2);
      this.sgstAmount = this.gstAmount - this.cgstAmount;
      this.igstAmount = 0;
    } else {
      // IGST (Inter-State or B2C)
      this.igstAmount = this.gstAmount;
      this.cgstAmount = 0;
      this.sgstAmount = 0;
    }
  }

  this.totalAmount = taxable + this.tax;

  const paid = Number(this.paidAmount || 0);
  this.paidAmount = paid;
  this.balance = Math.max(0, this.totalAmount - paid);

  // Auto-status adjustment if not manually set to Draft
  if (this.status !== 'Draft') {
    if (this.balance === 0 && this.totalAmount > 0) {
      this.status = 'Paid';
    } else if (paid > 0 && this.balance > 0) {
      this.status = 'Partially Paid';
    } else if (paid === 0 && this.status !== 'Overdue') {
      this.status = 'Sent';
    }
  }

  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;

