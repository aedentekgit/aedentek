import mongoose from 'mongoose';

const bankTransferSchema = new mongoose.Schema({
  transferNumber: { type: String, required: true, unique: true, index: true },
  fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'AcctBankAccount', required: true },
  fromAccountName: { type: String, default: '' },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'AcctBankAccount', required: true },
  toAccountName: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0.01 },
  transferType: {
    type: String,
    enum: ['Bank to Bank', 'Cash to Bank', 'Bank to Cash'],
    default: 'Bank to Bank'
  },
  referenceNumber: { type: String, default: '' },
  status: { type: String, enum: ['Completed', 'Reversed'], default: 'Completed', index: true },
  branch: { type: String, default: 'All Branches', index: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('AcctBankTransfer', bankTransferSchema);
