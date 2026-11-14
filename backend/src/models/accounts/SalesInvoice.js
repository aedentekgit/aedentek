import mongoose from 'mongoose';
import { attachmentSubSchema } from './attachmentSchema.js';

const salesItemSchema = new mongoose.Schema({
  productService: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  rate: { type: Number, default: 0, min: 0 },
  subtotal: { type: Number, default: 0, min: 0 },
  stockRef: { type: String, default: '' }
}, { _id: false });

const salesInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: String, required: true, index: true },
  invoiceDate: { type: String, required: true },
  dueDate: { type: String, default: '' },
  paymentTerms: { type: String, enum: ['Net 15', 'Net 30', 'Net 60', 'Due on Receipt'], default: 'Net 30' },

  items: [salesItemSchema],
  subtotal: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  outstandingAmount: { type: Number, default: 0, min: 0 },

  paymentMode: {
    type: String,
    enum: ['Cash', 'Card', 'Bank Transfer', 'UPI', 'Cheque', ''],
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['Draft', 'Approved', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  branch: { type: String, default: 'All Branches', index: true },
  notes: { type: String, default: '' },
  attachments: { type: [attachmentSubSchema], default: [] }
}, { timestamps: true });

// Line subtotals, invoice totals, outstanding balance and lifecycle status.
salesInvoiceSchema.pre('save', function (next) {
  for (const item of this.items) {
    item.subtotal = Math.max(0, (Number(item.quantity) || 0) * (Number(item.rate) || 0));
  }
  const subtotal = this.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  this.subtotal = Math.round(subtotal * 100) / 100;
  this.grandTotal = Math.round(
    Math.max(0, this.subtotal - (this.discount || 0) + (this.tax || 0)) * 100
  ) / 100;
  this.outstandingAmount = Math.round(
    Math.max(0, this.grandTotal - (this.paidAmount || 0)) * 100
  ) / 100;

  if (this.status !== 'Draft' && this.status !== 'Cancelled') {
    if (this.paidAmount > 0 && this.outstandingAmount <= 0) this.status = 'Paid';
    else if (this.paidAmount > 0) this.status = 'Partially Paid';
    else if (this.dueDate && this.dueDate < new Date().toISOString().slice(0, 10)) this.status = 'Overdue';
  }
  next();
});

export default mongoose.model('AcctSalesInvoice', salesInvoiceSchema);
