import mongoose from 'mongoose';
import { attachmentSubSchema } from './attachmentSchema.js';

const emiSchema = new mongoose.Schema({
  emiNumber: { type: String, required: true, unique: true, index: true },
  productName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  principal: { type: Number, required: true, min: 0.01 },
  emiCount: { type: Number, required: true, min: 1 },
  interestRate: { type: Number, required: true, min: 0, max: 100 },
  startDate: { type: String, required: true },
  emiDate: { type: String, default: '' },
  paidCount: { type: Number, default: 0, min: 0 },
  initialPayment: { type: Number, default: 0, min: 0 },
  processingCharges: { type: Number, default: 0, min: 0 },
  transactionFee: { type: Number, default: 0, min: 0 },
  branch: { type: String, default: 'All Branches', index: true },
  notes: { type: String, default: '' },
  attachments: { type: [attachmentSubSchema], default: [] },
  // Derived by the server on every save (see utils/emiEngine.js)
  emiAmount: { type: Number, default: 0 },
  totalPayable: { type: Number, default: 0 },
  financedAmount: { type: Number, default: 0 },
  totalInterest: { type: Number, default: 0 },
  endDate: { type: String, default: '' },
  endMonth: { type: String, default: '' },
  totalCharges: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  durationMonths: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('AcctEmi', emiSchema);
