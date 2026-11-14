import mongoose from 'mongoose';

const payrollAdjustmentSchema = new mongoose.Schema({
  staffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, index: true },
  staffId: { type: String, default: '', index: true },
  staffName: { type: String, default: '' },
  branch: { type: String, default: '' },
  period: { type: String, required: true, index: true },
  type: { type: String, enum: ['credit', 'deduction'], default: 'credit', index: true },
  label: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 }
}, { timestamps: true });

export default mongoose.model('PayrollAdjustment', payrollAdjustmentSchema);
