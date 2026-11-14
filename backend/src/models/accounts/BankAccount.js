import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  accountType: {
    type: String,
    enum: ['Checking / Current', 'Savings', 'Petty Cash', 'Merchant POS Terminal'],
    default: 'Checking / Current'
  },
  bankName: { type: String, default: '' },
  ifsc: { type: String, default: '' },
  openingBalance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  branch: { type: String, default: 'All Branches', index: true }
}, { timestamps: true });

bankAccountSchema.pre('save', function (next) {
  // A new account starts from its opening balance.
  if (this.isNew && this.currentBalance === 0) this.currentBalance = this.openingBalance || 0;
  next();
});

export default mongoose.model('AcctBankAccount', bankAccountSchema);
