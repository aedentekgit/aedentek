import mongoose from 'mongoose';

// A saved Invoice Sender or Bank account profile. Exactly one profile per type is the default;
// the default is mirrored into AdminSettings (invoiceSender / bankDetails) so templates, invoices
// and documents that read the settings always use it.
const settingsProfileSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['invoiceSender', 'bankDetails'], required: true, index: true },
    label: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDefault: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

export const SettingsProfile = mongoose.model('SettingsProfile', settingsProfileSchema);
