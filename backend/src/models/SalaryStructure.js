import mongoose from 'mongoose';

const salaryStructureSchema = new mongoose.Schema({
  staffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, index: true },
  staffId: { type: String, default: '', index: true },
  staffName: { type: String, default: '' },
  branch: { type: String, default: '', index: true },
  effectiveFrom: { type: String, default: '' },

  basic: { type: Number, default: 0, min: 0 },
  hra: { type: Number, default: 0, min: 0 },
  transportAllowance: { type: Number, default: 0, min: 0 },
  telephoneAllowance: { type: Number, default: 0, min: 0 },
  foodAllowance: { type: Number, default: 0, min: 0 },
  specialAllowance: { type: Number, default: 0, min: 0 },
  otherEarnings: { type: Number, default: 0, min: 0 },
  gross: { type: Number, default: 0, min: 0 },

  pf: { type: Number, default: 0, min: 0 },
  esi: { type: Number, default: 0, min: 0 },
  tds: { type: Number, default: 0, min: 0 },
  otherDeductions: { type: Number, default: 0, min: 0 },
  totalDeductions: { type: Number, default: 0, min: 0 },
  netSalary: { type: Number, default: 0, min: 0 },

  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

// Gross / total deductions / net are authoritative server-side maths.
salaryStructureSchema.pre('save', function (next) {
  const gross = (this.basic || 0) + (this.hra || 0) + (this.transportAllowance || 0)
    + (this.telephoneAllowance || 0) + (this.foodAllowance || 0) + (this.specialAllowance || 0)
    + (this.otherEarnings || 0);
  this.gross = Math.max(0, gross);
  const deductions = (this.pf || 0) + (this.esi || 0) + (this.tds || 0) + (this.otherDeductions || 0);
  this.totalDeductions = Math.max(0, deductions);
  this.netSalary = Math.max(0, this.gross - this.totalDeductions);
  next();
});

export default mongoose.model('SalaryStructure', salaryStructureSchema);
