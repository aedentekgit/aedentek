import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '18:00' },
  lateAfter: { type: String, default: '09:15' },
  lateDeduction: { type: Number, default: 0, min: 0 },
  lateDeductionPerMin: { type: Number, default: 0, min: 0 },
  shiftAllowance: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('Shift', shiftSchema);
