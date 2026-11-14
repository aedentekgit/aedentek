import mongoose from 'mongoose';

const expenseCategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  accountCode: { type: String, default: '5000' },
  branch: { type: String, default: 'All Branches', index: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('AcctExpenseCategory', expenseCategorySchema);
