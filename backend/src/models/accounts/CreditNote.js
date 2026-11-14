import mongoose from 'mongoose';
import { attachmentSubSchema } from './attachmentSchema.js';

const creditItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  rate: { type: Number, default: 0, min: 0 },
  totalCredit: { type: Number, default: 0, min: 0 }
}, { _id: false });

const creditNoteSchema = new mongoose.Schema({
  creditNoteNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: String, required: true, index: true },
  referenceInvoice: { type: String, default: '' },
  referenceInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcctSalesInvoice', default: null },
  reason: {
    type: String,
    enum: [
      'Customer Return', 'Billing Adjustment', 'Service Dissatisfaction',
      'Goodwill Discount', 'Package Downgrade', 'Overcharge Correction', 'Other'
    ],
    default: 'Customer Return'
  },
  items: [creditItemSchema],
  totalCredit: { type: Number, default: 0, min: 0 },
  settlementMethod: {
    type: String,
    enum: ['Apply to Invoice', 'Direct Refund', 'Store Credit'],
    default: 'Apply to Invoice'
  },
  refundedAmount: { type: Number, default: 0, min: 0 },
  appliedAmount: { type: Number, default: 0, min: 0 },
  paymentMode: { type: String, default: 'Cash' },
  status: {
    type: String,
    enum: ['Draft', 'Approved', 'Applied', 'Refunded', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  branch: { type: String, default: 'All Branches', index: true },
  notes: { type: String, default: '' },
  attachments: { type: [attachmentSubSchema], default: [] }
}, { timestamps: true });

creditNoteSchema.pre('save', function (next) {
  for (const item of this.items) {
    item.totalCredit = Math.round((Number(item.quantity) || 0) * (Number(item.rate) || 0) * 100) / 100;
  }
  this.totalCredit = Math.round(this.items.reduce((s, i) => s + (Number(i.totalCredit) || 0), 0) * 100) / 100;
  next();
});

export default mongoose.model('AcctCreditNote', creditNoteSchema);
