import mongoose from 'mongoose';

// Immutable payslip snapshot captured at payroll-run time.
const payslipSchema = new mongoose.Schema({
  payslipNo: { type: String, default: '' },
  staffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  staffId: { type: String, default: '' },
  staffName: { type: String, default: '' },
  designation: { type: String, default: '' },
  branch: { type: String, default: '' },
  period: { type: String, default: '' },

  grossPay: { type: Number, default: 0 },
  shiftDifferential: { type: Number, default: 0 },
  lopDays: { type: Number, default: 0 },
  lopDeduction: { type: Number, default: 0 },
  credits: { type: Number, default: 0 },
  advanceRecovery: { type: Number, default: 0 },
  fixedDeductions: { type: Number, default: 0 },
  adHocDeductions: { type: Number, default: 0 },
  lateFines: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netPayout: { type: Number, default: 0 },

  attendance: {
    present: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    halfDay: { type: Number, default: 0 },
    onLeave: { type: Number, default: 0 }
  },
  bank: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' }
  }
}, { _id: false });

const payrollRunSchema = new mongoose.Schema({
  period: { type: String, required: true, index: true },
  branch: { type: String, default: 'All Branches', index: true },
  status: { type: String, enum: ['Draft', 'Finalized', 'Paid'], default: 'Draft', index: true },
  autoReconcile: { type: Boolean, default: true },

  employeeCount: { type: Number, default: 0 },
  totalGross: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  totalNet: { type: Number, default: 0 },

  processedAt: { type: String, default: '' },
  finalizedAt: { type: String, default: '' },
  paidAt: { type: String, default: '' },

  payslips: [payslipSchema]
}, { timestamps: true });

export default mongoose.model('PayrollRun', payrollRunSchema);
