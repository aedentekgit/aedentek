/**
 * EMI engine — pure functions, no database access.
 *
 * Reducing-balance EMI:   EMI = P·r·(1+r)^n / ((1+r)^n − 1),  r = annual% / 12 / 100
 * (0 % interest → P / n).  The first EMI falls due on the start date and every
 * following EMI one calendar month later (day clamped to the month length), so
 *   end date = start date + (n − 1) months.
 *
 * Charges on top of the instalments:
 *   processingCharges — one-time fee (₹) paid upfront when the plan is taken;
 *   transactionFee    — fee (₹) charged with EVERY instalment.
 *   total charges = processing + transactionFee × n
 *   total cost    = initial payment + total payable (all EMIs) + total charges
 *
 * Initial payment (down payment) is paid upfront and reduces the financed amount:
 *   financed = product amount − initial payment; EMIs are computed on the financed amount.
 */
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const EMI_MAX_COUNT = 600;

export const parseYmd = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d };
};

const pad = (n) => String(n).padStart(2, '0');
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Add whole calendar months to a YYYY-MM-DD string, clamping the day. */
export const addMonths = (ymd, months) => {
  const p = parseYmd(ymd);
  if (!p) return null;
  const total = p.m - 1 + months;
  const y = p.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12 + 1;
  return `${y}-${pad(m)}-${pad(Math.min(p.d, daysIn(y, m)))}`;
};

export const todayYmd = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};

/** Returns an array of human-readable validation errors (empty when valid). */
export const validateEmiInput = (b) => {
  const errors = [];
  if (!b.productName || !String(b.productName).trim()) errors.push('Product name is required');
  if (!b.category || !String(b.category).trim()) errors.push('Category is required');
  const principal = Number(b.principal);
  if (!Number.isFinite(principal) || principal <= 0) errors.push('Product amount must be greater than 0');
  const count = Number(b.emiCount);
  if (!Number.isInteger(count) || count < 1 || count > EMI_MAX_COUNT) {
    errors.push(`Number of EMIs must be a whole number between 1 and ${EMI_MAX_COUNT}`);
  }
  const rate = Number(b.interestRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) errors.push('Interest percentage must be between 0 and 100');
  if (!parseYmd(b.startDate)) errors.push('Start date must be a valid date (YYYY-MM-DD)');
  for (const [key, label] of [['processingCharges', 'Processing charges'], ['transactionFee', 'Transaction fee']]) {
    if (b[key] !== undefined && b[key] !== '' && b[key] !== null) {
      const v = Number(b[key]);
      if (!Number.isFinite(v) || v < 0) errors.push(`${label} must be 0 or more`);
      else if (v > 1e9) errors.push(`${label} is too large`);
    }
  }
  if (b.initialPayment !== undefined && b.initialPayment !== '' && b.initialPayment !== null) {
    const ip = Number(b.initialPayment);
    if (!Number.isFinite(ip) || ip < 0) errors.push('Initial payment must be 0 or more');
    else if (Number.isFinite(principal) && ip >= principal) errors.push('Initial payment must be less than the product amount');
  }
  const paid = b.paidCount === undefined || b.paidCount === '' ? 0 : Number(b.paidCount);
  if (!Number.isInteger(paid) || paid < 0) errors.push('EMIs paid must be a whole number, 0 or more');
  else if (Number.isInteger(count) && paid > count) errors.push('EMIs paid cannot exceed the number of EMIs');
  return errors;
};

/**
 * Full amortisation schedule + derived totals.
 * @returns {{ emiAmount, totalPayable, totalInterest, endDate, endMonth, durationMonths, schedule }}
 */
export const computeEmi = ({ principal, emiCount, interestRate, startDate, processingCharges = 0, transactionFee = 0, initialPayment = 0 }) => {
  const initial = round2(Math.max(0, Number(initialPayment) || 0));
  const P = round2(Number(principal) - initial);
  const n = Number(emiCount);
  const processing = round2(Math.max(0, Number(processingCharges) || 0));
  const fee = round2(Math.max(0, Number(transactionFee) || 0));
  const r = Number(interestRate) / 1200;
  const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const emiAmount = round2(emi);

  const schedule = [];
  let balance = P;
  for (let i = 1; i <= n; i += 1) {
    const interest = round2(balance * r);
    const last = i === n;
    const principalPart = last ? round2(balance) : round2(emiAmount - interest);
    const amount = last ? round2(principalPart + interest) : emiAmount;
    balance = round2(balance - principalPart);
    schedule.push({
      no: i,
      dueDate: addMonths(startDate, i - 1),
      emi: amount,
      principal: principalPart,
      interest,
      fee,
      total: round2(amount + fee),
      balance: Math.max(0, balance)
    });
  }

  const totalPayable = round2(schedule.reduce((s, x) => s + x.emi, 0));
  const endDate = schedule[schedule.length - 1].dueDate;
  const totalFees = round2(fee * n);
  const totalCharges = round2(processing + totalFees);
  return {
    emiAmount,
    totalPayable,
    initialPayment: initial,
    financedAmount: P,
    totalInterest: round2(totalPayable - P),
    processingCharges: processing,
    transactionFee: fee,
    totalFees,
    totalCharges,
    totalCost: round2(initial + totalPayable + totalCharges),
    monthlyOutflow: round2(emiAmount + fee),
    endDate,
    endMonth: endDate.slice(0, 7),
    durationMonths: n,
    schedule
  };
};

/** Time-dependent view of a stored plan: progress, outstanding, next due, status. */
export const progressOf = (plan, today = todayYmd()) => {
  const { schedule } = computeEmi(plan);
  const paid = Math.min(Number(plan.paidCount) || 0, schedule.length);
  const paidAmount = round2(schedule.slice(0, paid).reduce((s, x) => s + x.emi, 0));
  const total = round2(schedule.reduce((s, x) => s + x.emi, 0));
  const feeLeft = round2(schedule.slice(paid).reduce((s, x) => s + x.fee, 0));
  const next = schedule[paid] || null;
  let status = 'Active';
  if (paid >= schedule.length) status = 'Completed';
  else if (next && next.dueDate < today) status = 'Overdue';
  return {
    paidCount: paid,
    remainingCount: schedule.length - paid,
    paidAmount,
    outstandingFees: feeLeft,
    outstandingAmount: round2(total - paidAmount + feeLeft),
    nextDueDate: next ? next.dueDate : null,
    status
  };
};
