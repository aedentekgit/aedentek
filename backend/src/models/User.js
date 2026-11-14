import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, default: '' },
  accessLevel: { type: String, default: 'Staff' },
  staffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, index: true },
  staffId: { type: String, default: '' },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// The password hash is never exposed through the API.
userSchema.set('toJSON', { transform: (doc, ret) => { delete ret.password; delete ret.__v; return ret; } });
userSchema.set('toObject', { transform: (doc, ret) => { delete ret.password; delete ret.__v; return ret; } });

export default mongoose.model('User', userSchema);
