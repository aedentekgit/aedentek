import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  description: { type: String, default: '' },
  baseRole: { type: String, enum: ['Admin', 'Manager', 'Staff'], default: 'Staff' },
  isSystem: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  color: { type: String, enum: ['primary', 'cobalt', 'teal', 'amber', 'good', 'slate'], default: 'primary' },
  allowedPages: { type: [String], default: [] },
  permissions: {
    workspace: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    finance: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      settings: { type: Boolean, default: false }
    },
    accounts: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      reports: { type: Boolean, default: false }
    },
    hr: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      payroll: { type: Boolean, default: false },
      salary: { type: Boolean, default: false }
    },
    masters: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    settings: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      reset: { type: Boolean, default: false }
    },
    team: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    }
  }
}, { timestamps: true });

roleSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = String(this.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

export default mongoose.model('Role', roleSchema);
