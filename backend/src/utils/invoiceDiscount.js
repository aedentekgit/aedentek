// Invoice-level discount: applied to the subtotal BEFORE GST (GST is charged on the discounted amount).
export const DISCOUNT_TYPES = ['none', 'percent', 'flat'];
const round2 = (n) => Math.round(n * 100) / 100;

export const computeDiscount = (subtotal, type, value) => {
  const sub = Number(subtotal) || 0;
  const val = Number(value) || 0;
  if (type === 'percent') return round2(Math.min(sub, (sub * val) / 100));
  if (type === 'flat') return round2(Math.min(sub, val));
  return 0;
};

// Returns an error message or null.
export const discountError = (type, value, subtotal) => {
  if (type === undefined && value === undefined) return null;
  const t = type === undefined || type === '' ? 'none' : type;
  if (!DISCOUNT_TYPES.includes(t)) return 'Discount type must be none, percent or flat';
  if (t === 'none') return null;
  const v = Number(value);
  if (value === undefined || value === '' || !Number.isFinite(v)) return 'Discount value must be a number';
  if (v < 0) return 'Discount cannot be negative';
  if (t === 'percent' && v > 100) return 'Discount percentage cannot exceed 100';
  if (t === 'flat' && subtotal !== undefined && v > Number(subtotal) + 0.001) return 'Discount cannot be greater than the subtotal';
  return null;
};
