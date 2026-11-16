import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const KEYLEN = 64;
const COST = 16384;

/** Hash a plaintext password using bcrypt (standard production hashing) */
export const hashBcrypt = (plain, saltRounds = 10) => {
  return bcrypt.hashSync(String(plain), saltRounds);
};

/** Hash a plaintext password with a fresh random salt using scrypt */
export const hashPassword = (plain) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plain), salt, KEYLEN, { N: COST }).toString('hex');
  return `scrypt$${COST}$${salt}$${derived}`;
};

/** Constant-time verification of a plaintext password against bcrypt or scrypt hash */
export const verifyPassword = (plain, stored) => {
  if (!stored || typeof stored !== 'string') return false;

  // 1. Bcrypt hash check
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(String(plain), stored);
    } catch {
      return false;
    }
  }

  // 2. Scrypt hash check
  const parts = stored.split('$');
  if (parts.length === 4 && parts[0] === 'scrypt') {
    const [, cost, salt, expected] = parts;
    try {
      const derived = crypto.scryptSync(String(plain), salt, KEYLEN, { N: Number(cost) }).toString('hex');
      const a = Buffer.from(derived, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // 3. Exact match fallback
  return stored === String(plain);
};
