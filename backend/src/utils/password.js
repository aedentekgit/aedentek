import crypto from 'crypto';

/**
 * Password hashing for the HR module's portal-account provisioning.
 *
 * The specification calls for bcrypt. This project has no native crypto
 * dependency and adding one introduces a native build step, so scrypt —
 * Node's built-in memory-hard KDF — is used instead. It produces a
 * salted, one-way hash in the same spirit, and needs no extra package.
 */

const KEYLEN = 64;
const COST = 16384;

/** Hash a plaintext password with a fresh random salt. */
export const hashPassword = (plain) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plain), salt, KEYLEN, { N: COST }).toString('hex');
  return `scrypt$${COST}$${salt}$${derived}`;
};

/** Constant-time verification of a plaintext password against a stored hash. */
export const verifyPassword = (plain, stored) => {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const [, cost, salt, expected] = parts;
  try {
    const derived = crypto.scryptSync(String(plain), salt, KEYLEN, { N: Number(cost) }).toString('hex');
    const a = Buffer.from(derived, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};
