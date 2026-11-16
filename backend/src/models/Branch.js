import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Branch name is required'], trim: true, unique: true, index: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  city: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  manager: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Branch', branchSchema);
