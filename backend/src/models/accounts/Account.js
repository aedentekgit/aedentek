import mongoose from 'mongoose';

/**
 * Chart of Accounts — the fixed account master every journal line points at.
 */
const accountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Contra Revenue', 'Expense', 'COGS'],
    required: true
  },
  normalBalance: { type: String, enum: ['Debit', 'Credit'], required: true },
  group: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('AcctAccount', accountSchema);
