import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
  staffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, index: true },
  staffId: { type: String, default: '', index: true },
  staffName: { type: String, default: '' },
  branch: { type: String, default: '' },

  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', default: null },
  leaveTypeName: { type: String, default: '' },
  leaveTypeCode: { type: String, default: '' },
  paid: { type: Boolean, default: true },

  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  days: { type: Number, default: 1, min: 0 },
  paidDays: { type: Number, default: 0, min: 0 },
  lopDays: { type: Number, default: 0, min: 0 },

  reason: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  appliedAt: { type: String, default: '' },
  decidedAt: { type: String, default: '' },
  decidedBy: { type: String, default: '' },
  decisionReason: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('LeaveRequest', leaveRequestSchema);
