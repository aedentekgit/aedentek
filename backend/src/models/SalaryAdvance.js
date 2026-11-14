import mongoose from 'mongoose';

const salaryAdvanceSchema = new mongoose.Schema({
  staffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, index: true },
  staffId: { type: String, default: '', index: true },
  staffName: { type: String, default: '' },
  branch: { type: String, default: '' },

  amount: { type: Number, required: true, min: 0 },
  installments: { type: Number, default: 1, min: 1 },
  perInstallment: { type: Number, default: 0, min: 0 },
  recovered: { type: Number, default: 0, min: 0 },
  balance: { type: Number, default: 0, min: 0 },

  issuedDate: { type: String, default: '' },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Closed'], default: 'Active', index: true }
}, { timestamps: true });

// Per-installment is ceil(amount / installments); balance is amount - recovered.
salaryAdvanceSchema.pre('save', function (next) {
  const amount = Math.max(0, this.amount || 0);
  const installments = Math.max(1, this.installments || 1);
  this.perInstallment = Math.ceil(amount / installments);
  this.balance = Math.max(0, amount - (this.recovered || 0));
  if (this.balance <= 0) this.status = 'Closed';
  next();
});

export default mongoose.model('SalaryAdvance', salaryAdvanceSchema);
