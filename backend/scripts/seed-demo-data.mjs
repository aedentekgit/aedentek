// Adds realistic DEMO records through the running API (default http://localhost:5001), so every
// derived value (ledger entries, totals, defaults) is produced by the normal business logic.
// Idempotent: each group is skipped when its demo records already exist.
//   node scripts/seed-demo-data.mjs
const BASE = process.env.API_BASE || 'http://localhost:5001';
const api = async (method, p, body) => {
  const r = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${j.message || ''}`);
  return j;
};
const list = async (p) => (await api('GET', p)).data || [];
const log = (m) => console.log(m);

// ---------------- Invoice sender profiles ----------------
if ((await list('/api/settings-profiles?type=invoiceSender')).length === 0) {
  const senders = [
    { companyName: 'Aedentek Cloud Solutions LLP', companyTagline: 'Enterprise Cloud & Architecture Solutions', status: 'Active', companyContactPerson: 'Rahul Sen',
      companyEmail: 'billing@aedentek.com', companyPhone: '+91 452 235 6677', companyGst: '33AABCA9988C1Z4', companyPan: 'AABCA9988C',
      companyAddress: '12, Thomas Street, Narimedu, Madurai, Tamil Nadu - 625002', signatoryName: 'Rahul Sen', signatoryDesignation: 'Managing Director' },
    { companyName: 'Aedentek Digital Labs Pvt Ltd', companyTagline: 'Product Engineering & UI Studio', status: 'Secondary', companyContactPerson: 'Meera Iyer',
      companyEmail: 'accounts@digitallabs.aedentek.com', companyPhone: '+91 44 4012 8800', companyGst: '33AACCD4412H1ZP', companyPan: 'AACCD4412H',
      companyAddress: 'Floor 4, Prestige Tech Park, Anna Salai, Chennai, Tamil Nadu - 600002', signatoryName: 'Meera Iyer', signatoryDesignation: 'Director - Finance' },
    { companyName: 'Aedentek Exports (SEZ Unit)', companyTagline: 'Software Exports under LUT', status: 'Secondary', companyContactPerson: 'Tarun Mehta',
      companyEmail: 'exports@aedentek.com', companyPhone: '+91 422 267 1100', companyGst: '33AAFCE7781K1ZQ', companyPan: 'AAFCE7781K',
      companyAddress: 'SEZ Block C, Tidel Park, Coimbatore, Tamil Nadu - 641014', signatoryName: 'Tarun Mehta', signatoryDesignation: 'Authorised Signatory' }
  ];
  for (const data of senders) await api('POST', '/api/settings-profiles', { type: 'invoiceSender', data });
  log(`invoice sender profiles: +${senders.length} (first is the default)`);
} else log('invoice sender profiles: already present, skipped');

// ---------------- Bank profiles ----------------
if ((await list('/api/settings-profiles?type=bankDetails')).length === 0) {
  const banks = [
    { bankName: 'HDFC Bank', accountName: 'Aedentek Cloud Solutions LLP', accountType: 'Current', accountNumber: '50200088192831', ifsc: 'HDFC0000240', swiftCode: 'HDFCINBBXXX', branch: 'Madurai Main Branch', upiId: 'aedentek@hdfcbank', status: 'Active', bankAddress: 'HDFC Bank, 30C Bypass Road, Madurai - 625010' },
    { bankName: 'ICICI Bank', accountName: 'Aedentek Digital Labs Pvt Ltd', accountType: 'Current', accountNumber: '603205011874', ifsc: 'ICIC0006032', swiftCode: 'ICICINBBXXX', branch: 'Anna Salai, Chennai', upiId: 'digitallabs@icici', status: 'Secondary', bankAddress: 'ICICI Bank, 769 Anna Salai, Chennai - 600002' },
    { bankName: 'State Bank of India', accountName: 'Aedentek Exports (SEZ Unit)', accountType: 'Savings', accountNumber: '39912004517', ifsc: 'SBIN0004102', swiftCode: 'SBININBB104', branch: 'Tidel Park SEZ', upiId: 'exports@sbi', status: 'Secondary', bankAddress: 'SBI, Tidel Park SEZ, Coimbatore - 641014' }
  ];
  for (const data of banks) await api('POST', '/api/settings-profiles', { type: 'bankDetails', data });
  log(`bank profiles: +${banks.length}`);
} else log('bank profiles: already present, skipped');

// ---------------- GST slabs ----------------
if ((await list('/api/gst-rates')).length === 0) {
  const slabs = [
    ['998314', 18, 'IT design & development services', 'Standard'], ['998313', 18, 'IT consulting & support services', 'Standard'],
    ['998316', 18, 'Hosting & cloud infrastructure services', 'Standard'], ['997331', 18, 'Software licensing & subscriptions', 'Standard'],
    ['998361', 18, 'Advertising & digital marketing services', 'Standard'], ['999293', 12, 'Commercial training & coaching', 'Standard'],
    ['996511', 5, 'Goods transport by road', 'Standard'], ['998315', 0, 'Software export of services (LUT)', 'Zero-Rated'],
    ['999799', 0, 'Exempted educational services', 'Exempted']
  ];
  for (const [hsnCode, gstRate, serviceName, taxType] of slabs) await api('POST', '/api/gst-rates', { hsnCode, gstRate, serviceName, taxType, status: 'Active' });
  log(`GST slabs: +${slabs.length} (first is the default)`);
} else log('GST slabs: already present, skipped');

// ---------------- Expenses (repeating titles on purpose) ----------------
const existingExp = await list('/api/accounts/expenses');
if (!existingExp.some((e) => /^Demo/.test(e.notes || ''))) {
  const M = [['2026-08', 'Aug'], ['2026-09', 'Sep'], ['2026-10', 'Oct'], ['2026-11', 'Nov']];
  const rows = [];
  for (const [ym] of M) {
    rows.push(['Office Rent', 'Facility Rent', 'Monthly rent for the Bandra studio', 85000, `${ym}-02`, 'Bandra', 'Bank Transfer']);
    rows.push(['Electricity Bill', 'Electricity & Power', 'EB charges for the month', 11800 + Math.round(Math.random() * 3000), `${ym}-09`, 'Bandra', 'UPI']);
    rows.push(['Google Workspace', 'Software Subscriptions', '24 seats, annual plan billed monthly', 14400, `${ym}-05`, 'All Branches', 'Credit Card']);
  }
  rows.push(['Cloud Hosting - Production', 'Software Subscriptions', 'App servers and managed database', 32500, '2026-10-12', 'All Branches', 'Credit Card']);
  rows.push(['Cloud Hosting - Production', 'Software Subscriptions', 'App servers and managed database', 34100, '2026-11-12', 'All Branches', 'Credit Card']);
  rows.push(['Google Ads Campaign', 'Marketing & Advertising', 'Lead generation, Q4 education vertical', 48000, '2026-10-20', 'Andheri', 'Credit Card']);
  rows.push(['Google Ads Campaign', 'Marketing & Advertising', 'Lead generation, Q4 education vertical', 52000, '2026-11-08', 'Andheri', 'Credit Card']);
  rows.push(['Air Conditioner Servicing', 'Maintenance & Repairs', 'Quarterly service of 6 units', 9600, '2026-10-17', 'Bandra', 'Cash']);
  rows.push(['Legal Retainer', 'Professional Fees', 'Contract review and compliance filings', 25000, '2026-11-03', 'All Branches', 'Cheque']);
  let n = 0;
  for (const [title, category, description, amount, date, branch, paymentMode] of rows) {
    await api('POST', '/api/accounts/expenses', { title, category, description, amount, date, branch, paymentMode, notes: `Demo · ${title}` }); n += 1;
  }
  log(`expenses: +${n} (rent, electricity, workspace, hosting and ads repeat across months)`);
} else log('expenses: demo records already present, skipped');

// ---------------- Invoices ----------------
const existingInv = await list('/api/invoices');
if (!existingInv.some((i) => /Nimbus Learning/.test(i.clientName))) {
  const mk = (clientName, title, items, gstCategory, gstType, due, issue, status) => {
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const rate = gstCategory === 'Export LUT' ? 0 : 18;
    const gstAmount = Math.round((subtotal * rate) / 100);
    return { clientName, title, issueDate: issue, dueDate: due, gstCategory, gstType, hsn: '998314', items: items.map((it, i) => ({ sNo: i + 1, ...it, hsn: '998314', total: it.price * it.qty })),
      subtotal, gstRate: rate, gstAmount, totalAmount: subtotal + gstAmount, paidAmount: 0, balance: subtotal + gstAmount, status };
  };
  const batch = [
    mk('Nimbus Learning Pvt Ltd', 'LMS Platform - Phase 1', [{ description: 'Learning portal design & build', price: 240000, qty: 1 }, { description: 'Admin dashboard', price: 85000, qty: 1 }], 'B2B', 'CGST+SGST', '2026-09-20', '2026-08-21', 'Sent'),
    mk('Lakeview Hospitality', 'Booking Engine Integration', [{ description: 'API integration sprint', price: 60000, qty: 3 }], 'B2B', 'IGST', '2026-10-30', '2026-10-01', 'Sent'),
    mk('Northwind Traders (UK)', 'Mobile App Maintenance - Q3', [{ description: 'Maintenance retainer (3 months)', price: 4500, qty: 3 }], 'Export LUT', 'Export LUT', '2026-10-15', '2026-09-15', 'Sent'),
    mk('Kavita Edutech', 'Analytics Dashboard Add-on', [{ description: 'Dashboard module', price: 120000, qty: 1 }], 'B2C', 'IGST', '2026-12-05', '2026-11-05', 'Sent')
  ];
  const created = [];
  for (const body of batch) created.push((await api('POST', '/api/invoices', body)).data);
  // payments: first fully paid, second partly paid, third fully paid
  await api('POST', `/api/invoices/${created[0]._id}/payment`, { amount: created[0].totalAmount, paymentMode: 'Bank Transfer', paymentRef: 'UTR-DEMO-0001' });
  await api('POST', `/api/invoices/${created[1]._id}/payment`, { amount: Math.round(created[1].totalAmount / 2), paymentMode: 'UPI', paymentRef: 'UPI-DEMO-0002' });
  await api('POST', `/api/invoices/${created[2]._id}/payment`, { amount: created[2].totalAmount, paymentMode: 'Bank Transfer', paymentRef: 'SWIFT-DEMO-0003' });
  log(`invoices: +${batch.length} (paid, partly paid, export and unpaid)`);
} else log('invoices: demo records already present, skipped');

log('done');
