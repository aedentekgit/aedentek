import mongoose from 'mongoose';
import { attachmentSubSchema } from './attachmentSchema.js';

const stockItemSchema = new mongoose.Schema({
  sku: { type: String, default: '' },
  description: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  unitCost: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 },
  lineTotal: { type: Number, default: 0, min: 0 },
  availableQuantity: { type: Number, default: null }
}, { _id: false });

const splitPaymentSchema = new mongoose.Schema({
  mode: { type: String, default: 'Cash' },
  amount: { type: Number, default: 0, min: 0 },
  reference: { type: String, default: '' },
  chequeNumber: { type: String, default: '' },
  bankName: { type: String, default: '' },
  chequeDate: { type: String, default: '' },
  cardHolder: { type: String, default: '' },
  cardLast4: { type: String, default: '' },
  utrReference: { type: String, default: '' }
}, { _id: false });

const stockInwardSchema = new mongoose.Schema({
  inwardNumber: { type: String, required: true, unique: true, index: true },
  supplier: { type: String, required: true, index: true },
  supplierInvoice: { type: String, default: '' },
  date: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['Supplements', 'Equipment Spares', 'Gym Merchandise', 'Consumables', 'Facility Goods', 'Other'],
    default: 'Other'
  },
  branch: { type: String, default: 'All Branches', index: true },
  items: [stockItemSchema],
  payments: [splitPaymentSchema],
  totalAmount: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['Paid', 'Partially Paid', 'Unpaid Credit', 'Cancelled'],
    default: 'Unpaid Credit',
    index: true
  },
  notes: { type: String, default: '' },
  attachments: { type: [attachmentSubSchema], default: [] }
}, { timestamps: true });

stockInwardSchema.pre('save', function (next) {
  for (const item of this.items) {
    item.lineTotal = Math.round((Number(item.quantity) || 0) * (Number(item.unitCost) || 0) * 100) / 100;
    if (item.availableQuantity === null || item.availableQuantity === undefined) {
      item.availableQuantity = item.quantity;
    }
  }
  this.totalAmount = Math.round(this.items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0) * 100) / 100;
  this.paidAmount = Math.round(this.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) * 100) / 100;
  this.balanceDue = Math.round(Math.max(0, this.totalAmount - this.paidAmount) * 100) / 100;
  if (this.status !== 'Cancelled') {
    if (this.paidAmount <= 0) this.status = 'Unpaid Credit';
    else if (this.balanceDue <= 0) this.status = 'Paid';
    else this.status = 'Partially Paid';
  }
  next();
});

export default mongoose.model('AcctStockInward', stockInwardSchema);
