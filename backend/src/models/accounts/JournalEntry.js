import mongoose from 'mongoose';

/**
 * General Ledger. Immutable once written — the accounting audit trail.
 * Every business module posts balanced journal lines here.
 */
const journalLineSchema = new mongoose.Schema({
  accountCode: { type: String, required: true },
  accountName: { type: String, default: '' },
  debit: { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 }
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
  entryNumber: { type: String, required: true, unique: true, index: true },
  date: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  sourceModule: { type: String, default: 'Manual', index: true },
  sourceId: { type: String, default: '', index: true },
  reference: { type: String, default: '' },
  branch: { type: String, default: 'All Branches', index: true },

  lines: [journalLineSchema],
  totalDebit: { type: Number, default: 0 },
  totalCredit: { type: Number, default: 0 },
  balanced: { type: Boolean, default: true },

  postedAt: { type: String, default: '' },
  reversedBy: { type: String, default: '' },
  reversalOf: { type: String, default: '' }
}, { timestamps: true });

journalEntrySchema.pre('save', function (next) {
  const debit = this.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const credit = this.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  this.totalDebit = Math.round(debit * 100) / 100;
  this.totalCredit = Math.round(credit * 100) / 100;
  this.balanced = Math.abs(this.totalDebit - this.totalCredit) < 0.01;
  next();
});

export default mongoose.model('AcctJournalEntry', journalEntrySchema);
