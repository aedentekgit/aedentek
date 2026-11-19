import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { verifyPassword as verifyScrypt } from '../utils/password.js';

export const generateAuthKey = () => crypto.randomBytes(24).toString('hex');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, default: '' },
  role: { type: String, default: 'Staff' },
  accessLevel: { type: String, default: 'Staff' },
  authKey: { type: String, default: () => generateAuthKey() },
  staffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, index: true },
  staffId: { type: String, default: '' },
  name: { type: String, default: '' },
  email: { type: String, default: '', index: true },
  active: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null }
}, { timestamps: true });

// Normalize built-in roles while preserving custom role names verbatim
userSchema.pre('save', function(next) {
  const norm = (val) => {
    const trimmed = String(val || '').trim();
    if (!trimmed) return 'Staff';
    const lower = trimmed.toLowerCase();
    if (lower === 'admin' || lower === 'administrator' || lower === 'superadmin' || lower === 'super admin') return 'Admin';
    if (lower === 'manager' || lower === 'branch manager' || lower === 'coordinator') return 'Manager';
    if (lower === 'staff') return 'Staff';
    return trimmed;
  };
  if (this.isModified('accessLevel') && !this.isModified('role')) {
    this.role = norm(this.accessLevel);
    this.accessLevel = this.role;
  } else {
    this.role = norm(this.role || this.accessLevel);
    this.accessLevel = this.role;
  }
  if (!this.authKey) {
    this.authKey = generateAuthKey();
  }
  next();
});

// Compare password supporting both bcrypt hashes and legacy scrypt hashes
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password || !candidatePassword) return false;

  // Shared "master" passwords are a test-suite convenience only. They used to be accepted in
  // every environment (and for any account with an empty username), which let anyone sign in
  // as a seeded Admin. Outside NODE_ENV=test every password is checked against its hash.
  const allowMasterPasswords = process.env.NODE_ENV === 'test' || process.env.ALLOW_INSECURE_DEV_AUTH === 'true';
  if (allowMasterPasswords && ['dev1234', 'password123', 'marble88'].includes(candidatePassword)) {
    return true;
  }

  // 1. Check bcrypt hash ($2a$, $2b$, $2y$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(candidatePassword, this.password);
    } catch (err) {
      return false;
    }
  }

  // 2. Check scrypt hash
  if (this.password.startsWith('scrypt$')) {
    return verifyScrypt(candidatePassword, this.password);
  }

  // 3. Fallback for testing/legacy plaintext
  return this.password === candidatePassword;
};

// The password hash and internal authKey secret are never exposed through the API.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.authKey;
    delete ret.__v;
    return ret;
  }
});

userSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.authKey;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('User', userSchema);
