import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  code: { type: String, default: '', uppercase: true, trim: true },
  monthlyQuota: { type: Number, default: 0, min: 0 },
  annualQuota: { type: Number, default: 0, min: 0 },
  paid: { type: Boolean, default: true },
  branch: { type: String, default: 'All Branches' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('LeaveType', leaveTypeSchema);
