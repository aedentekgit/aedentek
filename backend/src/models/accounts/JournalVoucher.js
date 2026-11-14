import mongoose from 'mongoose';
import { attachmentSubSchema } from './attachmentSchema.js';

/**
 * Adjustment Entry / JV — manual double-entry access.
 * Once Posted the voucher is immutable and can only be altered by reversal.
 */
const journalVoucherSchema = new mongoose.Schema({
  entryNumber: { type: String, required: true, unique: true, index: true },
  date: { type: String, required: true, index: true },
  entryType: {
    type: String,
    enum: [
      'Journal Voucher', 'Adjustment', 'Depreciation', 'Correction', 'Accrual',
      'Provision', 'Bad Debt', 'Tax Adjustment', 'Opening Balance', 'Other'
    ],
    default: 'Journal Voucher'
  },
  referenceNumber: { type: String, default: '' },
  narration: { type: String, required: true },
  debitAccount: { type: String, required: true },
  creditAccount: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Posted', 'Rejected', 'Reversed'],
    default: 'Draft',
    index: true
  },
  branch: { type: String, default: 'All Branches', index: true },
  attachments: { type: [attachmentSubSchema], default: [] },
  postedEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcctJournalEntry', default: null },
  reversedByEntry: { type: String, default: '' },
  reversedEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcctJournalEntry', default: null }
}, { timestamps: true });

export default mongoose.model('AcctJournalVoucher', journalVoucherSchema);
