import mongoose from 'mongoose';
import { attachmentSubSchema } from './attachmentSchema.js';

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'UPI', ''],
    default: 'Cash'
  },
  branch: { type: String, default: 'All Branches', index: true },
  date: { type: String, required: true, index: true },
  notes: { type: String, default: '' },
  accountCode: { type: String, default: '5000' },
  attachments: { type: [attachmentSubSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('AcctExpense', expenseSchema);
