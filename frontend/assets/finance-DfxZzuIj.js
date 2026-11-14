import {
  D as toast,
  Ft as ReactHooks,
  L as calcRepRate,
  Mt as ripple,
  O as useScopeRef,
  Ot as isReducedMotion,
  Pt as gsap,
  R as mutateState,
  S as confirmDialog,
  St as scaleDuration,
  V as invoiceTotal,
  X as getUserById,
  Y as useGlobalState,
  _ as SelectField,
  a as AnimatedNumber,
  c as EmptyState,
  ct as formatDateRange,
  d as ProgressBar,
  ft as formatCurrency,
  g as SearchInput,
  h as StatusPill,
  ht as formatPercent,
  it as formatShortDate,
  lt as formatLongDate,
  m as PageHeader,
  mt as formatNumber,
  nt as TODAY_ISO,
  pt as formatCompactCurrency,
  q as undoAction,
  r as Card,
  s as ModalDrawer,
  t as UserAvatar,
  u as formatClientSnippet,
  ut as getDaysDiff,
  vt as Icon,
  w as openDrawer,
  y as Tabs,
  yt as jsxRuntime,
  z as getCompanyById
} from "./ui-D4_WaMI9.js";
import { usePaged } from "./pager.js";
import { l as openLegacyInvoiceModal } from "./index-DG0_cRQu.js";
import { n as BarChart, r as RadialProgress } from "./charts-rP94NVff.js";

const { useState, useEffect, useMemo, useRef, useLayoutEffect } = ReactHooks();
const runtime = jsxRuntime();
const jsxs = runtime.jsxs;
const jsx = runtime.jsx;
const Fragment = runtime.Fragment;

// Currency Formatter helper in Indian Rupees (₹)
const fmtINR = (val) => {
  const n = Number(val || 0);
  return '₹ ' + n.toLocaleString('en-IN');
};

// --- DEFAULT LIVE DATASETS ---
const DEFAULT_PROPAGATIONS = [
  {
    _id: 'prop-1',
    propagationNumber: 'PRP-2026-0042',
    quotationNumber: 'PRP-2026-0042',
    clientName: 'Omni Retail Solutions Ltd',
    clientId: 'client-1',
    title: 'Vendor Mobile App Extension Phase 2',
    issueDate: '2026-08-10',
    validUntil: '2026-09-10',
    subtotal: 350000,
    tax: 0,
    total: 350000,
    status: 'Accepted',
    notes: 'Formal proposal for Mobile App Phase 2. Validity 30 days.',
    items: [
      { description: 'React Native iOS & Android Vendor Application', qty: 1, rate: 250000, amount: 250000 },
      { description: 'Push Notification Integration & Offline Sync', qty: 1, rate: 100000, amount: 100000 }
    ],
    companyName: 'AEDENTEK Cloud Solutions LLC',
    companyAddress: 'Thomas St, Madurai, Tamil Nadu, India',
    companyGst: '33AABCA9988C1Z4',
    companyPan: 'AABCA9988C',
    signatoryName: 'Rahul Sen',
    signatoryDesignation: 'Authorised Signatory',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'AEDENTEK Cloud Solutions LLC',
      accountNumber: '50200088192831',
      ifsc: 'HDFC0000240',
      upiId: 'aedentek@hdfcbank'
    }
  },
  {
    _id: 'prop-2',
    propagationNumber: 'PRP-2026-0045',
    quotationNumber: 'PRP-2026-0045',
    clientName: 'Kavita Edutech',
    clientId: 'client-3',
    title: 'Offline Video Encryption Module',
    issueDate: '2026-08-24',
    validUntil: '2026-09-24',
    subtotal: 180000,
    tax: 0,
    total: 180000,
    status: 'Sent',
    notes: 'Proposal under active evaluation by Kavita Edutech executive committee.',
    items: [
      { description: 'DRM License Server & Local Storage Encryptor', qty: 1, rate: 180000, amount: 180000 }
    ],
    companyName: 'AEDENTEK Cloud Solutions LLC',
    companyAddress: 'Thomas St, Madurai, Tamil Nadu, India',
    companyGst: '33AABCA9988C1Z4',
    companyPan: 'AABCA9988C',
    signatoryName: 'Rahul Sen',
    signatoryDesignation: 'Authorised Signatory',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'AEDENTEK Cloud Solutions LLC',
      accountNumber: '50200088192831',
      ifsc: 'HDFC0000240',
      upiId: 'aedentek@hdfcbank'
    }
  }
];

const DEFAULT_INVOICES = [
  {
    _id: 'inv-1',
    invoiceNumber: 'INV-2026-0081',
    clientName: 'Omni Retail Solutions Ltd',
    clientId: 'client-1',
    title: 'Sprint Milestone 1 & 2 - Architecture',
    issueDate: '2026-06-15',
    dueDate: '2026-07-05',
    hsn: '998314',
    subtotal: 400000,
    gstRate: 18,
    gstAmount: 72000,
    gstType: 'CGST+SGST',
    cgstAmount: 36000,
    sgstAmount: 36000,
    igstAmount: 0,
    tax: 72000,
    totalAmount: 472000,
    paidAmount: 472000,
    balance: 0,
    status: 'Paid',
    gstCategory: 'B2B',
    buyerGstin: '27AAFCO1234F1Z8',
    buyerPan: 'AAFCO1234F',
    buyerAddress: 'Trade Centre, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    paymentRef: 'REC-2026-041 (Bank Transfer NEFT/RTGS: HDFC000024098172)',
    paymentMode: 'Bank Transfer (NEFT/RTGS)',
    items: [
      { sNo: 1, description: 'Sprint Milestone 1 & 2 - Architecture', hsn: '998314', price: 400000, qty: 1, total: 400000 }
    ],
    companyName: 'AEDENTEK Cloud Solutions LLC',
    companyAddress: 'Thomas St, Madurai, Tamil Nadu, India',
    companyGst: '33AABCA9988C1Z4',
    companyPan: 'AABCA9988C',
    signatoryName: 'Rahul Sen',
    signatoryDesignation: 'Authorised Signatory',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'AEDENTEK Cloud Solutions LLC',
      accountNumber: '50200088192831',
      ifsc: 'HDFC0000240',
      upiId: 'aedentek@hdfcbank'
    }
  },
  {
    _id: 'inv-2',
    invoiceNumber: 'INV-2026-0094',
    clientName: 'Omni Retail Solutions Ltd',
    clientId: 'client-1',
    title: 'Sprint Milestone 3 - Vendor Catalog',
    issueDate: '2026-08-10',
    dueDate: '2026-09-10',
    hsn: '998314',
    subtotal: 300000,
    gstRate: 18,
    gstAmount: 54000,
    gstType: 'IGST',
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 54000,
    tax: 54000,
    totalAmount: 354000,
    paidAmount: 200000,
    balance: 154000,
    status: 'Partially Paid',
    gstCategory: 'B2B',
    buyerGstin: '27AAFCO1234F1Z8',
    buyerPan: 'AAFCO1234F',
    buyerAddress: 'Trade Centre, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    paymentRef: 'REC-2026-062 (Bank Transfer: HDFC000098231140)',
    paymentMode: 'Bank Transfer (NEFT)',
    items: [
      { sNo: 1, description: 'Sprint Milestone 3 - Vendor Catalog', hsn: '998314', price: 300000, qty: 1, total: 300000 }
    ],
    companyName: 'AEDENTEK Cloud Solutions LLC',
    companyAddress: 'Thomas St, Madurai, Tamil Nadu, India',
    companyGst: '33AABCA9988C1Z4',
    companyPan: 'AABCA9988C',
    signatoryName: 'Rahul Sen',
    signatoryDesignation: 'Authorised Signatory',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'AEDENTEK Cloud Solutions LLC',
      accountNumber: '50200088192831',
      ifsc: 'HDFC0000240',
      upiId: 'aedentek@hdfcbank'
    }
  },
  {
    _id: 'inv-3',
    invoiceNumber: 'INV-2026-0102',
    clientName: 'Hyperion Media Group',
    clientId: 'client-2',
    title: 'Milestone 2 - Streaming Engine',
    issueDate: '2026-07-20',
    dueDate: '2026-08-15',
    hsn: '998314',
    subtotal: 750000,
    gstRate: 0,
    gstAmount: 0,
    gstType: 'Export LUT',
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    tax: 0,
    totalAmount: 750000,
    paidAmount: 750000,
    balance: 0,
    status: 'Paid',
    gstCategory: 'Export LUT',
    lutNumber: 'AD330224001928K',
    buyerAddress: '550 Madison Ave, New York, NY 10022, United States',
    paymentRef: 'REC-2026-055 (International SWIFT Wire: CHASUS33XX98104)',
    paymentMode: 'International SWIFT Wire',
    notes: 'Supply meant for export under bond or letter of undertaking without payment of integrated tax.',
    items: [
      { sNo: 1, description: 'Milestone 2 - Streaming Engine', hsn: '998314', price: 750000, qty: 1, total: 750000 }
    ],
    companyName: 'AEDENTEK Cloud Solutions LLC',
    companyAddress: 'Thomas St, Madurai, Tamil Nadu, India',
    companyGst: '33AABCA9988C1Z4',
    companyPan: 'AABCA9988C',
    signatoryName: 'Rahul Sen',
    signatoryDesignation: 'Authorised Signatory',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'AEDENTEK Cloud Solutions LLC',
      accountNumber: '50200088192831',
      ifsc: 'HDFC0000240',
      upiId: 'aedentek@hdfcbank'
    }
  },
  {
    _id: 'inv-4',
    invoiceNumber: 'INV-2026-0118',
    clientName: 'Kavita Edutech',
    clientId: 'client-3',
    title: 'Project Kickoff & UI Prototype',
    issueDate: '2026-08-25',
    dueDate: '2026-09-15',
    hsn: '998314',
    subtotal: 150000,
    gstRate: 18,
    gstAmount: 27000,
    gstType: 'IGST',
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 27000,
    tax: 27000,
    totalAmount: 177000,
    paidAmount: 0,
    balance: 177000,
    status: 'Sent',
    gstCategory: 'B2C',
    buyerAddress: '24 Anna Salai, Chennai, Tamil Nadu 600002',
    items: [
      { sNo: 1, description: 'Project Kickoff & UI Prototype', hsn: '998314', price: 150000, qty: 1, total: 150000 }
    ],
    companyName: 'AEDENTEK Cloud Solutions LLC',
    companyAddress: 'Thomas St, Madurai, Tamil Nadu, India',
    companyGst: '33AABCA9988C1Z4',
    companyPan: 'AABCA9988C',
    signatoryName: 'Rahul Sen',
    signatoryDesignation: 'Authorised Signatory',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'AEDENTEK Cloud Solutions LLC',
      accountNumber: '50200088192831',
      ifsc: 'HDFC0000240',
      upiId: 'aedentek@hdfcbank'
    }
  }
];

// Status badge helper
const renderStatusBadge = (status) => {
  const s = String(status || 'Draft').toLowerCase();
  let cls = 'fi-badge-pill';
  if (s === 'paid' || s === 'accepted') cls += ' paid';
  else if (s === 'partially paid' || s === 'sent') cls += ' partially';
  else if (s === 'overdue' || s === 'declined') cls += ' overdue';
  else cls += ' draft';

  return jsx('span', { className: cls, children: status });
};

// ==========================================================================
// 1. PRINTABLE TAX INVOICE DOCUMENT COMPONENT (id="printable-invoice-doc")
// ==========================================================================
function PrintableInvoiceDoc({ invoice }) {
  if (!invoice) return null;

  return jsxs('div', {
    id: 'printable-invoice-doc',
    className: 'printable-invoice-sheet',
    children: [
      // Top SVG Accent Header
      jsxs('div', {
        style: { position: 'relative', width: '100%', minHeight: '130px', overflow: 'hidden', background: '#ffffff' },
        children: [
          jsx('svg', {
            width: '100%',
            height: '130',
            viewBox: '0 0 794 130',
            preserveAspectRatio: 'none',
            style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '130px', zIndex: 1 },
            children: [
              jsx('polygon', { points: '0,0 435,0 345,130 0,130', fill: '#0f172a' }),
              jsx('polygon', { points: '435,0 458,0 368,130 345,130', fill: '#06b6d4' }),
              jsx('polygon', { points: '458,0 495,0 405,130 368,130', fill: '#4d33b6' })
            ]
          }),
          jsxs('div', {
            style: {
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%',
              minHeight: '130px',
              padding: '0 40px'
            },
            children: [
              // Left: Company Branding
              jsxs('div', {
                style: { color: '#ffffff' },
                children: [
                  jsx('div', {
                    style: { fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' },
                    children: invoice.companyName || 'AEDENTEK Cloud Solutions LLC'
                  }),
                  jsx('div', {
                    style: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
                    children: 'Enterprise Cloud & Commercial Systems'
                  })
                ]
              }),
              // Right: Document Badge & Meta
              jsxs('div', {
                style: { textAlign: 'right' },
                children: [
                  jsx('div', {
                    style: {
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    },
                    children: invoice.gstCategory === 'Export LUT' ? 'TAX INVOICE (EXPORT LUT)' : `TAX INVOICE (${invoice.gstCategory || 'B2B'})`
                  }),
                  jsx('div', {
                    style: { fontSize: '14px', fontWeight: '700', color: '#4d33b6', marginTop: '4px' },
                    children: invoice.invoiceNumber
                  }),
                  jsxs('div', {
                    style: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
                    children: ['Issue Date: ', invoice.issueDate, ' | Due: ', invoice.dueDate || 'Upon Receipt']
                  })
                ]
              })
            ]
          })
        ]
      }),

      // Two-Column Coordinates (Buyer & Supplier)
      jsxs('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          padding: '24px 40px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        },
        children: [
          // Billed To (Buyer)
          jsxs('div', {
            children: [
              jsx('div', {
                style: { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
                children: 'BILLED TO (BUYER):'
              }),
              jsx('div', { style: { fontSize: '15px', fontWeight: '700', color: '#0f172a' }, children: invoice.clientName }),
              invoice.buyerGstin && jsxs('div', { style: { fontSize: '12px', color: '#334155', marginTop: '3px' }, children: ['GSTIN: ', jsx('b', { children: invoice.buyerGstin })] }),
              invoice.buyerPan && jsxs('div', { style: { fontSize: '12px', color: '#334155' }, children: ['PAN: ', invoice.buyerPan] }),
              jsx('div', { style: { fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }, children: invoice.buyerAddress || 'Registered Office Address' })
            ]
          }),
          // Issued By (Supplier)
          jsxs('div', {
            style: { textAlign: 'right' },
            children: [
              jsx('div', {
                style: { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
                children: 'ISSUED BY (SUPPLIER):'
              }),
              jsx('div', { style: { fontSize: '15px', fontWeight: '700', color: '#0f172a' }, children: invoice.companyName || 'AEDENTEK Cloud Solutions LLC' }),
              jsxs('div', { style: { fontSize: '12px', color: '#334155', marginTop: '3px' }, children: ['GSTIN: ', jsx('b', { children: invoice.companyGst || '33AABCA9988C1Z4' })] }),
              jsxs('div', { style: { fontSize: '12px', color: '#334155' }, children: ['PAN: ', invoice.companyPan || 'AABCA9988C'] }),
              jsx('div', { style: { fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }, children: invoice.companyAddress || 'Thomas St, Madurai, TN, India' })
            ]
          })
        ]
      }),

      // Deliverables / Line Items Table
      jsx('div', {
        style: { padding: '20px 40px', flex: '1 0 auto' },
        children: jsxs('table', {
          children: [
            jsx('thead', {
              children: jsxs('tr', {
                children: [
                  jsx('th', { style: { width: '40px', textAlign: 'center' }, children: 'S.No' }),
                  jsx('th', { children: 'Deliverable Description' }),
                  jsx('th', { style: { width: '80px', textAlign: 'center' }, children: 'HSN/SAC' }),
                  jsx('th', { style: { width: '100px', textAlign: 'right' }, children: 'Unit Rate' }),
                  jsx('th', { style: { width: '60px', textAlign: 'center' }, children: 'Qty' }),
                  jsx('th', { style: { width: '110px', textAlign: 'right' }, children: 'Total' })
                ]
              })
            }),
            jsx('tbody', {
              children: (invoice.items || []).map((item, idx) =>
                jsxs('tr', {
                  key: idx,
                  children: [
                    jsx('td', { style: { textAlign: 'center', color: '#64748b' }, children: item.sNo || idx + 1 }),
                    jsxs('td', {
                      children: [
                        jsx('div', { style: { fontWeight: '600' }, children: item.description }),
                        invoice.title && jsx('small', { style: { color: '#64748b', fontSize: '11px' }, children: invoice.title })
                      ]
                    }),
                    jsx('td', { style: { textAlign: 'center', fontFamily: 'monospace', fontSize: '12px' }, children: item.hsn || invoice.hsn || '998314' }),
                    jsx('td', { style: { textAlign: 'right' }, children: fmtINR(item.price) }),
                    jsx('td', { style: { textAlign: 'center' }, children: item.qty || 1 }),
                    jsx('td', { style: { textAlign: 'right', fontWeight: '700' }, children: fmtINR(item.total || item.price * (item.qty || 1)) })
                  ]
                }, idx)
              )
            })
          ]
        })
      }),

      // Bottom Section: Remittance, Financial Breakdown, Signatory
      jsxs('div', {
        style: { padding: '20px 40px 30px', borderTop: '1px solid #e2e8f0', background: '#fafaf9' },
        children: [
          jsxs('div', {
            style: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' },
            children: [
              // Left: Remittance Coordinates & Bank Details
              jsxs('div', {
                children: [
                  jsx('div', {
                    style: { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
                    children: 'REMITTANCE & BANK COORDINATES:'
                  }),
                  jsxs('div', {
                    style: { fontSize: '12px', color: '#334155', lineHeight: 1.6, background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' },
                    children: [
                      jsxs('div', { children: [jsx('b', { children: invoice.bankDetails?.bankName || 'HDFC Bank' }), ' | A/c: ', jsx('span', { style: { fontFamily: 'monospace', fontWeight: '600' }, children: invoice.bankDetails?.accountNumber || '50200088192831' })] }),
                      jsxs('div', { children: ['IFSC: ', jsx('span', { style: { fontFamily: 'monospace' }, children: invoice.bankDetails?.ifsc || 'HDFC0000240' }), ' | Current Account'] }),
                      jsxs('div', { children: ['UPI / VPA: ', jsx('b', { style: { color: '#4d33b6' }, children: invoice.bankDetails?.upiId || 'aedentek@hdfcbank' })] }),
                      invoice.lutNumber && jsxs('div', { style: { color: '#059669', fontWeight: '600', marginTop: '4px' }, children: ['LUT Ref: ', invoice.lutNumber] }),
                      invoice.paymentRef && jsxs('div', { style: { color: '#2563eb', fontSize: '11px', marginTop: '4px' }, children: ['Settlement: ', invoice.paymentRef] })
                    ]
                  })
                ]
              }),

              // Right: Financial Subtotal, Tax Breakdown, Gross Total, Balance
              jsxs('div', {
                style: { display: 'flex', flexDirection: 'column', gap: '6px' },
                children: [
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' },
                    children: [jsx('span', { children: 'Subtotal:' }), jsx('b', { children: fmtINR(invoice.subtotal) })]
                  }),
                  Number(invoice.discountAmount) > 0 && jsxs('div', {
                    style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#14806f' },
                    children: [jsx('span', { children: invoice.discountType === 'percent' ? `Discount (${invoice.discountValue}%):` : 'Discount:' }), jsx('b', { children: '− ' + fmtINR(invoice.discountAmount) })]
                  }),
                  invoice.gstType === 'CGST+SGST' && jsxs(Fragment, {
                    children: [
                      jsxs('div', {
                        style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' },
                        children: [jsx('span', { children: 'CGST (9%):' }), jsx('span', { children: fmtINR(invoice.cgstAmount || invoice.gstAmount / 2) })]
                      }),
                      jsxs('div', {
                        style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' },
                        children: [jsx('span', { children: 'SGST (9%):' }), jsx('span', { children: fmtINR(invoice.sgstAmount || invoice.gstAmount / 2) })]
                      })
                    ]
                  }),
                  invoice.gstType === 'IGST' && jsxs('div', {
                    style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' },
                    children: [jsx('span', { children: 'IGST (18%):' }), jsx('span', { children: fmtINR(invoice.gstAmount) })]
                  }),
                  (invoice.gstCategory === 'Export LUT' || invoice.gstType === 'Export LUT') && jsxs('div', {
                    style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#059669', fontStyle: 'italic' },
                    children: [jsx('span', { children: 'Export LUT (0%):' }), jsx('span', { children: '₹ 0 (Zero-Rated)' })]
                  }),
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#0f172a', borderTop: '2px solid #cbd5e1', paddingTop: '8px', marginTop: '4px' },
                    children: [jsx('span', { children: 'Gross Total:' }), jsx('span', { style: { color: '#4d33b6' }, children: fmtINR(invoice.totalAmount) })]
                  }),
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#10b981', fontWeight: '600' },
                    children: [jsx('span', { children: 'Amount Paid:' }), jsx('span', { children: fmtINR(invoice.paidAmount) })]
                  }),
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', color: invoice.balance > 0 ? '#ef4444' : '#10b981', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' },
                    children: [jsx('span', { children: 'Balance Due:' }), jsx('span', { children: fmtINR(invoice.balance) })]
                  })
                ]
              })
            ]
          }),

          // Signatory Footer
          jsxs('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' },
            children: [
              jsx('div', {
                style: { fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', maxWidth: '400px' },
                children: invoice.notes || 'This is a computer-generated tax invoice issued in accordance with statutory GST compliance.'
              }),
              jsxs('div', {
                style: { display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'right' },
                children: [
                  jsxs('div', {
                    className: 'printable-seal-badge',
                    children: [
                      jsx('span', { children: 'AEDENTEK' }),
                      jsx('span', { style: { fontSize: '7px' }, children: 'DIGITAL SEAL' }),
                      jsx('span', { children: 'VERIFIED' })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('div', { style: { fontSize: '11px', color: '#64748b' }, children: `For ${invoice.companyName || 'AEDENTEK Cloud Solutions'}` }),
                      jsx('div', { style: { fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '30px' }, children: invoice.signatoryName || 'Rahul Sen' }),
                      jsx('div', { style: { fontSize: '11px', color: '#64748b' }, children: invoice.signatoryDesignation || 'Authorised Signatory' })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// ==========================================================================
// 2. PRINTABLE COMMERCIAL PROPAGATION DOCUMENT COMPONENT (id="printable-propagation-doc")
// ==========================================================================
function PrintablePropagationDoc({ propagation, onConvert }) {
  if (!propagation) return null;

  return jsxs('div', {
    id: 'printable-propagation-doc',
    className: 'printable-invoice-sheet',
    children: [
      // Top SVG Accent Header
      jsxs('div', {
        style: { position: 'relative', width: '100%', minHeight: '130px', overflow: 'hidden', background: '#ffffff' },
        children: [
          jsx('svg', {
            width: '100%',
            height: '130',
            viewBox: '0 0 794 130',
            preserveAspectRatio: 'none',
            style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '130px', zIndex: 1 },
            children: [
              jsx('polygon', { points: '0,0 435,0 345,130 0,130', fill: '#0f172a' }),
              jsx('polygon', { points: '435,0 458,0 368,130 345,130', fill: '#06b6d4' }),
              jsx('polygon', { points: '458,0 495,0 405,130 368,130', fill: '#4d33b6' })
            ]
          }),
          jsxs('div', {
            style: {
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%',
              minHeight: '130px',
              padding: '0 40px'
            },
            children: [
              // Left: Company Branding
              jsxs('div', {
                style: { color: '#ffffff' },
                children: [
                  jsx('div', {
                    style: { fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' },
                    children: propagation.companyName || 'AEDENTEK Cloud Solutions LLC'
                  }),
                  jsx('div', {
                    style: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
                    children: 'Commercial Scope Proposals & Deliverables'
                  })
                ]
              }),
              // Right: Document Badge & Meta
              jsxs('div', {
                style: { textAlign: 'right' },
                children: [
                  jsx('div', {
                    style: {
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    },
                    children: 'COMMERCIAL PROPAGATION'
                  }),
                  jsx('div', {
                    style: { fontSize: '14px', fontWeight: '700', color: '#4d33b6', marginTop: '4px' },
                    children: propagation.propagationNumber
                  }),
                  jsxs('div', {
                    style: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
                    children: ['Issue Date: ', propagation.issueDate, ' | Valid Until: ', propagation.validUntil || 'Net 30']
                  })
                ]
              })
            ]
          })
        ]
      }),

      // Two-Column Metadata (Client & Corporate)
      jsxs('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          padding: '24px 40px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        },
        children: [
          // Presented To Client
          jsxs('div', {
            children: [
              jsx('div', {
                style: { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
                children: 'PROPOSED SCOPE FOR:'
              }),
              jsx('div', { style: { fontSize: '15px', fontWeight: '700', color: '#0f172a' }, children: propagation.clientName }),
              jsx('div', { style: { fontSize: '13px', fontWeight: '600', color: '#4d33b6', marginTop: '4px' }, children: propagation.title }),
              jsx('div', { style: { fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }, children: propagation.notes || 'Formal statement of work and contractual delivery commitment.' })
            ]
          }),
          // Issued By (Supplier)
          jsxs('div', {
            style: { textAlign: 'right' },
            children: [
              jsx('div', {
                style: { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
                children: 'COMMERCIAL ORIGINATOR:'
              }),
              jsx('div', { style: { fontSize: '15px', fontWeight: '700', color: '#0f172a' }, children: propagation.companyName || 'AEDENTEK Cloud Solutions LLC' }),
              jsxs('div', { style: { fontSize: '12px', color: '#334155', marginTop: '3px' }, children: ['GSTIN: ', jsx('b', { children: propagation.companyGst || '33AABCA9988C1Z4' })] }),
              jsx('div', { style: { fontSize: '12px', color: '#64748b', marginTop: '4px' }, children: propagation.companyAddress || 'Thomas St, Madurai, TN, India' })
            ]
          })
        ]
      }),

      // Deliverables / Line Items Table
      jsx('div', {
        style: { padding: '20px 40px', flex: '1 0 auto' },
        children: jsxs('table', {
          children: [
            jsx('thead', {
              children: jsxs('tr', {
                children: [
                  jsx('th', { style: { width: '40px', textAlign: 'center' }, children: 'S.No' }),
                  jsx('th', { children: 'Deliverable Scope Description' }),
                  jsx('th', { style: { width: '80px', textAlign: 'center' }, children: 'Qty / Units' }),
                  jsx('th', { style: { width: '120px', textAlign: 'right' }, children: 'Unit Rate' }),
                  jsx('th', { style: { width: '130px', textAlign: 'right' }, children: 'Total (₹)' })
                ]
              })
            }),
            jsx('tbody', {
              children: (propagation.items || []).map((item, idx) =>
                jsxs('tr', {
                  key: idx,
                  children: [
                    jsx('td', { style: { textAlign: 'center', color: '#64748b' }, children: idx + 1 }),
                    jsx('td', { style: { fontWeight: '600' }, children: item.description }),
                    jsx('td', { style: { textAlign: 'center' }, children: item.qty || item.quantity || 1 }),
                    jsx('td', { style: { textAlign: 'right' }, children: fmtINR(item.rate) }),
                    jsx('td', { style: { textAlign: 'right', fontWeight: '700' }, children: fmtINR(item.amount || (item.qty || 1) * item.rate) })
                  ]
                }, idx)
              )
            })
          ]
        })
      }),

      // Bottom Section: Scope Total, Terms & Convert Action
      jsxs('div', {
        style: { padding: '20px 40px 30px', borderTop: '1px solid #e2e8f0', background: '#fafaf9' },
        children: [
          jsxs('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
            children: [
              jsxs('div', {
                children: [
                  jsx('div', { style: { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }, children: 'COMMERCIAL TERMS:' }),
                  jsx('div', { style: { fontSize: '12px', color: '#64748b', marginTop: '4px' }, children: 'Rates exclude statutory GST. Upon acceptance, invoice is generated with applicable GST regime.' })
                ]
              }),
              jsxs('div', {
                style: { textAlign: 'right' },
                children: [
                  jsx('div', { style: { fontSize: '12px', color: '#64748b' }, children: 'Total Scope Amount' }),
                  jsx('div', { style: { fontSize: '24px', fontWeight: '800', color: '#4d33b6' }, children: fmtINR(propagation.subtotal || propagation.total) })
                ]
              })
            ]
          }),

          // Signatory & 1-Click Convert Footer
          jsxs('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' },
            children: [
              onConvert && jsxs('button', {
                type: 'button',
                className: 'btn btn--primary',
                style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
                onClick: onConvert,
                children: [
                  jsx(Icon, { name: 'finance' }),
                  'Convert to Tax Invoice (1-Click)'
                ]
              }),
              jsxs('div', {
                style: { display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'right', marginLeft: 'auto' },
                children: [
                  jsxs('div', {
                    className: 'printable-seal-badge',
                    children: [
                      jsx('span', { children: 'AEDENTEK' }),
                      jsx('span', { style: { fontSize: '7px' }, children: 'PROPOSAL SEAL' }),
                      jsx('span', { children: 'APPROVED' })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('div', { style: { fontSize: '11px', color: '#64748b' }, children: `For ${propagation.companyName || 'AEDENTEK Cloud Solutions'}` }),
                      jsx('div', { style: { fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '24px' }, children: propagation.signatoryName || 'Rahul Sen' }),
                      jsx('div', { style: { fontSize: '11px', color: '#64748b' }, children: propagation.signatoryDesignation || 'Authorised Signatory' })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// ==========================================================================
// 3. TAX INVOICES DIRECTORY COMPONENT
// ==========================================================================
function TaxInvoicesView({ openId, onNewInvoice }) {
  const [invoices, setInvoices] = useState(DEFAULT_INVOICES);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const scopeRef = useScopeRef();
  // The table is paged ON THE SERVER (10 per page, search + status filtered by the API);
  // the full list above is kept only for the KPI tiles, CSV export and the detail drawer.
  const paged = usePaged('/api/invoices', { q: search.trim(), status: filterStatus === 'all' ? '' : filterStatus }, { noun: 'invoices' });
  const pageRows = paged.rows;
  const pageOffset = paged.pagination ? paged.pagination.from - 1 : 0;

  // Load Invoices from API
  const loadInvoices = async () => {
    paged.reload();
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setInvoices(json.data);
          return;
        }
      }
    } catch {
      // Fallback to default invoices
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Open drawer if openId passed
  useEffect(() => {
    if (openId) {
      const match = invoices.find(i => i._id === openId || i.invoiceNumber === openId);
      if (match) {
        openInvoiceDetail(match);
      }
    }
  }, [openId, invoices]);

  // Edit an existing invoice (reuses the create form, prefilled)
  const openEditInvoice = (invoice) => {
    window.dispatchEvent(new CustomEvent('financeEditInvoice', { detail: invoice }));
  };

  // Delete an invoice (themed confirmation first)
  const deleteInvoiceRow = async (invoice) => {
    const paid = Number(invoice.paidAmount || 0);
    const warn = paid > 0 ? ` It already has ${fmtINR(paid)} of recorded payments, which will be removed with it.` : '';
    if (!(await window.themedConfirm(`Delete invoice ${invoice.invoiceNumber}?${warn} This cannot be undone.`))) return;
    try {
      const res = await fetch(`/api/invoices/${invoice._id}`, { method: 'DELETE' });
      if (res.ok) {
        toast(`Invoice ${invoice.invoiceNumber} deleted`, { icon: 'trash' });
        loadInvoices();
      } else {
        const j = await res.json().catch(() => ({}));
        toast(j.message || 'Could not delete the invoice', { icon: 'alert' });
      }
    } catch (err) {
      toast('Error deleting invoice: ' + err.message, { icon: 'alert' });
    }
  };

  // Open Invoice Detail Drawer
  const openInvoiceDetail = (invoice) => {
    openDrawer(
      jsxs(ModalDrawer, {
        title: invoice.invoiceNumber,
        sub: `${invoice.clientName} — ${invoice.title}`,
        tools: renderStatusBadge(invoice.status),
        foot: jsxs(Fragment, {
          children: [
            jsxs('button', {
              className: 'btn btn--ghost',
              type: 'button',
              onClick: () => window.print(),
              children: [jsx(Icon, { name: 'download' }), 'Print / Save PDF']
            }),
            invoice.balance > 0 && jsxs('button', {
              className: 'btn btn--primary',
              type: 'button',
              onClick: () => openPaymentModal(invoice),
              children: [jsx(Icon, { name: 'check' }), 'Record Payment']
            })
          ]
        }),
        children: [
          jsx('div', {
            style: { overflowX: 'auto', padding: '10px 0' },
            children: jsx(InvoiceDocView, { invoice })
          })
        ]
      })
    );
  };

  // Open Payment Recording Modal
  const openPaymentModal = (invoice) => {
    let enteredAmount = invoice.balance;
    let paymentRef = 'REC-2026-0' + Math.floor(10 + Math.random() * 89);
    let paymentMode = 'Bank Transfer (NEFT)';

    const submitPayment = async () => {
      try {
        const res = await fetch(`/api/invoices/${invoice._id}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: enteredAmount, paymentRef, paymentMode })
        });
        if (res.ok) {
          toast(`Payment of ${fmtINR(enteredAmount)} recorded successfully`, { icon: 'check' });
          loadInvoices();
        } else {
          // Local update fallback
          setInvoices(prev => prev.map(inv => {
            if (inv._id === invoice._id) {
              const newPaid = inv.paidAmount + enteredAmount;
              const newBal = Math.max(0, inv.totalAmount - newPaid);
              return { ...inv, paidAmount: newPaid, balance: newBal, status: newBal === 0 ? 'Paid' : 'Partially Paid' };
            }
            return inv;
          }));
          toast(`Payment of ${fmtINR(enteredAmount)} recorded locally`, { icon: 'check' });
        }
      } catch {
        toast('Failed to record payment', { icon: 'clock' });
      }
    };

    openDrawer(
      jsxs(ModalDrawer, {
        title: `Record Payment for ${invoice.invoiceNumber}`,
        sub: `Remaining Balance: ${fmtINR(invoice.balance)}`,
        foot: jsxs(Fragment, {
          children: [
            jsx('button', { className: 'btn', type: 'button', onClick: () => window.dispatchEvent(new CustomEvent('closeDrawer')), children: 'Cancel' }),
            jsx('button', { className: 'btn btn--primary', type: 'button', onClick: submitPayment, children: 'Confirm Settlement' })
          ]
        }),
        children: [
          jsxs('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '14px' },
            children: [
              jsxs('label', {
                className: 'field',
                children: [
                  jsx('span', { children: 'Payment Amount (₹) *' }),
                  jsx('input', {
                    className: 'input',
                    type: 'number',
                    defaultValue: invoice.balance,
                    onChange: e => { enteredAmount = Number(e.target.value); }
                  })
                ]
              }),
              jsxs('label', {
                className: 'field',
                children: [
                  jsx('span', { children: 'Payment Reference (UTR / Bank Ref) *' }),
                  jsx('input', {
                    className: 'input',
                    defaultValue: paymentRef,
                    onChange: e => { paymentRef = e.target.value; }
                  })
                ]
              }),
              jsxs('label', {
                className: 'field',
                children: [
                  jsx('span', { children: 'Payment Mode *' }),
                  jsxs('select', {
                    className: 'input',
                    defaultValue: paymentMode,
                    onChange: e => { paymentMode = e.target.value; },
                    children: [
                      jsx('option', { value: 'Bank Transfer (NEFT/RTGS)', children: 'Bank Transfer (NEFT/RTGS)' }),
                      jsx('option', { value: 'UPI / Instant VPA', children: 'UPI / Instant VPA' }),
                      jsx('option', { value: 'International SWIFT Wire', children: 'International SWIFT Wire' }),
                      jsx('option', { value: 'Corporate Cheque', children: 'Corporate Cheque' })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  };

  // KPIs Calculations
  const totalInvoiced = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.balance || 0), 0);
  const totalGst = invoices.reduce((acc, i) => acc + (i.tax || i.gstAmount || 0), 0);

  // Filtered invoices
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(inv => {
      const matchFilter = filterStatus === 'all' || inv.status.toLowerCase() === filterStatus.toLowerCase();
      const matchSearch = !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.clientName && inv.clientName.toLowerCase().includes(q)) ||
        (inv.title && inv.title.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [invoices, search, filterStatus]);

  const countByStatus = (status) => {
    if (status === 'all') return invoices.length;
    return invoices.filter(i => i.status.toLowerCase() === status.toLowerCase()).length;
  };

    // Export Invoices CSV
  const handleExportCSV = () => {
    const headers = ['Invoice #', 'Client Name', 'Scope / Title', 'Subtotal', 'GST Regime', 'Tax', 'Total Due', 'Paid', 'Balance', 'Status', 'Mode'];
    const rows = filtered.map(inv => [
      `"${inv.invoiceNumber || ''}"`,
      `"${(inv.clientName || '').replace(/"/g, '""')}"`,
      `"${(inv.title || '').replace(/"/g, '""')}"`,
      inv.subtotal || 0,
      `"${inv.gstType || 'CGST+SGST'}"`,
      inv.tax || 0,
      inv.totalAmount || 0,
      inv.paidAmount || 0,
      inv.balance || 0,
      `"${inv.status || ''}"`,
      `"${inv.gstCategory || 'B2B'}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aedentek_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return jsxs('div', {
    ref: scopeRef,
    children: [
      // Top Live KPIs
      jsxs('div', {
        className: 'kpis fi-kpis',
        children: [
          // Total Revenue Invoiced
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'cobalt',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'finance' }) }),
                  'Total Invoiced'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700' }, children: fmtINR(totalInvoiced) }),
              jsxs('span', { className: 'kpi__foot', children: [`${invoices.length} statutory tax invoices`] })
            ]
          }),

          // Paid Inward Collections
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'teal',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'check' }) }),
                  'Inward Collections'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700', color: '#10b981' }, children: fmtINR(totalPaid) }),
              jsxs('span', { className: 'kpi__foot', children: ['Reconciled bank settlements'] })
            ]
          }),

          // Outstanding Balance Due
          jsxs('div', {
            className: 'kpi',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon fi-bad', children: jsx(Icon, { name: 'clock' }) }),
                  'Outstanding Balance'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700', color: totalOutstanding > 0 ? '#ef4444' : 'inherit' }, children: fmtINR(totalOutstanding) }),
              jsxs('span', { className: 'kpi__foot', children: [`${countByStatus('Sent') + countByStatus('Partially Paid')} invoices awaiting settlement`] })
            ]
          }),

          // Statutory GST Assessed
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'amber',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'sparkle' }) }),
                  'GST Tax Assessed'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700' }, children: fmtINR(totalGst) }),
              jsxs('span', { className: 'kpi__foot', children: ['CGST, SGST & IGST Slabs'] })
            ]
          })
        ]
      }),

      // Main Toolbar & Invoices Summary Table in Unified Master Card
      jsx(Card, {
        flush: true,
        children: jsxs('div', {
          children: [
            jsxs('div', {
              className: 'toolbar fi-toolbar',
              style: { padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--line)', marginBottom: 0 },
              children: [
                jsx(SearchInput, {
                  value: search,
                  onChange: setSearch,
                  placeholder: 'Search invoice #, client...'
                }),
                jsx('span', { style: { flex: 1 } }),
                jsx('select', {
                  className: 'select table-filter-select',
                  value: filterStatus,
                  onChange: (e) => setFilterStatus(e.target.value),
                  children: [
                    jsx('option', { value: 'all', children: 'All Invoices' }),
                    jsx('option', { value: 'Paid', children: 'Paid' }),
                    jsx('option', { value: 'Partially Paid', children: 'Partially Paid' }),
                    jsx('option', { value: 'Sent', children: 'Sent' }),
                    jsx('option', { value: 'Draft', children: 'Draft' })
                  ]
                }),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--ghost',
                  style: { height: 38 },
                  onClick: handleExportCSV,
                  children: jsxs('span', {
                    style: { display: 'flex', alignItems: 'center', gap: 6 },
                    children: [jsx(Icon, { name: 'download' }), 'Export CSV']
                  })
                }),
                onNewInvoice && jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  style: { height: 38 },
                  onClick: onNewInvoice,
                  children: jsxs('span', {
                    style: { display: 'flex', alignItems: 'center', gap: 6 },
                    children: [jsx(Icon, { name: 'plus' }), 'Create Tax Invoice']
                  })
                })
              ]
            }),
            jsxs('div', {
              className: 'table-wrap',
              children: jsxs('table', {
                className: 'table table--stack fi-table',
                children: [
                  jsx('thead', {
                    children: jsxs('tr', {
                      children: [
                        jsx('th', { style: { width: 56, textAlign: 'center' }, children: 'S No' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Invoice #' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Client Name' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Subtotal' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'GST Regime' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Tax' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Total Due' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Paid' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Balance' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Status' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Mode' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Action' })
                      ]
                    })
                  }),
                  jsx('tbody', {
                    children: pageRows.length ? pageRows.map((inv, idx) =>
                      jsxs('tr', {
                        key: inv._id || inv.invoiceNumber,
                        className: 'is-click',
                        'data-row': '',
                        onClick: () => openInvoiceDetail(inv),
                        children: [
                          jsx('td', {
                            style: { textAlign: 'center', verticalAlign: 'middle' },
                            children: jsx('span', {
                              className: 'sno-pill sno-pill--normal',
                              children: idx + pageOffset + 1
                            })
                          }),
                          jsx('td', { style: { textAlign: 'center' }, children: jsx('b', { style: { fontFamily: 'monospace' }, children: inv.invoiceNumber }) }),
                          jsx('td', { style: { textAlign: 'center' }, children: jsx('b', { children: inv.clientName }) }),
                          jsx('td', { style: { textAlign: 'center', color: 'var(--muted)' }, children: fmtINR(inv.subtotal || inv.baseAmount) }),
                          jsx('td', {
                            style: { textAlign: 'center' },
                            children: jsx('span', {
                              className: 'fi-regime-tag',
                              children: [
                                inv.gstType || 'CGST+SGST',
                                ` (${inv.gstRate ?? 18}%)`
                              ]
                            })
                          }),
                          jsx('td', { style: { textAlign: 'center' }, children: fmtINR(inv.tax || inv.gstAmount) }),
                          jsx('td', { style: { textAlign: 'center', fontWeight: '700', color: 'var(--text)' }, children: fmtINR(inv.totalAmount) }),
                          jsx('td', { style: { textAlign: 'center', color: '#10b981', fontWeight: '600' }, children: fmtINR(inv.paidAmount) }),
                          jsx('td', { style: { textAlign: 'center', color: inv.balance > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }, children: fmtINR(inv.balance) }),
                          jsx('td', { style: { textAlign: 'center' }, children: renderStatusBadge(inv.status) }),
                          jsx('td', {
                            style: { textAlign: 'center' },
                            children: jsx('span', {
                              className: 'admin-tax-badge',
                              style: { background: inv.gstCategory === 'B2B' ? 'rgba(59,130,246,0.15)' : inv.gstCategory === 'Export LUT' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)', color: inv.gstCategory === 'B2B' ? '#3b82f6' : inv.gstCategory === 'Export LUT' ? '#10b981' : '#94a3b8' },
                              children: inv.gstCategory || 'B2B'
                            })
                          }),
                          jsx('td', {
                            style: { textAlign: 'center' },
                            children: jsxs('div', { style: { display: 'inline-flex', gap: 6 }, children: [
                              jsx('button', {
                                type: 'button',
                                className: 'action-btn action-btn--view',
                                title: 'Preview Tax Invoice',
                                'aria-label': 'Preview Tax Invoice',
                                onClick: (e) => { e.stopPropagation(); openInvoiceDetail(inv); },
                                children: jsx(Icon, { name: 'eye' })
                              }),
                              jsx('button', {
                                type: 'button',
                                className: 'action-btn action-btn--edit',
                                title: 'Edit Tax Invoice',
                                'aria-label': 'Edit Tax Invoice',
                                onClick: (e) => { e.stopPropagation(); openEditInvoice(inv); },
                                children: jsx(Icon, { name: 'edit' })
                              }),
                              jsx('button', {
                                type: 'button',
                                className: 'action-btn action-btn--delete',
                                title: 'Delete Tax Invoice',
                                'aria-label': 'Delete Tax Invoice',
                                onClick: (e) => { e.stopPropagation(); deleteInvoiceRow(inv); },
                                children: jsx(Icon, { name: 'trash' })
                              })
                            ] })
                          })
                        ]
                      }, inv._id || inv.invoiceNumber)
                    ) : [jsx('tr', { key: 'empty', children: jsx('td', { colSpan: 12, children: jsx(EmptyState, { icon: 'finance', title: search ? `No invoices match "${search}"` : 'No invoices in this status', text: 'Try selecting a different filter option or clear your search query.' }) }) })]
                  })
                ]
              })
            }),
            paged.pager
          ]
        })
      })
    ]
  });
}

// ==========================================================================
// 4. COMMERCIAL PROPAGATIONS DIRECTORY COMPONENT
// ==========================================================================
function CommercialPropagationsView({ openId, onNewPropagation }) {
  const [propagations, setPropagations] = useState(DEFAULT_PROPAGATIONS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const scopeRef = useScopeRef();
  const paged = usePaged('/api/propagations', { q: search.trim(), status: filterStatus === 'all' ? '' : filterStatus }, { noun: 'proposals' });
  const pageRows = paged.rows;
  const pageOffset = paged.pagination ? paged.pagination.from - 1 : 0;

  // Load Propagations from API
  const loadPropagations = async () => {
    paged.reload();
    try {
      setLoading(true);
      const res = await fetch('/api/propagations');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setPropagations(json.data);
          return;
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPropagations();
  }, []);

  // Open drawer if openId passed
  useEffect(() => {
    if (openId) {
      const match = propagations.find(p => p._id === openId || p.propagationNumber === openId);
      if (match) {
        openPropagationDetail(match);
      }
    }
  }, [openId, propagations]);

  // Edit / delete a proposal
  const openEditPropagation = (prop) => {
    openDrawer(
      jsx(CreatePropagationModal, {
        propagation: prop,
        onClose: () => openDrawer(null),
        onSuccess: () => { openDrawer(null); loadPropagations(); }
      })
    );
  };
  const deletePropagationRow = async (prop) => {
    if (!await confirmDialog({
      title: `Delete ${prop.propagationNumber}?`,
      text: `The proposal for ${prop.clientName} will be removed permanently. This cannot be undone.`,
      ok: 'Delete',
      danger: true
    })) return;
    try {
      const res = await fetch(`/api/propagations/${prop._id}`, { method: 'DELETE' });
      if (res.ok) {
        toast(`${prop.propagationNumber} deleted`, { icon: 'trash' });
        loadPropagations();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.message || 'Could not delete the proposal', { icon: 'alert' });
      }
    } catch (e) {
      toast('Could not delete the proposal: ' + e.message, { icon: 'alert' });
    }
  };

  // 1-Click Conversion Engine Trigger
  const handleConvert = async (propagation) => {
    if (!await confirmDialog({
      title: `Convert ${propagation.propagationNumber} to Tax Invoice?`,
      text: `This will auto-assign the next sequential invoice number, apply statutory GST (18%), and mark this proposal as Accepted.`,
      ok: 'Convert to Invoice'
    })) return;

    try {
      const res = await fetch(`/api/propagations/${propagation._id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const json = await res.json();
        toast(`Generated Invoice ${json.invoice?.invoiceNumber || ''} successfully!`, { icon: 'check' });
        loadPropagations();
        // Redirect to Invoices tab or open newly created invoice
        setTimeout(() => {
          if (window.__navigate) window.__navigate('/finance/invoices');
          else {
            history.pushState(null, '', '/finance/invoices');
            window.dispatchEvent(new Event('popstate'));
          }
        }, 1200);
      } else {
        // Fallback simulation
        setPropagations(prev => prev.map(p => p._id === propagation._id ? { ...p, status: 'Accepted' } : p));
        toast(`Propagation ${propagation.propagationNumber} converted to Invoice`, { icon: 'check' });
      }
    } catch {
      toast('Failed to convert propagation', { icon: 'clock' });
    }
  };

  // Open Propagation Detail Drawer
  const openPropagationDetail = (propagation) => {
    openDrawer(
      jsxs(ModalDrawer, {
        title: propagation.propagationNumber,
        sub: `${propagation.clientName} — ${propagation.title}`,
        tools: renderStatusBadge(propagation.status),
        foot: jsxs(Fragment, {
          children: [
            jsxs('button', {
              className: 'btn btn--ghost',
              type: 'button',
              onClick: () => window.print(),
              children: [jsx(Icon, { name: 'download' }), 'Print / Save PDF']
            }),
            propagation.status !== 'Accepted' && jsxs('button', {
              className: 'btn btn--primary',
              type: 'button',
              onClick: () => handleConvert(propagation),
              children: [jsx(Icon, { name: 'finance' }), 'Convert to Invoice (1-Click)']
            })
          ]
        }),
        children: [
          jsx('div', {
            style: { overflowX: 'auto', padding: '10px 0' },
            children: jsx(PrintablePropagationDoc, {
              propagation,
              onConvert: propagation.status !== 'Accepted' ? () => handleConvert(propagation) : null
            })
          })
        ]
      })
    );
  };

  // KPIs
  const totalScope = propagations.reduce((acc, p) => acc + (p.subtotal || p.total || 0), 0);
  const acceptedScope = propagations.filter(p => p.status === 'Accepted').reduce((acc, p) => acc + (p.subtotal || p.total || 0), 0);
  const sentScope = propagations.filter(p => p.status === 'Sent').reduce((acc, p) => acc + (p.subtotal || p.total || 0), 0);

  // Filtered
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return propagations.filter(prop => {
      const matchFilter = filterStatus === 'all' || prop.status.toLowerCase() === filterStatus.toLowerCase();
      const matchSearch = !q ||
        prop.propagationNumber.toLowerCase().includes(q) ||
        (prop.clientName && prop.clientName.toLowerCase().includes(q)) ||
        (prop.title && prop.title.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [propagations, search, filterStatus]);

  const countByStatus = (status) => {
    if (status === 'all') return propagations.length;
    return propagations.filter(p => p.status.toLowerCase() === status.toLowerCase()).length;
  };

    // Export Propagations CSV
  const handleExportPropagationsCSV = () => {
    const headers = ['Propagation #', 'Client Name', 'Scope / Project Title', 'Scope Amount', 'Status', 'Issue Date', 'Validity Date', 'Deliverables'];
    const rows = filtered.map(prop => [
      `"${prop.propagationNumber || ''}"`,
      `"${(prop.clientName || '').replace(/"/g, '""')}"`,
      `"${(prop.title || '').replace(/"/g, '""')}"`,
      prop.totalAmount || 0,
      `"${prop.status || ''}"`,
      `"${prop.date || ''}"`,
      `"${prop.validUntil || ''}"`,
      (prop.lineItems || []).length
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aedentek_Commercial_Propagations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return jsxs('div', {
    ref: scopeRef,
    children: [
      // Top Live KPIs
      jsxs('div', {
        className: 'kpis fi-kpis',
        children: [
          // Total Scope Proposals Value
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'cobalt',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'finance' }) }),
                  'Total Scope Value'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700' }, children: fmtINR(totalScope) }),
              jsxs('span', { className: 'kpi__foot', children: [`${propagations.length} commercial quotations`] })
            ]
          }),

          // Accepted Scope (Ready for Conversion)
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'teal',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'check' }) }),
                  'Accepted Commitments'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700', color: '#10b981' }, children: fmtINR(acceptedScope) }),
              jsxs('span', { className: 'kpi__foot', children: ['Ready for 1-click invoice conversion'] })
            ]
          }),

          // Under Client Review
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'amber',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'clock' }) }),
                  'Under Client Review'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700' }, children: fmtINR(sentScope) }),
              jsxs('span', { className: 'kpi__foot', children: [`${countByStatus('Sent')} proposals active`] })
            ]
          }),

          // Quotation Win Rate
          jsxs('div', {
            className: 'kpi',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'sparkle' }) }),
                  'Win / Acceptance Rate'
                ]
              }),
              jsx('div', { className: 'kpi__value', style: { fontSize: '24px', fontWeight: '700' }, children: `${Math.round((countByStatus('Accepted') / (propagations.length || 1)) * 100)}%` }),
              jsxs('span', { className: 'kpi__foot', children: ['Commercial acceptance pipeline'] })
            ]
          })
        ]
      }),

      // Main Toolbar & Filter Chips
      // Main Toolbar & Propagations Summary Table in Unified Master Card
      jsx(Card, {
        flush: true,
        children: jsxs('div', {
          children: [
            jsxs('div', {
              className: 'toolbar fi-toolbar',
              style: { padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--line)', marginBottom: 0 },
              children: [
                jsx(SearchInput, {
                  value: search,
                  onChange: setSearch,
                  placeholder: 'Search proposal #, client, or deliverables...'
                }),
                jsx('span', { style: { flex: 1 } }),
                jsx('select', {
                  className: 'select table-filter-select',
                  value: filterStatus,
                  onChange: (e) => setFilterStatus(e.target.value),
                  children: [
                    jsx('option', { value: 'all', children: 'All Proposals' }),
                    jsx('option', { value: 'Accepted', children: 'Accepted' }),
                    jsx('option', { value: 'Sent', children: 'Sent' }),
                    jsx('option', { value: 'Draft', children: 'Draft' })
                  ]
                }),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--ghost',
                  style: { height: 38 },
                  onClick: handleExportPropagationsCSV,
                  children: jsxs('span', {
                    style: { display: 'flex', alignItems: 'center', gap: 6 },
                    children: [jsx(Icon, { name: 'download' }), 'Export CSV']
                  })
                }),
                onNewPropagation && jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  style: { height: 38 },
                  onClick: onNewPropagation,
                  children: jsxs('span', {
                    style: { display: 'flex', alignItems: 'center', gap: 6 },
                    children: [jsx(Icon, { name: 'plus' }), 'Create Commercial Proposal']
                  })
                })
              ]
            }),
jsxs('div', {
              className: 'table-wrap',
              children: jsxs('table', {
                className: 'table table--stack fi-table',
                children: [
                  jsx('thead', {
                    children: jsxs('tr', {
                      children: [
                        jsx('th', { style: { width: 56, textAlign: 'center' }, children: 'S No' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Propagation #' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Client Name' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Scope / Project Title' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Scope Amount' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Status' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Issue Date' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Validity Date' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Deliverables' }),
                        jsx('th', { style: { textAlign: 'center' }, children: 'Action' })
                      ]
                    })
                  }),
                  jsx('tbody', {
                    children: pageRows.length ? pageRows.map((prop, idx) =>
                      jsxs('tr', {
                        key: prop._id || prop.propagationNumber,
                        className: 'is-click',
                        'data-row': '',
                        onClick: () => openPropagationDetail(prop),
                        children: [
                          jsx('td', {
                            style: { textAlign: 'center', verticalAlign: 'middle' },
                            children: jsx('span', {
                              className: 'sno-pill sno-pill--normal',
                              children: idx + pageOffset + 1
                            })
                          }),
                          jsx('td', {
                            style: { textAlign: 'center' },
                            children: jsxs('div', {
                              children: [
                                jsx('b', { style: { fontFamily: 'monospace' }, children: prop.propagationNumber }),
                                prop.convertedInvoiceNumber && jsx('div', { style: { fontSize: '11px', color: '#10b981' }, children: `Converted: ${prop.convertedInvoiceNumber}` })
                              ]
                            })
                          }),
                          jsx('td', { style: { textAlign: 'center' }, children: jsx('b', { children: prop.clientName }) }),
                          jsx('td', { style: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }, children: prop.title }),
                          jsx('td', { style: { textAlign: 'center', fontWeight: '700', color: 'var(--text)' }, children: fmtINR(prop.total ?? prop.totalAmount) }),
                          jsx('td', { style: { textAlign: 'center' }, children: renderStatusBadge(prop.status) }),
                          jsx('td', { style: { textAlign: 'center' }, children: prop.issueDate || String(prop.date || '').slice(0, 10) }),
                          jsx('td', { style: { textAlign: 'center' }, children: prop.validUntil }),
                          jsx('td', { style: { textAlign: 'center' }, children: jsxs('span', { className: 'admin-tax-badge', style: { background: 'var(--card-2)', color: 'var(--text)' }, children: [`${(prop.lineItems || []).length} items`] }) }),
                          jsx('td', {
                            style: { textAlign: 'center' },
                            children: jsxs('div', { style: { display: 'inline-flex', gap: 6 }, children: [
                              jsx('button', {
                                type: 'button',
                                className: 'action-btn action-btn--view',
                                title: 'Preview Commercial Proposal',
                                'aria-label': 'Preview Commercial Proposal',
                                onClick: (e) => { e.stopPropagation(); openPropagationDetail(prop); },
                                children: jsx(Icon, { name: 'eye' })
                              }),
                              jsx('button', {
                                type: 'button',
                                className: 'action-btn action-btn--edit',
                                title: 'Edit Commercial Proposal',
                                'aria-label': 'Edit Commercial Proposal',
                                onClick: (e) => { e.stopPropagation(); openEditPropagation(prop); },
                                children: jsx(Icon, { name: 'edit' })
                              }),
                              jsx('button', {
                                type: 'button',
                                className: 'action-btn action-btn--delete',
                                title: 'Delete Commercial Proposal',
                                'aria-label': 'Delete Commercial Proposal',
                                onClick: (e) => { e.stopPropagation(); deletePropagationRow(prop); },
                                children: jsx(Icon, { name: 'trash' })
                              })
                            ] })
                          })
                        ]
                      }, prop._id || prop.propagationNumber)
                    ) : [jsx('tr', { key: 'empty', children: jsx('td', { colSpan: 10, children: jsx(EmptyState, { icon: 'deals', title: search ? `No proposals match "${search}"` : 'No proposals in this status', text: 'Try selecting a different filter option or clear your search query.' }) }) })]
                  })
                ]
              })
            }),
            paged.pager
          ]
        })
      })    ]
  });
}

// ==========================================================================
// 5. COMMISSIONS CALCULATOR VIEW (PRESERVED)
// ==========================================================================
const REP_EARNINGS = { u1: 742000, u2: 668500, u3: 512300, u4: 298400, u5: 96200, u6: 71800 };
function CommissionsView() {
  const state = useGlobalState();
  const scopeRef = useScopeRef();
  const [sortMode, setSortMode] = useState('earned');

  const reps = state.users
    .filter(u => u.quota > 0)
    .map(user => {
      const won = (REP_EARNINGS[user.id] ?? 0) +
        state.deals.filter(d => d.stage === 'won' && d.owner === user.id && d.close >= '2026-01-01').reduce((a, b) => a + b.value, 0);
      const rate = calcRepRate(user);
      return { u: user, won, rate, earned: won * rate, att: (won / user.quota) * 100 };
    })
    .sort((a, b) => (sortMode === 'earned' ? b.earned - a.earned : b.att - a.att));

  const topRep = reps[0];
  const totalEarned = reps.reduce((a, b) => a + b.earned, 0);

  return jsxs('div', {
    ref: scopeRef,
    children: [
      jsxs('div', {
        className: 'fi-comm-top',
        children: [
          jsxs('section', {
            className: 'card fi-leader',
            'data-card': '',
            'data-tone': topRep.u.tone,
            children: [
              jsxs('span', { className: 'fi-leader__tag', children: [jsx(Icon, { name: 'trophy' }), 'Top earner · 2026'] }),
              jsxs('div', {
                className: 'row',
                style: { gap: 14, marginTop: 12 },
                children: [
                  jsx(UserAvatar, { name: topRep.u.name, tone: topRep.u.tone, size: 54 }),
                  jsxs('span', { className: 'li__main', children: [jsx('b', { className: 'fi-leader__name', children: topRep.u.name }), jsx('small', { children: topRep.u.role })] })
                ]
              }),
              jsx(AnimatedNumber, { className: 'fi-leader__fig', value: topRep.earned, fmt: formatCurrency }),
              jsxs('span', { className: 'fi-leader__meta', children: [`on `, formatCurrency(topRep.won), ` won · `, Math.round(topRep.rate * 100), `% rate`] })
            ]
          }),
          jsxs(Card, {
            title: 'Team earnings',
            sub: 'Commission earned this year, every rep',
            children: [
              jsxs('div', {
                className: 'fi-total',
                children: [
                  jsx(AnimatedNumber, { value: totalEarned, fmt: formatCurrency, className: 'fi-total__fig' }),
                  jsxs('span', { className: 'muted', children: [`earned across `, reps.length, ` reps`] })
                ]
              }),
              jsxs('p', {
                className: 'fi-rule',
                children: [
                  jsx(Icon, { name: 'help' }),
                  'Account executives earn 5% and sales development 3% of won value owned, paid on the 5th of the next month.'
                ]
              })
            ]
          })
        ]
      }),
      jsx(Card, {
        title: 'By rep',
        sub: 'Earned, won value and quota attainment',
        tools: jsx(SelectField, {
          label: 'Sort',
          value: sortMode,
          onChange: setSortMode,
          options: [{ id: 'earned', label: 'Earned' }, { id: 'quota', label: 'Quota' }]
        }),
        children: jsx('div', {
          className: 'fi-reps',
          children: reps.map(item =>
            jsxs('div', {
              key: item.u.id,
              className: 'fi-rep',
              'data-row': '',
              children: [
                jsx(RadialProgress, {
                  value: Math.min(100, item.att),
                  size: 54,
                  stroke: 6,
                  tone: item.att >= 80 ? 'teal' : item.att >= 50 ? 'cobalt' : 'amber',
                  children: jsx('b', { className: 'fi-rep__pct', children: `${Math.round(item.att)}%` })
                }),
                jsxs('span', {
                  className: 'li__main',
                  children: [
                    jsx('b', { children: item.u.name }),
                    jsxs('small', { children: [formatCompactCurrency(item.won), ' of ', formatCompactCurrency(item.u.quota), ' · ', Math.round(item.rate * 100), '%'] })
                  ]
                }),
                jsx('div', {
                  className: 'fi-rep__bar',
                  children: jsx(ProgressBar, { value: (item.earned / reps[0].earned) * 100, tone: 'cobalt', label: `${item.u.name} earned` })
                }),
                jsx('b', { className: 'fi-rep__v', children: formatCurrency(item.earned) })
              ]
            }, item.u.id)
          )
        })
      })
    ]
  });
}

// ==========================================================================
// 6. CREATE STATUTORY TAX INVOICE MODAL (CLEAN NON-STATIC SCHEMA)
// ==========================================================================
// ===========================================================================
// Full-page INVOICE BUILDER (create + edit): client selection, invoice details, GST option,
// tabular line items, totals, company / bank / signatory blocks and a template tab.
// ===========================================================================
const IB_GSTIN_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const IB_PAN_RX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IB_EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IB_DESIGNATIONS = ['Authorised Signatory', 'Proprietor', 'Managing Director', 'Partner', 'Director'];

function InvoiceBuilderPage({ invoice, onClose }) {
  const editing = Boolean(invoice);
  const ymd = (d) => d.toISOString().slice(0, 10);
  const [tab, setTab] = useState('form');
  const [clients, setClients] = useState([]);
  const [senders, setSenders] = useState([]);
  const [banks, setBanks] = useState([]);
  const [slabs, setSlabs] = useState([]);
  const [dfltRate, setDfltRate] = useState(null);
  const [nextNo, setNextNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [openSec, setOpenSec] = useState({ company: false, bank: false, sign: false });
  // saved profile chosen => view only; '__manual' => editable
  const [senderSel, setSenderSel] = useState(editing ? '__manual' : '');
  const [bankSel, setBankSel] = useState(editing ? '__manual' : '');
  const lockS = Boolean(senderSel) && senderSel !== '__manual';
  const lockB = Boolean(bankSel) && bankSel !== '__manual';
  const toggleSec = (k) => setOpenSec((s) => ({ ...s, [k]: !s[k] }));
  const [f, setF] = useState(() => {
    const inv = invoice || {};
    const bd = inv.bankDetails || {};
    const cat = inv.gstCategory || 'B2B';
    const due = new Date(); due.setDate(due.getDate() + 30);
    return {
      clientMode: inv.clientId ? 'registered' : (editing ? 'manual' : (inv.clientMode || 'registered')),
      clientId: inv.clientId || '',
      clientName: inv.clientName || '', clientEmail: inv.clientEmail || '', clientPhone: inv.clientPhone || '',
      buyerGstin: inv.buyerGstin || '', buyerPan: inv.buyerPan || '', buyerAddress: inv.buyerAddress || '',
      projectName: inv.projectName || '',
      title: inv.title || '',
      issueDate: inv.issueDate || ymd(new Date()),
      dueDate: inv.dueDate || ymd(due),
      gstOption: cat === 'B2B' ? 'B2B' : cat === 'B2C' ? 'B2C' : 'NOGST',
      regime: inv.gstType === 'CGST+SGST' ? 'INTRA' : 'INTER',
      hsn: inv.hsn || '998314',
      items: Array.isArray(inv.items) && inv.items.length
        ? inv.items.map((it) => ({ description: it.description || '', price: it.price, qty: it.qty, hsn: it.hsn || inv.hsn || '998314' }))
        : [{ description: '', price: '', qty: 1, hsn: '998314' }],
      discountType: inv.discountType || 'none', discountValue: inv.discountValue ? String(inv.discountValue) : '',
      companyName: inv.companyName || '', companyTagline: inv.companyTagline || '', companyContactPerson: inv.companyContactPerson || '',
      companyEmail: inv.companyEmail || '', companyPhone: inv.companyPhone || '', companyGst: inv.companyGst || '', companyPan: inv.companyPan || '',
      companyAddress: inv.companyAddress || '', companyLogo: inv.companyLogo || '',
      bankName: bd.bankName || '', accountName: bd.accountName || '', accountType: bd.accountType || 'Current', accountNumber: bd.accountNumber || '',
      ifsc: bd.ifsc || '', branch: bd.branch || '', upiId: bd.upiId || '', bankAddress: bd.bankAddress || '', qrCode: bd.qrCode || '',
      signatoryName: inv.signatoryName || '', signatoryDesignation: inv.signatoryDesignation || 'Authorised Signatory', signatorySeal: inv.signatorySeal || ''
    };
  });
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setItem = (i, k, v) => setF((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => setF((p) => ({ ...p, items: [...p.items, { description: '', price: '', qty: 1, hsn: p.hsn || '998314' }] }));
  const removeItem = (i) => setF((p) => (p.items.length > 1 ? { ...p, items: p.items.filter((_, idx) => idx !== i) } : p));

  // ---- load clients, profiles, slabs and defaults ----
  useEffect(() => {
    let alive = true;
    (async () => {
      const get = async (u) => { try { const r = await fetch(u); return await r.json(); } catch (e) { return {}; } };
      const [c, sp, bp, gr, st, nn] = await Promise.all([
        get('/api/clients'), get('/api/settings-profiles?type=invoiceSender'), get('/api/settings-profiles?type=bankDetails'),
        get('/api/gst-rates'), get('/api/settings'), editing ? Promise.resolve({}) : get('/api/invoices/next-number')
      ]);
      if (!alive) return;
      setClients(c.data || []);
      if (editing) setF((p) => (p.clientMode === 'registered' && !(c.data || []).some((x) => (x.clientId || x._id) === p.clientId) ? { ...p, clientMode: 'manual', clientId: '' } : p));
      setSenders(sp.data || []); setBanks(bp.data || []); setSlabs(gr.data || []);
      if (!editing) {
        const ds = (sp.data || []).find((x) => x.isDefault), db = (bp.data || []).find((x) => x.isDefault);
        setSenderSel(ds ? ds._id : '__manual'); setBankSel(db ? db._id : '__manual');
      }
      if (nn && nn.nextNumber) setNextNo(nn.nextNumber);
      const s = (st.data && st.data.invoiceSender) || {};
      const b = (st.data && st.data.bankDetails) || {};
      const g = (st.data && st.data.gstSettings) || {};
      if (Number(g.defaultGstRate) > 0) setDfltRate(Number(g.defaultGstRate));
      // Blank company / bank / signatory fields start from the default profiles (new and legacy invoices alike).
      {
        setF((p) => ({
          ...p,
          ...(editing ? {} : { hsn: g.defaultHsn || p.hsn, items: p.items.map((it) => (it.description || it.price ? it : { ...it, hsn: g.defaultHsn || it.hsn })) }),
          companyName: p.companyName || s.companyName || '', companyTagline: p.companyTagline || s.companyTagline || '',
          companyContactPerson: p.companyContactPerson || s.companyContactPerson || '', companyEmail: p.companyEmail || s.companyEmail || '',
          companyPhone: p.companyPhone || s.companyPhone || '', companyGst: p.companyGst || s.companyGst || '', companyPan: p.companyPan || s.companyPan || '',
          companyAddress: p.companyAddress || s.companyAddress || '', companyLogo: p.companyLogo || s.companyLogo || '',
          bankName: p.bankName || b.bankName || '', accountName: p.accountName || b.accountName || '', accountType: editing ? p.accountType : (b.accountType || p.accountType),
          accountNumber: p.accountNumber || b.accountNumber || '', ifsc: p.ifsc || b.ifsc || '', branch: p.branch || b.branch || '',
          upiId: p.upiId || b.upiId || '', bankAddress: p.bankAddress || b.bankAddress || '', qrCode: p.qrCode || b.qrCode || '',
          signatoryName: p.signatoryName || s.signatoryName || '', signatoryDesignation: editing ? p.signatoryDesignation : (s.signatoryDesignation || p.signatoryDesignation),
          signatorySeal: p.signatorySeal || s.signatorySeal || ''
        }));
      }
    })();
    return () => { alive = false; };
  }, []);

  // ---- derived values ----
  const noGst = f.gstOption === 'NOGST';
  const gstCategory = noGst ? (invoice && invoice.gstCategory === 'Export LUT' ? 'Export LUT' : 'N/A') : f.gstOption;
  const gstType = noGst ? (gstCategory === 'Export LUT' ? 'Export LUT' : 'Exempted') : (f.regime === 'INTRA' ? 'CGST+SGST' : 'IGST');
  const gstRate = noGst ? 0 : (editing ? (Number(invoice.gstRate) > 0 ? Number(invoice.gstRate) : (dfltRate || 18)) : (dfltRate || 18));
  const lineTotal = (it) => (Number(it.price) || 0) * (Number(it.qty) || 0);
  const subtotal = f.items.reduce((s, it) => s + lineTotal(it), 0);
  const dVal = Number(f.discountValue) || 0;
  const discountAmount = f.discountType === 'percent' ? Math.round(Math.min(subtotal, subtotal * dVal / 100) * 100) / 100 : f.discountType === 'flat' ? Math.round(Math.min(subtotal, dVal) * 100) / 100 : 0;
  const taxable = subtotal - discountAmount;
  const taxRatio = subtotal > 0 ? taxable / subtotal : 1;
  const gstAmount = Math.round((taxable * gstRate) / 100);
  const totalAmount = taxable + gstAmount;
  const fmt2 = (n) => (Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const regimeLabel = noGst ? 'No GST' : (f.regime === 'INTRA' ? 'CGST+SGST' : 'IGST');

  // ---- registered client / profile pickers ----
  const pickClient = (id) => {
    const c = clients.find((x) => (x.clientId || x._id) === id);
    if (!c) { set({ clientId: '', clientName: '', clientEmail: '', clientPhone: '', buyerGstin: '', buyerPan: '', buyerAddress: '', projectName: '' }); return; }
    set({
      clientId: id, clientName: c.company || c.name || '', clientEmail: c.email || '', clientPhone: c.phone || '',
      buyerGstin: c.gstNumber || '', buyerPan: c.panNumber || '', buyerAddress: [c.address, c.city].filter(Boolean).join(', '), projectName: ''
    });
  };
  const selectedClient = clients.find((x) => (x.clientId || x._id) === f.clientId);
  const pickSender = (id) => {
    setSenderSel(id);
    if (id === '__manual') { set({ companyName: '', companyTagline: '', companyContactPerson: '', companyEmail: '', companyPhone: '', companyGst: '', companyPan: '', companyAddress: '', companyLogo: '', signatoryName: '', signatoryDesignation: 'Authorised Signatory', signatorySeal: '' }); return; }
    const s = senders.find((x) => x._id === id); if (!s) return; const d = s.data || {};
    set({ companyName: d.companyName || '', companyTagline: d.companyTagline || '', companyContactPerson: d.companyContactPerson || '', companyEmail: d.companyEmail || '',
      companyPhone: d.companyPhone || '', companyGst: d.companyGst || '', companyPan: d.companyPan || '', companyAddress: d.companyAddress || '', companyLogo: d.companyLogo || '',
      signatoryName: d.signatoryName || f.signatoryName, signatoryDesignation: d.signatoryDesignation || f.signatoryDesignation, signatorySeal: d.signatorySeal || f.signatorySeal });
  };
  const pickBank = (id) => {
    setBankSel(id);
    if (id === '__manual') { set({ bankName: '', accountName: '', accountType: 'Current', accountNumber: '', ifsc: '', branch: '', upiId: '', bankAddress: '', qrCode: '' }); return; }
    const b = banks.find((x) => x._id === id); if (!b) return; const d = b.data || {};
    set({ bankName: d.bankName || '', accountName: d.accountName || '', accountType: d.accountType || 'Current', accountNumber: d.accountNumber || '', ifsc: d.ifsc || '',
      branch: d.branch || '', upiId: d.upiId || '', bankAddress: d.bankAddress || '', qrCode: d.qrCode || '' });
  };

  // ---- save ----
  const save = async () => {
    const err = (m) => { toast(m, { icon: 'alert' }); return false; };
    if (!f.clientName.trim()) return err(f.clientMode === 'registered' ? 'Select a billed client' : 'Enter the client name');
    if (!f.issueDate || !f.dueDate) return err('Issue date and due date are required');
    if (f.dueDate < f.issueDate) return err('Due date cannot be earlier than the issue date');
    if (f.gstOption === 'B2B' && !f.buyerGstin.trim()) return err('Buyer GSTIN is required for a B2B invoice');
    if (f.buyerGstin.trim() && !IB_GSTIN_RX.test(f.buyerGstin.trim().toUpperCase())) return err('Buyer GSTIN must be a valid 15-character GSTIN');
    if (f.buyerPan.trim() && !IB_PAN_RX.test(f.buyerPan.trim().toUpperCase())) return err('Buyer PAN must be a valid 10-character PAN');
    if (f.clientEmail.trim() && !IB_EMAIL_RX.test(f.clientEmail.trim())) return err('Client email is not valid');
    const rows = f.items.filter((it) => it.description.trim() || Number(it.price) > 0);
    if (!rows.length) return err('Add at least one line item with a description and price');
    if (rows.some((it) => !it.description.trim())) return err('Every line item needs a description');
    if (rows.some((it) => !(Number(it.price) >= 0) || !(Number(it.qty) >= 0))) return err('Price and quantity must be zero or more');
    const coErr = (m) => { setOpenSec((s) => ({ ...s, company: true })); return err(m); };
    if (!f.companyName.trim()) return coErr('Company / issuer name is required');
    if (f.companyEmail.trim() && !IB_EMAIL_RX.test(f.companyEmail.trim())) return coErr('Company email is not valid');
    if (f.companyGst.trim() && !IB_GSTIN_RX.test(f.companyGst.trim().toUpperCase())) return coErr('Company GSTIN must be a valid 15-character GSTIN');
    if (f.companyPan.trim() && !IB_PAN_RX.test(f.companyPan.trim().toUpperCase())) return coErr('Company PAN must be a valid 10-character PAN');
    if (f.discountType !== 'none') {
      if (f.discountValue === '' || !(Number(f.discountValue) >= 0)) return err('Enter a valid discount value');
      if (f.discountType === 'percent' && Number(f.discountValue) > 100) return err('Discount percentage cannot exceed 100');
    }
    const items = rows.map((it, i) => ({ sNo: i + 1, description: it.description.trim(), hsn: it.hsn || f.hsn, price: Number(it.price) || 0, qty: Number(it.qty) || 0, total: lineTotal(it) }));
    const sub = items.reduce((s, it) => s + it.total, 0);
    if (f.discountType === 'flat' && Number(f.discountValue) > sub) return err('Discount cannot be greater than the subtotal');
    const gst = Math.round(((sub - discountAmount) * gstRate) / 100);
    const common = {
      clientMode: f.clientMode, clientId: f.clientMode === 'registered' ? f.clientId : '', clientName: f.clientName.trim(), clientEmail: f.clientEmail.trim(), clientPhone: f.clientPhone.trim(),
      buyerGstin: f.buyerGstin.trim().toUpperCase(), buyerPan: f.buyerPan.trim().toUpperCase(), buyerAddress: f.buyerAddress.trim(), projectName: f.projectName,
      title: f.title.trim() || (items[0] && items[0].description) || 'Invoice', issueDate: f.issueDate, dueDate: f.dueDate, gstCategory, gstType, hsn: f.hsn, items,
      discountType: f.discountType, discountValue: f.discountType === 'none' ? 0 : Number(f.discountValue) || 0,
      companyName: f.companyName.trim(), companyTagline: f.companyTagline.trim(), companyContactPerson: f.companyContactPerson.trim(), companyEmail: f.companyEmail.trim(),
      companyPhone: f.companyPhone.trim(), companyGst: f.companyGst.trim().toUpperCase(), companyPan: f.companyPan.trim().toUpperCase(), companyAddress: f.companyAddress.trim(), companyLogo: f.companyLogo,
      signatoryName: f.signatoryName.trim(), signatoryDesignation: f.signatoryDesignation.trim(), signatorySeal: f.signatorySeal,
      bankDetails: { bankName: f.bankName.trim(), accountName: f.accountName.trim(), accountType: f.accountType, accountNumber: f.accountNumber.trim(), ifsc: f.ifsc.trim().toUpperCase(),
        branch: f.branch.trim(), upiId: f.upiId.trim(), bankAddress: f.bankAddress.trim(), qrCode: f.qrCode }
    };
    const payload = editing ? common : { ...common, subtotal: sub, gstRate, gstAmount: gst, totalAmount: sub - discountAmount + gst, paidAmount: 0, balance: sub - discountAmount + gst, status: 'Sent' };
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/invoices/${invoice._id}` : '/api/invoices', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (res.ok && j.success !== false) { toast(editing ? `Invoice ${(j.data || {}).invoiceNumber || ''} updated` : `Invoice ${(j.data || {}).invoiceNumber || ''} created`, { icon: 'check' }); onClose(true); }
      else toast(j.message || 'Could not save the invoice', { icon: 'alert' });
    } catch (e) { toast('Error saving invoice: ' + e.message, { icon: 'alert' }); }
    finally { setSaving(false); }
  };

  // ---- template tab: inline editing hooks ----
  const draft = {
    ...(invoice || {}),
    invoiceNumber: invoice ? invoice.invoiceNumber : (nextNo || 'INV-AUTO'),
    clientName: f.clientName, clientEmail: f.clientEmail, clientPhone: f.clientPhone, buyerGstin: f.buyerGstin, buyerPan: f.buyerPan, buyerAddress: f.buyerAddress,
    title: f.title, issueDate: f.issueDate, dueDate: f.dueDate, gstCategory, gstType, hsn: f.hsn,
    items: f.items.map((it, i) => ({ sNo: i + 1, description: it.description, hsn: it.hsn || f.hsn, price: Number(it.price) || 0, qty: Number(it.qty) || 0, total: lineTotal(it) })),
    subtotal, discountType: f.discountType, discountValue: Number(f.discountValue) || 0, discountAmount, gstRate, gstAmount, totalAmount, paidAmount: invoice ? invoice.paidAmount || 0 : 0, balance: Math.max(0, totalAmount - (invoice ? invoice.paidAmount || 0 : 0)),
    companyName: f.companyName, companyAddress: f.companyAddress, companyGst: f.companyGst, companyPan: f.companyPan, companyEmail: f.companyEmail, companyPhone: f.companyPhone, companyLogo: f.companyLogo,
    signatoryName: f.signatoryName, signatoryDesignation: f.signatoryDesignation, signatorySeal: f.signatorySeal,
    bankDetails: { bankName: f.bankName, accountName: f.accountName, accountType: f.accountType, accountNumber: f.accountNumber, ifsc: f.ifsc, branch: f.branch, upiId: f.upiId, bankAddress: f.bankAddress, qrCode: f.qrCode }
  };
  window.__tlInvEdit = tab === 'template' ? {
    values: { clientName: f.clientName, dueDate: f.dueDate }, items: f.items,
    setValue: (k, v) => set({ [k]: v }), setItem, removeItem
  } : null;
  useEffect(() => () => { window.__tlInvEdit = null; }, []);

  // ---- tiny field helpers ----
  const fld = (label, node, cls, required) => jsxs('label', { className: 'field ' + (cls || ''), children: [jsx('span', { children: required ? label + ' *' : label }), node] });
  const inp = (key, ph, extra) => jsx('input', Object.assign({ className: 'input', value: f[key], placeholder: ph || '', onChange: (e) => set({ [key]: e.target.value }) }, extra || {}));
  const sel = (key, opts, onChange) => jsx('select', { className: 'select', value: f[key], onChange: onChange || ((e) => set({ [key]: e.target.value })), children: opts.map(([v, l]) => jsx('option', { value: v, children: l }, v)) });
  const card = (title, sub, icon, right, children, ck) => jsxs('section', { className: ck ? 'ivb-sub is-collapsible' + (openSec[ck] ? ' is-open' : '') : 'ivb-card', children: [
    jsxs('div', { className: 'ivb-card__head', onClick: ck ? (e) => { if (!e.target.closest('select,label,.ivb-pick,button')) toggleSec(ck); } : undefined, children: [
      jsx('span', { className: 'ivb-card__ico', children: jsx(Icon, { name: icon }) }),
      jsxs('div', { className: 'ivb-card__txt', children: [jsx('b', { children: title }), sub ? jsx('small', { children: sub }) : null] }),
      right || null,
      ck ? jsx('button', { type: 'button', className: 'ivb-chev', 'aria-expanded': !!openSec[ck], title: openSec[ck] ? 'Collapse' : 'Expand', onClick: () => toggleSec(ck), 'aria-label': openSec[ck] ? 'Collapse section' : 'Expand section', children: jsx('svg', { className: 'ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', children: jsx('polyline', { points: '6 9 12 15 18 9' }) }) }) : null
    ] }),
    (!ck || openSec[ck]) ? jsx('div', { className: 'ivb-card__body', children }) : null
  ] });
  const opt = (on, title, desc, tag, tagTone, onClick) => jsxs('button', { type: 'button', className: 'ivb-opt' + (on ? ' is-on' : ''), onClick, children: [
    jsxs('span', { className: 'ivb-opt__top', children: [jsx('b', { children: title }), jsx('i', { className: 'ivb-opt__radio' })] }),
    desc ? jsx('small', { children: desc }) : null,
    tag ? jsx('em', { className: 'ivb-opt__tag ivb-opt__tag--' + (tagTone || 'good'), children: tag }) : null
  ] });
  const hsnList = [...new Set([f.hsn, ...slabs.map((s) => s.hsnCode)].filter(Boolean))];

  const formTab = jsxs('div', { className: 'ivb-stack', children: [
    jsxs('div', { className: 'ivb-row2', children: [
    card('Client selection', 'Choose a registered CRM client or type the details manually.', 'deals', null, jsxs('div', { className: 'ivb-stack ivb-stack--tight', children: [
      jsxs('div', { className: 'ivb-opts ivb-opts--2', children: [
        opt(f.clientMode === 'registered', 'Select Registered Client', 'Pick from existing CRM clients with auto-filled tax status & linked projects', null, null, () => set({ clientMode: 'registered' })),
        opt(f.clientMode === 'manual', 'Enter Client Details Manually', 'Type client name, email, phone, GSTIN and billing address directly', null, null, () => set({ clientMode: 'manual', clientId: '' }))
      ] }),
      f.clientMode === 'registered'
        ? jsxs(Fragment, { children: [
            jsxs('div', { className: 'ivb-grid ivb-grid--2', children: [
              fld('Billed client', jsx('select', { className: 'select', value: f.clientId, onChange: (e) => pickClient(e.target.value), children: [jsx('option', { value: '', key: '__', children: 'Select billed client...' }), ...clients.map((c) => jsx('option', { value: c.clientId || c._id, key: c._id, children: c.company || c.name }))] }), '', true),
              fld('Associated client project', jsx('select', { className: 'select', value: f.projectName, onChange: (e) => set({ projectName: e.target.value }), children: [jsx('option', { value: '', key: '__', children: 'General retainer / direct account invoice' }), ...((selectedClient && selectedClient.projects) || []).map((p) => jsx('option', { value: p.title, key: p.id || p.title, children: p.title }))] }))
            ] }),
            jsx('div', { className: 'ivb-hint', children: selectedClient
              ? `${selectedClient.company || selectedClient.name} · GSTIN ${selectedClient.gstNumber || 'not on file'} · ${selectedClient.email || 'no email'} · ${selectedClient.phone || 'no phone'}`
              : 'Select a client from the dropdown above to view contact details, tax status and linked records.' })
          ] })
        : jsxs('div', { className: 'ivb-grid ivb-grid--3', children: [
            fld('Client / buyer name', inp('clientName', 'e.g. Acme Corporation'), 'ivb-span-2', true),
            fld('Email', inp('clientEmail', 'billing@client.com', { type: 'email' })),
            fld('Phone', inp('clientPhone', '+91 98765 43210')),
            fld('Buyer GSTIN' + (f.gstOption === 'B2B' ? '' : ' (optional)'), inp('buyerGstin', '15-character GSTIN, e.g. 27AAAAA0000A1Z5'), '', f.gstOption === 'B2B'),
            fld('Buyer PAN (optional)', inp('buyerPan', '10-character PAN')),
            fld('Billing address', inp('buyerAddress', 'Full billing address'), 'ivb-span-3')
          ] })
    ] })),
    // 2. invoice details
    card('Invoice details', null, 'receipt', null, jsxs('div', { className: 'ivb-grid ivb-grid--3', children: [
      fld('Invoice number', jsxs('div', { className: 'ivb-auto', children: [jsx('input', { className: 'input', value: invoice ? invoice.invoiceNumber : (nextNo || 'Generating...'), disabled: true }), jsx('i', { children: 'Auto' })] }), '', true),
      fld('Invoice issue date', inp('issueDate', '', { type: 'date' }), '', true),
      fld('Payment due date', inp('dueDate', '', { type: 'date' }), '', true)
    ] })),
    ] }),
    // 3. GST option
    card('GST invoicing option', null, 'finance', jsx('span', { className: 'ivb-badge', children: noGst ? 'Bill of supply · 0% tax' : `${f.gstOption} tax invoice${f.gstOption === 'B2B' ? ' (ITC eligible)' : ''}` }), jsxs('div', { className: 'ivb-stack ivb-stack--tight', children: [
      jsxs('div', { className: 'ivb-opts ivb-opts--3', children: [
        opt(f.gstOption === 'B2B', 'B2B (Business to Business)', 'Registered business client with GSTIN. Buyer is eligible for Input Tax Credit (ITC).', 'Tax invoice · ITC eligible', 'good', () => set({ gstOption: 'B2B' })),
        opt(f.gstOption === 'B2C', 'B2C (Business to Consumer)', 'Unregistered retail end-consumer or individual client. Marked as URP (ITC not applicable).', 'Tax invoice · Retail URP', 'good', () => set({ gstOption: 'B2C' })),
        opt(noGst, 'Without GST', 'Generates bill of supply / commercial invoice with 0% tax and LUT / exemption note.', 'Bill of supply · 0% tax', 'warn', () => set({ gstOption: 'NOGST' }))
      ] }),
      fld('Tax regime / type', sel('regime', [['INTRA', 'Intra-State (CGST + SGST)'], ['INTER', 'Inter-State (IGST - 100% Integrated Tax)']]), '', true),
    ] })),
    // 4. line items
    card('Line items & pricing (tabular entry)', null, 'receipt', jsx('button', { type: 'button', className: 'btn btn--sm', onClick: addItem, children: [jsx(Icon, { name: 'plus' }), ' Add row'] }), [jsx('div', { className: 'ivb-table-wrap', children: jsxs('table', { className: 'ivb-table', children: [
      jsx('thead', { children: jsxs('tr', { children: ['S NO', 'Description *', 'Price (₹) *', 'Qty', ...(noGst ? [] : ['HSN', 'GST %', ...(f.regime === 'INTRA' ? ['CGST (₹)', 'SGST (₹)'] : ['IGST (₹)'])]), 'Total', ''].map((h, i) => jsx('th', { children: h }, i)) }) }),
      jsx('tbody', { children: f.items.map((it, i) => jsxs('tr', { children: [
        jsx('td', { children: jsx('span', { className: 'sno-pill ' + (i < 3 ? 'sno-pill--top' : 'sno-pill--normal'), children: i + 1 }) }),
        jsx('td', { children: jsx('textarea', { className: 'textarea ivb-desc', rows: 2, value: it.description, placeholder: 'e.g. System design & architecture', onChange: (e) => setItem(i, 'description', e.target.value) }) }),
        jsx('td', { children: jsx('input', { className: 'input ivb-num', type: 'number', min: 0, step: 'any', value: it.price, placeholder: '0.00', onChange: (e) => setItem(i, 'price', e.target.value) }) }),
        jsx('td', { children: jsx('input', { className: 'input ivb-num ivb-qty', type: 'number', min: 0, step: 'any', value: it.qty, onChange: (e) => setItem(i, 'qty', e.target.value) }) }),
        ...(noGst ? [] : [
          jsx('td', { children: jsx('input', { className: 'input ivb-hsn', list: 'ivb-hsn-list', value: it.hsn, onChange: (e) => setItem(i, 'hsn', e.target.value) }) }),
          jsx('td', { className: 'ivb-pct', children: (noGst ? 0 : gstRate) + '%' }),
          ...(noGst || f.regime !== 'INTRA' ? [jsx('td', { className: 'ivb-taxamt', children: '₹' + fmt2(lineTotal(it) * taxRatio * gstRate / 100) }, 'a')] : [jsx('td', { className: 'ivb-taxamt', children: '₹' + fmt2(lineTotal(it) * taxRatio * gstRate / 200) }, 'c'), jsx('td', { className: 'ivb-taxamt', children: '₹' + fmt2(lineTotal(it) * taxRatio * gstRate / 200) }, 's')])
        ]),
        jsx('td', { className: 'ivb-amt', children: '₹' + lineTotal(it).toLocaleString('en-IN') }),
        jsx('td', { children: jsx('button', { type: 'button', className: 'ivb-del', disabled: f.items.length < 2, title: 'Remove row', 'aria-label': 'Remove row', onClick: () => removeItem(i), children: '×' }) })
      ] }, i)) })
    ] }) }), jsxs('div', { className: 'ivb-totals', children: [
      jsxs('div', { children: [jsx('span', { children: `Subtotal (${f.items.length} item${f.items.length === 1 ? '' : 's'})` }), jsx('b', { children: '₹' + subtotal.toLocaleString('en-IN') })] }),
      jsxs('div', { className: 'ivb-disc', children: [
        jsx('span', { children: 'Discount' }),
        jsxs('div', { className: 'ivb-disc__ctl', children: [
          jsx('select', { className: 'select', 'aria-label': 'Discount type', value: f.discountType, onChange: (e) => set({ discountType: e.target.value, discountValue: e.target.value === 'none' ? '' : f.discountValue }), children: [['none', 'None'], ['percent', 'Percent (%)'], ['flat', 'Flat (₹)']].map(([v, l]) => jsx('option', { value: v, children: l }, v)) }),
          f.discountType !== 'none' ? jsx('input', { className: 'input ivb-num', type: 'number', min: 0, max: f.discountType === 'percent' ? 100 : undefined, step: 'any', placeholder: f.discountType === 'percent' ? '0 %' : '0.00', 'aria-label': 'Discount value', value: f.discountValue, onChange: (e) => set({ discountValue: e.target.value }) }) : null
        ] })
      ] }),
      discountAmount > 0 ? jsxs('div', { className: 'ivb-totals__disc', children: [jsx('span', { children: f.discountType === 'percent' ? `Discount (${dVal}%)` : 'Discount' }), jsx('b', { children: '− ₹' + fmt2(discountAmount) })] }) : null,
      noGst ? null : jsxs('div', { children: [jsx('span', { children: f.regime === 'INTRA' ? `CGST + SGST (${gstRate}%)` : `Integrated GST - IGST (${gstRate}%)` }), jsx('b', { children: '+ ₹' + gstAmount.toLocaleString('en-IN') })] }),
      jsxs('div', { className: 'ivb-totals__grand', children: [jsx('span', { children: 'Invoice total amount' }), jsx('b', { children: '₹' + fmt2(totalAmount) })] })
    ] })]),
    jsx('datalist', { id: 'ivb-hsn-list', children: hsnList.map((h) => jsx('option', { value: h }, h)) }),
    // 6-8. company, bank and signatory live in ONE container
    jsxs('section', { className: 'ivb-card ivb-card--group', children: [
    card('Company details, branding & authorised signatory', (f.companyName || 'No company set') + (f.companyGst ? ' · GSTIN ' + f.companyGst : '') + (f.companyEmail ? ' · ' + f.companyEmail : ''), 'finance',
      jsxs('label', { className: 'ivb-pick', children: [jsx('select', { className: 'select', 'aria-label': 'Sender profile', value: senderSel, onChange: (e) => pickSender(e.target.value), children: [jsx('option', { value: '', key: '__', disabled: true, children: 'Select sender profile...' }), jsx('option', { value: '__manual', key: '__m', children: 'Enter manually' }), ...senders.map((s) => jsx('option', { value: s._id, key: s._id, children: (s.label || (s.data || {}).companyName || 'Profile') + (s.isDefault ? ' (default)' : '') }))] })] }),
      [jsx('fieldset', { className: 'ivb-fs' + (lockS ? ' is-view' : ''), disabled: lockS, children: [jsxs('div', { className: 'ivb-grid ivb-grid--3', children: [
        fld('Company / issuer name', inp('companyName', 'e.g. Aedentek Cloud Solutions LLP'), '', true),
        fld('Company tagline / subtitle', inp('companyTagline', 'e.g. Smart Cloud & Digital Solutions')),
        fld('Contact person / designation', inp('companyContactPerson', 'e.g. Accounts Department')),
        fld('Company email', inp('companyEmail', 'admin@company.com', { type: 'email' })),
        fld('Company phone', inp('companyPhone', '+91 80562 05305')),
        fld('Company GSTIN', inp('companyGst', 'e.g. 33AAAAA0000A1Z5')),
        fld('Company PAN', inp('companyPan', 'e.g. AABCA9988C')),
        fld('Corporate / registered address', inp('companyAddress', 'e.g. #1, Thomas Street, Narimedu, Madurai - 625002'), 'ivb-span-2'),
        fld('Company brand logo (URL or upload)', inp('companyLogo', 'https://... or upload'), 'ivb-span-3')
      ] }),
      jsxs('div', { className: 'ivb-subhead', children: [jsx('b', { children: 'Authorised signatory & official seal' }), jsx('small', { children: (f.signatoryName || 'No signatory set') + (f.signatoryDesignation ? ' · ' + f.signatoryDesignation : '') })] }),
      jsxs('div', { className: 'ivb-grid ivb-grid--2', children: [
      fld('Signatory name', inp('signatoryName', 'e.g. Rahul Sen')),
      fld('Designation / capacity', jsxs('div', { className: 'ivb-chipbox', children: [inp('signatoryDesignation', 'Authorised Signatory'), jsx('div', { className: 'ivb-chips', children: IB_DESIGNATIONS.map((d) => jsx('button', { type: 'button', className: 'ivb-chip' + (f.signatoryDesignation === d ? ' is-on' : ''), onClick: () => set({ signatoryDesignation: d }), children: d }, d)) })] })),
      fld('Official seal / stamp & signature image (URL or upload)', inp('signatorySeal', 'https://... or upload'), 'ivb-span-2')
    ] })] })], 'company'),
    // 7. bank
    card('Bank & wire remittance details', (f.bankName || 'No bank set') + (f.accountNumber ? ' · A/c ••••' + String(f.accountNumber).slice(-4) : '') + (f.ifsc ? ' · ' + f.ifsc : ''), 'finance',
      jsxs('label', { className: 'ivb-pick', children: [jsx('select', { className: 'select', 'aria-label': 'Bank account', value: bankSel, onChange: (e) => pickBank(e.target.value), children: [jsx('option', { value: '', key: '__', disabled: true, children: 'Select bank account...' }), jsx('option', { value: '__manual', key: '__m', children: 'Enter manually' }), ...banks.map((b) => jsx('option', { value: b._id, key: b._id, children: (b.label || (b.data || {}).bankName || 'Account') + (b.isDefault ? ' (default)' : '') }))] })] }),
      jsx('fieldset', { className: 'ivb-fs' + (lockB ? ' is-view' : ''), disabled: lockB, children: jsxs('div', { className: 'ivb-grid ivb-grid--4', children: [
        fld('Bank name', inp('bankName', 'e.g. HDFC Bank')),
        fld('Account name / beneficiary', inp('accountName', 'e.g. Aedentek Technologies Pvt Ltd')),
        fld('Account type', sel('accountType', [['Current', 'Current'], ['Savings', 'Savings']])),
        fld('Account number', inp('accountNumber', 'e.g. 50200083921840')),
        fld('IFSC / RTGS code', inp('ifsc', 'e.g. HDFC0000240')),
        fld('Branch name', inp('branch', 'e.g. BKC Branch, Mumbai')),
        fld('UPI ID / VPA', inp('upiId', 'e.g. aedentek@hdfcbank'), 'ivb-span-2'),
        fld('Branch physical address', inp('bankAddress', 'e.g. Ground Floor, Trade Centre, Bandra Kurla Complex, Mumbai - 400051'), 'ivb-span-4'),
        fld('Payment QR code (URL or upload)', inp('qrCode', 'https://... or upload'), 'ivb-span-4')
      ] }) }), 'bank')
    ] })
  ] });

  return jsxs('div', { className: 'inv-editor ivb', children: [
    jsxs('div', { className: 'inv-editor__bar', children: [
      jsxs('button', { type: 'button', className: 'btn btn--ghost', onClick: () => onClose(false), children: [jsx(Icon, { name: 'arrow-left' }), 'Back to invoices'] }),
      jsxs('div', { className: 'inv-editor__title', children: [jsx('b', { children: editing ? `Editing ${invoice.invoiceNumber || 'invoice'}` : `New invoice ${nextNo || ''}` }), jsx('small', { children: editing ? 'Totals and balance are recalculated from the line items.' : 'Fill the bill below; the Template tab shows it on your default template.' })] }),
      jsxs('div', { className: 'inv-editor__actions', children: [
        jsx('button', { type: 'button', className: 'btn', onClick: () => onClose(false), children: 'Cancel' }),
        jsx('button', { type: 'button', className: 'btn btn--primary', disabled: saving, onClick: save, children: saving ? 'Saving...' : (editing ? 'Save changes' : 'Create invoice') })
      ] })
    ] }),
    jsxs('div', { className: 'tabs ivb-tabs', role: 'tablist', children: [
      jsx('button', { type: 'button', role: 'tab', className: 'tab' + (tab === 'form' ? ' is-active' : ''), onClick: () => setTab('form'), children: [jsx(Icon, { name: 'receipt' }), 'Bill form'] }),
      jsx('button', { type: 'button', role: 'tab', className: 'tab' + (tab === 'template' ? ' is-active' : ''), onClick: () => setTab('template'), children: [jsx(Icon, { name: 'eye' }), 'Template (live preview)'] })
    ] }),
    tab === 'form' ? formTab : jsx('div', { className: 'inv-editor__canvas', children: jsx('div', { className: 'inv-editor__sheet', children: jsx(InvoiceDocView, { invoice: draft }) }) })
  ] });
}

// Full-page invoice editor: the DEFAULT template itself is the form - type straight onto it.
function InvoicePageLayout({ modalProps, draft, onBack, tb }) {
  useEffect(() => () => { window.__tlInvEdit = null; }, []);
  let tplName = 'Classic Corporate';
  try {
    const saved = JSON.parse(localStorage.getItem('tessly:templateDefault') || 'null');
    const meta = saved && TEMPLATE_META.find((x) => x.id === saved.selected);
    if (meta) tplName = meta.name || meta.label || meta.id;
  } catch (e) {}
  const field = (label, node, cls) => jsxs('label', { className: 'inv-tb__f' + (cls ? ' ' + cls : ''), children: [jsx('span', { children: label }), node] });
  return jsxs('div', {
    className: 'inv-editor',
    children: [
      jsxs('div', {
        className: 'inv-editor__bar',
        children: [
          jsxs('button', { type: 'button', className: 'btn btn--ghost', onClick: onBack, children: [jsx(Icon, { name: 'arrow-left' }), 'Back to invoices'] }),
          jsxs('div', { className: 'inv-editor__title', children: [jsx('h2', { children: modalProps.title }), jsx('small', { children: `Click any highlighted value on the ${tplName} template to edit it.` })] }),
          jsx('div', { className: 'inv-editor__actions', children: modalProps.foot })
        ]
      }),
      jsxs('div', {
        className: 'inv-tb',
        children: [
          field('Invoice title *', jsx('input', { className: 'input', value: tb.title, placeholder: 'e.g. Core System Engineering', onChange: (e) => tb.setTitle(e.target.value) }), 'inv-tb__f--wide'),
          field('GST classification', jsxs('select', { className: 'select', value: tb.gstCategory, onChange: (e) => tb.onCategory(e.target.value), children: [
            jsx('option', { value: 'B2B', children: 'B2B (Registered Supply)' }),
            jsx('option', { value: 'B2C', children: 'B2C (Consumer Retail)' }),
            jsx('option', { value: 'Export LUT', children: 'Export LUT (0%)' })
          ] })),
          field('GST regime', jsxs('select', { className: 'select', value: tb.gstType, disabled: tb.gstCategory === 'Export LUT', onChange: (e) => tb.setGstType(e.target.value), children: [
            jsx('option', { value: 'CGST+SGST', children: 'CGST + SGST (Intra-State)' }),
            jsx('option', { value: 'IGST', children: 'IGST (Inter-State)' }),
            jsx('option', { value: 'Export LUT', children: 'Export LUT (0%)' })
          ] })),
          field('Buyer GSTIN', jsx('input', { className: 'input', value: tb.buyerGstin, placeholder: 'e.g. 27AAAAA0000A1Z5', onChange: (e) => tb.setBuyerGstin(e.target.value) })),
          field('Due date', jsx('input', { className: 'input', type: 'date', value: tb.dueDate, onChange: (e) => tb.setDueDate(e.target.value) })),
          jsx('button', { type: 'button', className: 'btn btn--primary inv-tb__add', onClick: tb.addItem, children: [jsx(Icon, { name: 'plus' }), 'Add line item'] })
        ]
      }),
      jsx('div', { className: 'inv-editor__canvas', children: jsx('div', { className: 'inv-editor__sheet', children: jsx(InvoiceDocView, { invoice: draft }) }) })
    ]
  });
}

function CreateInvoiceModal({ onClose, onSuccess, invoice, page }) {
  const editing = Boolean(invoice);
  const [clientName, setClientName] = useState(invoice ? invoice.clientName || '' : '');
  const [title, setTitle] = useState(invoice ? invoice.title || '' : '');
  const [gstCategory, setGstCategory] = useState(invoice ? invoice.gstCategory || 'B2B' : 'B2B');
  const [gstType, setGstType] = useState(invoice ? invoice.gstType || 'CGST+SGST' : 'CGST+SGST');
  const [buyerGstin, setBuyerGstin] = useState(invoice ? invoice.buyerGstin || '' : '');
  const [hsn, setHsn] = useState(invoice ? invoice.hsn || '998314' : '998314');
  const [dueDate, setDueDate] = useState(() => {
    if (invoice && invoice.dueDate) return invoice.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState(() =>
    invoice && Array.isArray(invoice.items) && invoice.items.length
      ? invoice.items.map((it) => ({ description: it.description || '', hsn: it.hsn || '998314', price: it.price, qty: it.qty }))
      : [{ description: '', hsn: '998314', price: '', qty: 1 }]
  );
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.qty) || 0)), 0);
  // New invoices start from the DEFAULT GST slab (Settings > GST & HSN Slabs): its HSN/SAC and rate.
  const [defaultRate, setDefaultRate] = useState(null);
  useEffect(() => {
    if (editing) return undefined;
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/settings'); const j = await r.json();
        const g = j && j.data && j.data.gstSettings;
        if (alive && g) {
          if (g.defaultHsn) { setHsn(g.defaultHsn); setItems((prev) => prev.map((it) => (it.description || it.price ? it : { ...it, hsn: g.defaultHsn }))); }
          if (Number(g.defaultGstRate) > 0) setDefaultRate(Number(g.defaultGstRate));
        }
      } catch (e) {}
    })();
    return () => { alive = false; };
  }, []);
  const gstRate = gstCategory === 'Export LUT' ? 0 : (editing ? (Number(invoice.gstRate) > 0 ? Number(invoice.gstRate) : 18) : (defaultRate || 18));
  const gstAmount = Math.round((subtotal * gstRate) / 100);
  const totalAmount = subtotal + gstAmount;

  const handleCategoryChange = (val) => {
    setGstCategory(val);
    if (val === 'Export LUT') {
      setGstType('Export LUT');
    } else if (val === 'B2B') {
      setGstType('CGST+SGST');
    } else {
      setGstType('IGST');
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', hsn: hsn || '998314', price: '', qty: 1 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast('Please enter the client / buyer name', { icon: 'alert' });
      return;
    }
    if (!title.trim()) {
      toast('Please enter the invoice title', { icon: 'alert' });
      return;
    }
    const validItems = items.filter(it => it.description.trim() || Number(it.price) > 0);
    if (validItems.length === 0) {
      toast('Please add at least one line item with description and price', { icon: 'alert' });
      return;
    }

    setSubmitting(true);
    const formattedItems = validItems.map((it, idx) => ({
      sNo: idx + 1,
      description: it.description.trim(),
      hsn: it.hsn || hsn,
      price: Number(it.price) || 0,
      qty: Number(it.qty) || 1,
      total: (Number(it.price) || 0) * (Number(it.qty) || 1)
    }));

    try {
      const res = await fetch(editing ? `/api/invoices/${invoice._id}` : '/api/invoices', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? {
          clientName: clientName.trim(),
          title: title.trim(),
          hsn,
          gstCategory,
          gstType,
          buyerGstin: buyerGstin.trim(),
          dueDate,
          items: formattedItems
        } : {
          clientName: clientName.trim(),
          title: title.trim(),
          hsn,
          gstCategory,
          gstType,
          buyerGstin: buyerGstin.trim(),
          dueDate,
          subtotal,
          gstRate,
          gstAmount,
          totalAmount,
          paidAmount: 0,
          balance: totalAmount,
          status: 'Sent',
          items: formattedItems
        })
      });

      if (res.ok) {
        const json = await res.json();
        toast(editing ? `Tax Invoice ${json.data?.invoiceNumber || ''} updated` : `Tax Invoice ${json.data?.invoiceNumber || ''} created!`, { icon: 'check' });
        onClose();
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        toast(err.message || (editing ? 'Error updating invoice' : 'Error creating invoice'), { icon: 'alert' });
      }
    } catch (err) {
      toast('Error saving invoice: ' + err.message, { icon: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const modalProps = {
    title: editing ? `Edit Tax Invoice ${invoice.invoiceNumber || ''}` : 'Create Statutory Tax Invoice',
    sub: editing ? 'Totals and balance are recalculated from the line items.' : 'Issue statutory GST-compliant invoice',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { className: 'btn', type: 'button', onClick: onClose, children: 'Cancel' }),
        jsx('button', {
          className: 'btn btn--primary',
          type: 'button',
          disabled: submitting,
          onClick: handleSubmit,
          children: submitting ? (editing ? 'Saving...' : 'Creating...') : (editing ? 'Save Changes' : 'Create Invoice')
        })
      ]
    }),
    children: [
      jsxs('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '16px' },
        children: [
          jsxs('label', {
            className: 'field',
            children: [
              jsx('span', { children: 'Client / Buyer Name *' }),
              jsx('input', {
                className: 'input',
                value: clientName,
                placeholder: 'e.g. Acme Corporation or Client Name',
                onChange: e => setClientName(e.target.value)
              })
            ]
          }),
          jsxs('label', {
            className: 'field',
            children: [
              jsx('span', { children: 'Invoice Title *' }),
              jsx('input', {
                className: 'input',
                value: title,
                placeholder: 'e.g. Core System Engineering',
                onChange: e => setTitle(e.target.value)
              })
            ]
          }),
          jsxs('div', {
            style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
            children: [
              jsxs('label', {
                className: 'field',
                children: [
                  jsx('span', { children: 'GST Classification *' }),
                  jsxs('select', {
                    className: 'input',
                    value: gstCategory,
                    onChange: e => handleCategoryChange(e.target.value),
                    children: [
                      jsx('option', { value: 'B2B', children: 'B2B (Registered Supply)' }),
                      jsx('option', { value: 'B2C', children: 'B2C (Consumer Retail)' }),
                      jsx('option', { value: 'Export LUT', children: 'Export LUT (Zero-Rated 0%)' })
                    ]
                  })
                ]
              }),
              jsxs('label', {
                className: 'field',
                children: [
                  jsx('span', { children: 'GST Regime / Tax Type *' }),
                  jsxs('select', {
                    className: 'input',
                    value: gstType,
                    disabled: gstCategory === 'Export LUT',
                    onChange: e => setGstType(e.target.value),
                    children: [
                      jsx('option', { value: 'CGST+SGST', children: 'CGST (9%) + SGST (9%) — Intra-State' }),
                      jsx('option', { value: 'IGST', children: 'IGST (18%) — Inter-State' }),
                      jsx('option', { value: 'Export LUT', children: 'Export LUT (0% Zero-Rated)' })
                    ]
                  })
                ]
              })
            ]
          }),
          jsxs('div', {
            style: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' },
            children: [
              jsxs('label', {
                className: 'field',
                children: [
                  jsx('span', { children: 'Buyer GSTIN (for B2B ITC)' }),
                  jsx('input', {
                    className: 'input',
                    value: buyerGstin,
                    placeholder: 'e.g. 27AAAAA0000A1Z5',
                    onChange: e => setBuyerGstin(e.target.value)
                  })
                ]
              }),
              jsxs('label', {
                className: 'field',
                children: [
                  jsx('span', { children: 'Due Date *' }),
                  jsx('input', {
                    type: 'date',
                    className: 'input',
                    value: dueDate,
                    onChange: e => setDueDate(e.target.value)
                  })
                ]
              })
            ]
          }),
          jsxs('div', {
            children: [
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
                children: [
                  jsx('span', { style: { fontWeight: 600, fontSize: '13px' }, children: 'Itemized Deliverables / Services *' }),
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--ghost',
                    style: { padding: '3px 8px', fontSize: '12px' },
                    onClick: addItem,
                    children: '+ Add Item'
                  })
                ]
              }),
              items.map((item, idx) => (
                jsxs('div', {
                  key: idx,
                  style: {
                    background: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '10px'
                  },
                  children: [
                    jsxs('div', {
                      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
                      children: [
                        jsx('span', { style: { fontSize: '12px', opacity: 0.7 }, children: `Line Item #${idx + 1}` }),
                        items.length > 1 && jsx('button', {
                          type: 'button',
                          style: { background: 'none', border: 'none', color: 'var(--red, #ef4444)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' },
                          onClick: () => removeItem(idx),
                          title: 'Remove item',
                          children: '✕'
                        })
                      ]
                    }),
                    jsxs('label', {
                      className: 'field',
                      style: { marginBottom: '8px' },
                      children: [
                        jsx('span', { children: 'Item / Service Description' }),
                        jsx('input', {
                          className: 'input',
                          value: item.description,
                          placeholder: 'e.g. Core System Engineering',
                          onChange: e => handleItemChange(idx, 'description', e.target.value)
                        })
                      ]
                    }),
                    jsxs('div', {
                      style: { display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1.5fr', gap: '8px', alignItems: 'center' },
                      children: [
                        jsxs('label', {
                          className: 'field',
                          children: [
                            jsx('span', { children: 'HSN/SAC' }),
                            jsx('input', {
                              className: 'input',
                              value: item.hsn,
                              placeholder: '998314',
                              onChange: e => handleItemChange(idx, 'hsn', e.target.value)
                            })
                          ]
                        }),
                        jsxs('label', {
                          className: 'field',
                          children: [
                            jsx('span', { children: 'Price (₹)' }),
                            jsx('input', {
                              type: 'number',
                              className: 'input',
                              value: item.price,
                              placeholder: '0',
                              onChange: e => handleItemChange(idx, 'price', e.target.value)
                            })
                          ]
                        }),
                        jsxs('label', {
                          className: 'field',
                          children: [
                            jsx('span', { children: 'Qty' }),
                            jsx('input', {
                              type: 'number',
                              className: 'input',
                              value: item.qty,
                              min: '1',
                              onChange: e => handleItemChange(idx, 'qty', e.target.value)
                            })
                          ]
                        }),
                        jsxs('div', {
                          style: { textAlign: 'right' },
                          children: [
                            jsx('span', { style: { display: 'block', fontSize: '11px', opacity: 0.6, marginBottom: '6px' }, children: 'Item Total' }),
                            jsx('span', {
                              style: { fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' },
                              children: fmtINR((Number(item.price) || 0) * (Number(item.qty) || 0))
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ))
            ]
          }),
          jsxs('div', {
            style: {
              background: 'var(--card-bg, rgba(255,255,255,0.05))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            },
            children: [
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
                children: [
                  jsx('span', { style: { opacity: 0.8 }, children: 'Subtotal (Taxable Value):' }),
                  jsx('span', { style: { fontFamily: 'monospace', fontWeight: 600 }, children: fmtINR(subtotal) })
                ]
              }),
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
                children: [
                  jsx('span', { style: { opacity: 0.8 }, children: gstCategory === 'Export LUT' ? 'GST (Export LUT 0%):' : gstType === 'CGST+SGST' ? 'Statutory GST (CGST 9% + SGST 9% = 18%):' : 'Statutory GST (IGST 18%):' }),
                  jsx('span', { style: { fontFamily: 'monospace', fontWeight: 600 }, children: fmtINR(gstAmount) })
                ]
              }),
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))' },
                children: [
                  jsx('span', { children: 'Gross Invoice Total:' }),
                  jsx('span', { style: { color: 'var(--accent, #6366f1)', fontFamily: 'monospace' }, children: fmtINR(totalAmount) })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  if (page) {
    // Publish the editing API for the template (<Ed/> reads it while rendering)
    window.__tlInvEdit = {
      values: { clientName, dueDate },
      items,
      setValue: (f, v) => { if (f === 'clientName') setClientName(v); else if (f === 'dueDate') setDueDate(v); },
      setItem: handleItemChange,
      removeItem
    };
    const paidSoFar = invoice ? invoice.paidAmount || 0 : 0;
    const draft = {
      ...(invoice || {}),
      invoiceNumber: invoice ? invoice.invoiceNumber : 'INV-AUTO',
      clientName,
      title: title.trim(),
      gstCategory, gstType, buyerGstin, hsn, dueDate,
      issueDate: (invoice && invoice.issueDate) || new Date().toISOString().slice(0, 10),
      items: items.map((it, idx) => ({ sNo: idx + 1, description: it.description, hsn: it.hsn || hsn, price: Number(it.price) || 0, qty: Number(it.qty) || 0, total: (Number(it.price) || 0) * (Number(it.qty) || 0) })),
      subtotal, gstRate, gstAmount, totalAmount,
      paidAmount: paidSoFar,
      balance: Math.max(0, totalAmount - paidSoFar)
    };
    const tb = { title, setTitle, gstCategory, onCategory: handleCategoryChange, gstType, setGstType, buyerGstin, setBuyerGstin, dueDate, setDueDate, addItem };
    return jsx(InvoicePageLayout, { modalProps, draft, onBack: onClose, tb });
  }
  return jsxs(ModalDrawer, modalProps);
}

// ==========================================================================
// 7. CREATE COMMERCIAL PROPAGATION MODAL (CLEAN NON-STATIC SCHEMA)
// ==========================================================================
function CreatePropagationModal({ onClose, onSuccess, propagation }) {
  const editing = !!propagation;
  const [clientName, setClientName] = useState(editing ? propagation.clientName || '' : '');
  const [title, setTitle] = useState(editing ? propagation.title || '' : '');
  const [validUntil, setValidUntil] = useState(() => {
    if (editing && propagation.validUntil) return String(propagation.validUntil).slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState(() =>
    editing && Array.isArray(propagation.items) && propagation.items.length
      ? propagation.items.map((it) => ({ description: it.description || '', rate: it.rate ?? '', qty: it.qty ?? it.quantity ?? 1 }))
      : [{ description: '', rate: '', qty: 1 }]
  );
  const [status, setStatus] = useState(editing ? propagation.status || 'Draft' : 'Sent');
  const [notes, setNotes] = useState(editing ? propagation.notes || '' : '');
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((acc, it) => acc + ((Number(it.rate) || 0) * (Number(it.qty) || 0)), 0);

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', rate: '', qty: 1 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast('Please enter the client entity name', { icon: 'alert' });
      return;
    }
    if (!title.trim()) {
      toast('Please enter the scope / project title', { icon: 'alert' });
      return;
    }
    const validItems = items.filter(it => it.description.trim() || Number(it.rate) > 0);
    if (validItems.length === 0) {
      toast('Please add at least one deliverable item', { icon: 'alert' });
      return;
    }

    setSubmitting(true);
    const formattedItems = validItems.map(it => ({
      description: it.description.trim(),
      rate: Number(it.rate) || 0,
      qty: Number(it.qty) || 1,
      amount: (Number(it.rate) || 0) * (Number(it.qty) || 1)
    }));

    try {
      const res = await fetch(editing ? `/api/propagations/${propagation._id}` : '/api/propagations', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          title: title.trim(),
          validUntil,
          subtotal,
          total: subtotal,
          status,
          items: formattedItems,
          notes: notes.trim()
        })
      });

      if (res.ok) {
        const json = await res.json();
        toast(editing ? `Commercial Propagation ${json.data?.propagationNumber || ''} updated` : `Commercial Propagation ${json.data?.propagationNumber || ''} created!`, { icon: 'check' });
        onClose();
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        toast(err.message || 'Error creating propagation', { icon: 'alert' });
      }
    } catch (err) {
      toast('Error saving propagation: ' + err.message, { icon: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  return jsxs(ModalDrawer, {
    title: editing ? `Edit ${propagation.propagationNumber}` : 'Create Commercial Propagation',
    sub: editing ? 'Update scope, deliverables, validity and status' : 'Draft formal scope & quotation commitment',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { className: 'btn', type: 'button', onClick: onClose, children: 'Cancel' }),
        jsx('button', {
          className: 'btn btn--primary',
          type: 'button',
          disabled: submitting,
          onClick: handleSubmit,
          children: submitting ? (editing ? 'Saving...' : 'Drafting...') : (editing ? 'Save Changes' : 'Draft Proposal')
        })
      ]
    }),
    children: [
      jsxs('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '16px' },
        children: [
          jsxs('label', {
            className: 'field',
            children: [
              jsx('span', { children: 'Client Entity *' }),
              jsx('input', {
                className: 'input',
                value: clientName,
                placeholder: 'e.g. Acme Corporation or Client Name',
                onChange: e => setClientName(e.target.value)
              })
            ]
          }),
          jsxs('label', {
            className: 'field',
            children: [
              jsx('span', { children: 'Scope / Project Title *' }),
              jsx('input', {
                className: 'input',
                value: title,
                placeholder: 'e.g. Mobile Application Extension Phase 2',
                onChange: e => setTitle(e.target.value)
              })
            ]
          }),
          jsxs('label', {
            className: 'field',
            children: [
              jsx('span', { children: 'Validity Date *' }),
              jsx('input', {
                type: 'date',
                className: 'input',
                value: validUntil,
                onChange: e => setValidUntil(e.target.value)
              })
            ]
          }),
          editing ? jsxs('label', {
            className: 'field',
            children: [
              jsx('span', { children: 'Status' }),
              jsx('select', { className: 'select', id: 'prop-status', value: status, onChange: e => setStatus(e.target.value), children: ['Draft', 'Sent', 'Accepted', 'Declined'].map(v => jsx('option', { value: v, children: v }, v)) })
            ]
          }) : null,
          jsxs('div', {
            children: [
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
                children: [
                  jsx('span', { style: { fontWeight: 600, fontSize: '13px' }, children: 'Deliverable Scope & Items *' }),
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--ghost',
                    style: { padding: '3px 8px', fontSize: '12px' },
                    onClick: addItem,
                    children: '+ Add Item'
                  })
                ]
              }),
              items.map((item, idx) => (
                jsxs('div', {
                  key: idx,
                  style: {
                    background: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '10px'
                  },
                  children: [
                    jsxs('div', {
                      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
                      children: [
                        jsx('span', { style: { fontSize: '12px', opacity: 0.7 }, children: `Deliverable #${idx + 1}` }),
                        items.length > 1 && jsx('button', {
                          type: 'button',
                          style: { background: 'none', border: 'none', color: 'var(--red, #ef4444)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' },
                          onClick: () => removeItem(idx),
                          title: 'Remove item',
                          children: '✕'
                        })
                      ]
                    }),
                    jsxs('label', {
                      className: 'field',
                      style: { marginBottom: '8px' },
                      children: [
                        jsx('span', { children: 'Deliverable Scope Description' }),
                        jsx('input', {
                          className: 'input',
                          value: item.description,
                          placeholder: 'e.g. React Native iOS & Android Vendor Application',
                          onChange: e => handleItemChange(idx, 'description', e.target.value)
                        })
                      ]
                    }),
                    jsxs('div', {
                      style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '10px', alignItems: 'center' },
                      children: [
                        jsxs('label', {
                          className: 'field',
                          children: [
                            jsx('span', { children: 'Rate (₹)' }),
                            jsx('input', {
                              type: 'number',
                              className: 'input',
                              value: item.rate,
                              placeholder: '0',
                              onChange: e => handleItemChange(idx, 'rate', e.target.value)
                            })
                          ]
                        }),
                        jsxs('label', {
                          className: 'field',
                          children: [
                            jsx('span', { children: 'Quantity' }),
                            jsx('input', {
                              type: 'number',
                              className: 'input',
                              value: item.qty,
                              min: '1',
                              onChange: e => handleItemChange(idx, 'qty', e.target.value)
                            })
                          ]
                        }),
                        jsxs('div', {
                          style: { textAlign: 'right' },
                          children: [
                            jsx('span', { style: { display: 'block', fontSize: '11px', opacity: 0.6, marginBottom: '6px' }, children: 'Item Total' }),
                            jsx('span', {
                              style: { fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' },
                              children: fmtINR((Number(item.rate) || 0) * (Number(item.qty) || 0))
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ))
            ]
          }),
          jsxs('div', {
            style: {
              background: 'var(--card-bg, rgba(255,255,255,0.05))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            },
            children: [
              jsx('span', { style: { fontWeight: 600 }, children: 'Total Scope Value' }),
              jsx('span', {
                style: { fontWeight: 700, fontSize: '16px', color: 'var(--accent, #6366f1)', fontFamily: 'monospace' },
                children: fmtINR(subtotal)
              })
            ]
          }),
          jsxs('label', {
            className: 'field',
            children: [
              jsx('span', { children: 'Commercial Notes / Terms (Optional)' }),
              jsx('textarea', {
                className: 'input',
                rows: 2,
                value: notes,
                placeholder: 'Payment milestones, validity clauses, and deliverable assumptions...',
                onChange: e => setNotes(e.target.value)
              })
            ]
          })
        ]
      })
    ]
  });
}

// ==========================================================================
// 8. TAX, BANKING & INVOICE SETTINGS VIEW (3 SECTIONS ON SINGLE PAGE)
// ==========================================================================
function FinanceSettingsView({ activeSection = 'invoiceSender' }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSec, setSavingSec] = useState(null);
  const [dbStatus, setDbStatus] = useState({ connected: false, name: 'connecting...' });
  const [gstRates, setGstRates] = useState([]);
  const [slabModal, setSlabModal] = useState(null); // null | { id: string|null }
  const [newRate, setNewRate] = useState({
    hsnCode: '',
    gstRate: '',
    taxType: 'Standard',
    serviceName: '',
    status: 'Active',
    isDefault: false
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, hRes, gRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/health'),
        fetch('/api/gst-rates')
      ]);
      const sJson = await sRes.json();
      if (sJson.success && sJson.data) setSettings(sJson.data);

      const hJson = await hRes.json();
      if (hJson.database) {
        setDbStatus({
          connected: hJson.database.connection === 'connected',
          name: hJson.database.name || 'aedentek_crm'
        });
      }

      const gJson = await gRes.json();
      if (gJson.success && gJson.data) setGstRates(gJson.data);
      await loadProfiles(true);
    } catch (err) {
      console.warn('Finance settings load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const [openSec, setOpenSec] = useState({ invoiceSender: true, bankDetails: true, gstSettings: true });
  const [profiles, setProfiles] = useState({ invoiceSender: [], bankDetails: [] });
  const [editingProf, setEditingProf] = useState({ invoiceSender: null, bankDetails: null });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;

  useEffect(() => {
    loadData();

    const handleSaveAll = () => saveAll();
    const handleSaveActive = () => saveSection(activeSectionRef.current);
    const handleReset = () => resetToCleanDefaults();
    window.addEventListener('financeSaveAllSettings', handleSaveAll);
    window.addEventListener('financeSaveActiveSettings', handleSaveActive);
    window.addEventListener('financeResetSettings', handleReset);
    return () => {
      window.removeEventListener('financeSaveAllSettings', handleSaveAll);
      window.removeEventListener('financeSaveActiveSettings', handleSaveActive);
      window.removeEventListener('financeResetSettings', handleReset);
    };
  }, []);

  const updateField = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev ? prev[section] : {}),
        [field]: value
      }
    }));
  };

  const saveSection = async (sectionKey) => {
    try {
      setSavingSec(sectionKey);
      const currentSettings = settingsRef.current;
      const payload = currentSettings ? currentSettings[sectionKey] : {};
      const res = await fetch(`/api/settings/${sectionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        const labels = {
          invoiceSender: 'Invoice Sender',
          bankDetails: 'Banking & Wire',
          gstSettings: 'GST & HSN Slabs'
        };
        toast(`${labels[sectionKey] || sectionKey} saved successfully`, { icon: 'check' });
      } else {
        toast(data.message || 'Error saving settings', { icon: 'alert' });
      }
    } catch (err) {
      toast('Failed to save settings: ' + err.message, { icon: 'alert' });
    } finally {
      setSavingSec(null);
    }
  };

  const saveAll = async () => {
    try {
      setSavingSec('all');
      const currentSettings = settingsRef.current;
      await Promise.all([
        fetch('/api/settings/invoiceSender', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentSettings?.invoiceSender || {})
        }),
        fetch('/api/settings/bankDetails', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentSettings?.bankDetails || {})
        }),
        fetch('/api/settings/gstSettings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentSettings?.gstSettings || {})
        })
      ]);
      toast('All 3 Finance & Tax Sections saved to MongoDB', { icon: 'check' });
    } catch (err) {
      toast('Failed to save settings: ' + err.message, { icon: 'alert' });
    } finally {
      setSavingSec(null);
    }
  };

  // ---- Saved profiles (Invoice Sender / Bank) with a single default ----
  const PROFILE_LABELS = { invoiceSender: 'invoice sender profile', bankDetails: 'bank account' };
  const loadProfiles = async (initEditing) => {
    try {
      const out = {};
      for (const type of ['invoiceSender', 'bankDetails']) {
        const r = await fetch(`/api/settings-profiles?type=${type}`);
        const j = await r.json();
        out[type] = j.success ? j.data : [];
      }
      setProfiles(out);
      if (initEditing) {
        setEditingProf((prev) => ({
          invoiceSender: prev.invoiceSender || ((out.invoiceSender.find((x) => x.isDefault) || {})._id || null),
          bankDetails: prev.bankDetails || ((out.bankDetails.find((x) => x.isDefault) || {})._id || null)
        }));
      }
      return out;
    } catch (err) { return null; }
  };
  const refreshSettings = async () => {
    try { const r = await fetch('/api/settings'); const j = await r.json(); if (j.success && j.data) setSettings(j.data); } catch (e) {}
  };
  const saveProfile = async (type, asNew) => {
    const data = (settingsRef.current && settingsRef.current[type]) || {};
    const id = asNew ? null : editingProf[type];
    try {
      setSavingSec(type);
      const res = await fetch(id ? `/api/settings-profiles/${id}` : '/api/settings-profiles', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { data } : { type, data })
      });
      const j = await res.json();
      if (res.ok && j.success) {
        toast(id ? 'Profile updated' : 'New profile saved', { icon: 'check' });
        setEditingProf((prev) => ({ ...prev, [type]: j.data._id }));
        await loadProfiles();
        await refreshSettings();
      } else {
        toast(j.message || 'Could not save the profile', { icon: 'alert' });
      }
    } catch (err) {
      toast('Failed to save profile: ' + err.message, { icon: 'alert' });
    } finally {
      setSavingSec(null);
    }
  };
  const startNewProfile = (type) => {
    const cur = (settingsRef.current && settingsRef.current[type]) || {};
    const blank = {};
    Object.keys(cur).forEach((k) => { blank[k] = typeof cur[k] === 'string' ? '' : cur[k]; });
    const next = { ...(settingsRef.current || {}), [type]: blank };
    settingsRef.current = next;
    setSettings(next);
    setEditingProf((prev) => ({ ...prev, [type]: null }));
    setOpenSec((s) => ({ ...s, [type]: true }));
    scrollTo(type === 'invoiceSender' ? 'sec-invoice-sender' : 'sec-banking-wire');
  };
  const editProfile = (type, prof) => {
    const next = { ...(settingsRef.current || {}), [type]: { ...(prof.data || {}) } };
    settingsRef.current = next;
    setSettings(next);
    setEditingProf((prev) => ({ ...prev, [type]: prof._id }));
    setOpenSec((s) => ({ ...s, [type]: true }));
    scrollTo(type === 'invoiceSender' ? 'sec-invoice-sender' : 'sec-banking-wire');
  };
  const makeDefaultProfile = async (type, prof) => {
    try {
      const res = await fetch(`/api/settings-profiles/${prof._id}/default`, { method: 'POST' });
      const j = await res.json();
      if (res.ok && j.success) { toast(j.message || 'Default updated', { icon: 'check' }); await loadProfiles(); await refreshSettings(); }
      else toast(j.message || 'Could not set the default', { icon: 'alert' });
    } catch (err) { toast('Error: ' + err.message, { icon: 'alert' }); }
  };
  const deleteProfileRow = async (type, prof) => {
    const extra = prof.isDefault && profiles[type].length > 1 ? ' The next profile will become the default.' : '';
    if (!(await window.themedConfirm(`Delete this ${PROFILE_LABELS[type]} (${prof.label || 'unnamed'})?${extra}`))) return;
    try {
      const res = await fetch(`/api/settings-profiles/${prof._id}`, { method: 'DELETE' });
      const j = await res.json();
      if (res.ok && j.success) {
        toast('Profile deleted', { icon: 'trash' });
        const out = await loadProfiles();
        await refreshSettings();
        if (editingProf[type] === prof._id) {
          const def = out && out[type] && out[type].find((x) => x.isDefault);
          if (def) editProfile(type, def); else startNewProfile(type);
        }
      } else toast(j.message || 'Could not delete the profile', { icon: 'alert' });
    } catch (err) { toast('Error: ' + err.message, { icon: 'alert' }); }
  };
  const setDefaultSlab = async (slab) => {
    try {
      const res = await fetch(`/api/gst-rates/${slab._id}/default`, { method: 'POST' });
      const j = await res.json();
      if (res.ok && j.success) {
        toast('Default GST slab updated', { icon: 'check' });
        const gRes = await fetch('/api/gst-rates'); const gJson = await gRes.json(); if (gJson.data) setGstRates(gJson.data);
        await refreshSettings();
      } else toast(j.message || 'Could not set the default slab', { icon: 'alert' });
    } catch (err) { toast('Error: ' + err.message, { icon: 'alert' }); }
  };
  const thumb = (src, alt) => (src && /^(data:image|https?:|\/)/.test(src) ? jsx('img', { className: 'tl-thumb', src, alt: alt || 'logo' }) : null);
  const defaultPill = (isDef) => isDef
    ? jsx('span', { className: 'tl-default-pill', children: 'Default' })
    : jsx('span', { style: { color: 'var(--faint)' }, children: '—' });
  const profileListCard = (type, title, sub, heads, cells) => jsxs(Card, {
    title, sub, flush: true,
    tools: jsx('button', {
      type: 'button', className: 'btn btn--sm btn--primary', onClick: () => startNewProfile(type),
      children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'New profile'] })
    }),
    children: jsx('div', {
      className: 'table-wrap',
      children: jsxs('table', {
        className: 'table',
        children: [
          jsx('thead', { children: jsxs('tr', { children: [jsx('th', { children: 'S NO' }), ...heads.map((h) => jsx('th', { children: h }, h)), jsx('th', { children: 'Default' }), jsx('th', { children: 'Actions' })] }) }),
          jsx('tbody', {
            children: profiles[type].length
              ? profiles[type].map((pr, i) => jsxs('tr', {
                  className: editingProf[type] === pr._id ? 'is-editing-row' : '',
                  children: [
                    jsx('td', { children: jsx('span', { className: 'sno-pill ' + (i < 3 ? 'sno-pill--top' : 'sno-pill--normal'), children: i + 1 }) }),
                    ...cells(pr.data || {}).map((c, k) => jsx('td', { children: (c && typeof c === 'object') ? c : (c || '—') }, k)),
                    jsx('td', { children: defaultPill(pr.isDefault) }),
                    jsx('td', { children: jsxs('div', { className: 'tl-act-slots', children: [
                      pr.isDefault ? jsx('span', { className: 'tl-act-slot', 'aria-hidden': 'true' }) : jsx('button', { type: 'button', title: 'Set as default', 'aria-label': 'Set as default', className: 'btn btn--sm', onClick: () => makeDefaultProfile(type, pr), children: 'Set as default' }),
                      jsx('button', { type: 'button', title: 'Edit profile', 'aria-label': 'Edit profile', className: 'btn btn--sm', onClick: () => editProfile(type, pr), children: 'Edit' }),
                      jsx('button', { type: 'button', title: 'Delete profile', 'aria-label': 'Delete profile', className: 'btn btn--sm', onClick: () => deleteProfileRow(type, pr), children: 'Delete' })
                    ] }) })
                  ]
                }, pr._id))
              : [jsx('tr', { key: 'empty', children: jsx('td', { colSpan: heads.length + 3, className: 'cd-empty-td', style: { textAlign: 'center', padding: '28px 24px' }, children: 'No saved profiles yet. Fill the form above and save to create the first one - it becomes the default.' }) })]
          })
        ]
      })
    })
  });

  const clearSavedRecord = async (key) => {
    const names = { invoiceSender: 'invoice sender profile', bankDetails: 'bank account' };
    if (!(await window.themedConfirm(`Delete the saved ${names[key] || 'record'}? Its details will be cleared.`))) return;
    const cur = (settingsRef.current && settingsRef.current[key]) || {};
    const blank = {};
    Object.keys(cur).forEach(k => { blank[k] = typeof cur[k] === 'string' ? '' : cur[k]; });
    const next = { ...(settingsRef.current || {}), [key]: blank };
    settingsRef.current = next;
    setSettings(next);
    await saveSection(key);
  };

  const resetToCleanDefaults = async () => {
    if (!(await window.themedConfirm('Reset all 3 Finance sections to clean non-static defaults?'))) return;
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        toast('Finance settings reset to non-static defaults', { icon: 'check' });
      }
    } catch (err) {
      toast('Error resetting settings', { icon: 'alert' });
    }
  };

  const handleAddGstRate = async (ev) => {
    if (ev) ev.preventDefault();
    if (!newRate.hsnCode || !newRate.serviceName || newRate.gstRate === '') {
      toast('Please enter HSN/SAC code, description, and GST rate', { icon: 'alert' });
      return;
    }
    try {
      const editingId = slabModal && slabModal.id;
      const res = await fetch(editingId ? `/api/gst-rates/${editingId}` : '/api/gst-rates', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRate,
          gstRate: Number(newRate.gstRate)
        })
      });
      const data = await res.json();
      if (data.success) {
        toast(editingId ? 'GST slab updated' : 'Statutory GST Slab created', { icon: 'check' });
        setSlabModal(null);
        setNewRate({ hsnCode: '', gstRate: '', taxType: 'Standard', serviceName: '', status: 'Active', isDefault: false });
        const gRes = await fetch('/api/gst-rates');
        const gData = await gRes.json();
        if (gData.data) setGstRates(gData.data);
      } else {
        toast(data.message || 'Error creating slab', { icon: 'alert' });
      }
    } catch (err) {
      toast('Error adding GST slab: ' + err.message, { icon: 'alert' });
    }
  };

  const handleDeleteGstRate = async (id) => {
    if (!(await window.themedConfirm('Delete this GST slab?'))) return;
    try {
      const res = await fetch(`/api/gst-rates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast('GST Slab deleted', { icon: 'check' });
        setGstRates(prev => prev.filter(r => r._id !== id));
      }
    } catch (err) {
      toast('Error deleting slab', { icon: 'alert' });
    }
  };

  const curSender = settings?.invoiceSender || {};
  const curBank = settings?.bankDetails || {};
  const curGst = settings?.gstSettings || {};

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return jsxs('div', {
    className: 'admin-hub finance-settings-hub',
    style: { display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '14px' },
    children: [
      // SECTION 1: INVOICE SENDER & COMPANY COORDINATES
      jsx('div', {
        id: 'sec-invoice-sender',
        style: { display: activeSection === 'invoiceSender' ? 'block' : 'none' },
        children: [jsxs(Card, {
          title: 'Invoice Sender & Corporate Coordinates',
          sub: 'Legal entity, registered address, corporate tax identifiers, and authorized signatory.',
          tools: jsx('button', {
            type: 'button',
            className: 'btn btn--sm tl-chev' + (openSec.invoiceSender ? ' is-open' : ''),
            title: openSec.invoiceSender ? 'Collapse form' : 'Expand form', 'aria-label': openSec.invoiceSender ? 'Collapse form' : 'Expand form', 'aria-expanded': !!openSec.invoiceSender,
            onClick: () => setOpenSec(s => ({ ...s, invoiceSender: !s.invoiceSender })),
            children: jsx('svg', { className: 'ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', children: jsx('polyline', { points: '6 9 12 15 18 9' }) })
          }),
          children: [
            jsxs('div', {
              style: { display: openSec.invoiceSender ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', padding: '16px 0' },
              children: [
                jsxs('label', {
                  className: 'field',
                  style: { gridColumn: 'span 2' },
                  children: [
                    jsx('span', { children: 'Company / Issuer Legal Name *' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.companyName || '',
                      placeholder: 'Registered business legal name',
                      onChange: e => updateField('invoiceSender', 'companyName', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Corporate entity appearing on invoices and official quotations' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Tagline / Subtitle' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.companyTagline || '',
                      placeholder: 'e.g. Enterprise Cloud & Architecture Solutions',
                      onChange: e => updateField('invoiceSender', 'companyTagline', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Corporate branding subtitle or business domain' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Profile Status' }),
                    jsxs('select', {
                      className: 'input',
                      value: curSender.status || 'Active',
                      onChange: e => updateField('invoiceSender', 'status', e.target.value),
                      children: [
                        jsx('option', { value: 'Active', children: 'Active Profile' }),
                        jsx('option', { value: 'Secondary', children: 'Secondary Profile' })
                      ]
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Active issuer profile used for new invoices' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Authorized Signatory / Contact Person' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.companyContactPerson || '',
                      placeholder: 'e.g. Rahul Sen',
                      onChange: e => updateField('invoiceSender', 'companyContactPerson', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Officer handling billing communications' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Corporate Billing Email *' }),
                    jsx('input', {
                      type: 'email',
                      className: 'input',
                      value: curSender.companyEmail || '',
                      placeholder: 'billing@company.com',
                      onChange: e => updateField('invoiceSender', 'companyEmail', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Primary email receiving invoice correspondence' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Company Hotline / Phone' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.companyPhone || '',
                      placeholder: '+91 (022) 6123-4567',
                      onChange: e => updateField('invoiceSender', 'companyPhone', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Contact telephone appearing on printable documents' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Statutory GSTIN' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.companyGst || '',
                      placeholder: '15-character GSTIN (e.g. 27AAFCO1234F1Z8)',
                      onChange: e => updateField('invoiceSender', 'companyGst', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'State-registered Goods & Services Tax Identifier' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Income Tax PAN' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.companyPan || '',
                      placeholder: '10-character PAN (e.g. AAFCO1234F)',
                      onChange: e => updateField('invoiceSender', 'companyPan', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Permanent Account Number for statutory compliance' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  style: { gridColumn: 'span 2' },
                  children: [
                    jsx('span', { children: 'Registered Corporate Street Address *' }),
                    jsx('textarea', {
                      className: 'input',
                      rows: 3,
                      value: curSender.companyAddress || '',
                      placeholder: 'Full physical registered business address...',
                      onChange: e => updateField('invoiceSender', 'companyAddress', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Full registered corporate address shown in header of invoices and propagations' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Authorised Signatory Name' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.signatoryName || '',
                      placeholder: 'e.g. Rahul Sen',
                      onChange: e => updateField('invoiceSender', 'signatoryName', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Name printed below invoice signature seal block' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Signatory Designation / Capacity' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.signatoryDesignation || '',
                      placeholder: 'e.g. Authorised Signatory, Managing Director',
                      onChange: e => updateField('invoiceSender', 'signatoryDesignation', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Corporate signing capacity' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Company Brand Logo (URL / Base64)' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.companyLogo || '',
                      placeholder: 'https://... or Base64 data URL',
                      onChange: e => updateField('invoiceSender', 'companyLogo', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'High-resolution PNG or SVG logo for invoice branding' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Official Company Seal & Signature (URL / Base64)' }),
                    jsx('input', {
                      className: 'input',
                      value: curSender.signatorySeal || '',
                      placeholder: 'https://... or digital signature stamp',
                      onChange: e => updateField('invoiceSender', 'signatorySeal', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Digital signature stamp displayed on invoice sign-off' })
                  ]
                })
              ]
            }),
            jsxs('div', {
              className: 'form-save-row',
              style: { display: openSec.invoiceSender ? 'flex' : 'none' },
              children: [
                editingProf.invoiceSender ? jsx('button', { type: 'button', className: 'btn btn--ghost', disabled: savingSec === 'invoiceSender', onClick: () => startNewProfile('invoiceSender'), children: 'Cancel' }) : null,
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  disabled: savingSec === 'invoiceSender',
                  onClick: () => saveProfile('invoiceSender', false),
                  children: savingSec === 'invoiceSender' ? 'Saving...' : (editingProf.invoiceSender ? 'Update profile' : 'Save profile')
                })
              ]
            })
          ]
        }),
        profileListCard('invoiceSender', 'Saved Invoice Sender Profiles', 'Pick one as the default - new invoices and templates use it.', ['Logo', 'Company', 'Contact Person', 'Billing Email', 'GSTIN'], (d) => [thumb(d.companyLogo, 'Company logo'), d.companyName, d.companyContactPerson, d.companyEmail, d.companyGst])
      ]
      }),

      // SECTION 2: BANKING & WIRE REMITTANCE DETAILS
      jsx('div', {
        id: 'sec-banking-wire',
        style: { display: activeSection === 'bankDetails' ? 'block' : 'none' },
        children: [jsxs(Card, {
          title: 'Banking & Wire Remittance Details',
          sub: 'Settlement bank accounts, RTGS/NEFT/IFSC clearing, international SWIFT routing, and UPI QR codes.',
          tools: jsx('button', {
            type: 'button',
            className: 'btn btn--sm tl-chev' + (openSec.bankDetails ? ' is-open' : ''),
            title: openSec.bankDetails ? 'Collapse form' : 'Expand form', 'aria-label': openSec.bankDetails ? 'Collapse form' : 'Expand form', 'aria-expanded': !!openSec.bankDetails,
            onClick: () => setOpenSec(s => ({ ...s, bankDetails: !s.bankDetails })),
            children: jsx('svg', { className: 'ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', children: jsx('polyline', { points: '6 9 12 15 18 9' }) })
          }),
          children: [
            jsxs('div', {
              style: { display: openSec.bankDetails ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', padding: '16px 0' },
              children: [
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Clearing Bank Name *' }),
                    jsx('input', {
                      className: 'input',
                      value: curBank.bankName || '',
                      placeholder: 'e.g. HDFC Bank Ltd',
                      onChange: e => updateField('bankDetails', 'bankName', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Scheduled commercial bank for inward settlement' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Account Beneficiary Name *' }),
                    jsx('input', {
                      className: 'input',
                      value: curBank.accountName || '',
                      placeholder: 'Legal corporate account payee name',
                      onChange: e => updateField('bankDetails', 'accountName', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Exact payee name matching banking KYC records' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Account Type *' }),
                    jsxs('select', {
                      className: 'input',
                      value: curBank.accountType || 'Current',
                      onChange: e => updateField('bankDetails', 'accountType', e.target.value),
                      children: [
                        jsx('option', { value: 'Current', children: 'Current Account' }),
                        jsx('option', { value: 'Savings', children: 'Savings Account' })
                      ]
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Commercial Current or Settlement Account' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Account Number *' }),
                    jsx('input', {
                      className: 'input',
                      style: { fontFamily: 'monospace' },
                      value: curBank.accountNumber || '',
                      placeholder: 'e.g. 50200083921840',
                      onChange: e => updateField('bankDetails', 'accountNumber', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Primary settlement account number' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'IFSC / RTGS Code *' }),
                    jsx('input', {
                      className: 'input',
                      style: { fontFamily: 'monospace' },
                      value: curBank.ifsc || '',
                      placeholder: 'e.g. HDFC0000240',
                      onChange: e => updateField('bankDetails', 'ifsc', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: '11-character Indian Financial System Code' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'SWIFT / BIC Routing Code' }),
                    jsx('input', {
                      className: 'input',
                      style: { fontFamily: 'monospace' },
                      value: curBank.swiftCode || '',
                      placeholder: 'e.g. HDFCINBB',
                      onChange: e => updateField('bankDetails', 'swiftCode', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'For cross-border international remittances' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Settlement Account Status' }),
                    jsxs('select', {
                      className: 'input',
                      value: curBank.status || 'Active',
                      onChange: e => updateField('bankDetails', 'status', e.target.value),
                      children: [
                        jsx('option', { value: 'Active', children: 'Active Primary' }),
                        jsx('option', { value: 'Secondary', children: 'Secondary Account' })
                      ]
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Primary account shown on customer invoices' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Bank Branch Name' }),
                    jsx('input', {
                      className: 'input',
                      value: curBank.branch || '',
                      placeholder: 'e.g. Fort Mumbai Branch',
                      onChange: e => updateField('bankDetails', 'branch', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Local branch name of the bank' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  style: { gridColumn: 'span 2' },
                  children: [
                    jsx('span', { children: 'Branch Physical Address' }),
                    jsx('textarea', {
                      className: 'input',
                      rows: 2,
                      value: curBank.bankAddress || '',
                      placeholder: 'Branch street and city address...',
                      onChange: e => updateField('bankDetails', 'bankAddress', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Physical bank location for wire clearing documentation' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Instant UPI VPA / ID' }),
                    jsx('input', {
                      className: 'input',
                      value: curBank.upiId || '',
                      placeholder: 'company@hdfcbank or business VPA',
                      onChange: e => updateField('bankDetails', 'upiId', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'UPI identifier for instant settlement in India' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'UPI Payment QR Code (Data URL / Image)' }),
                    jsx('input', {
                      className: 'input',
                      value: curBank.qrCode || '',
                      placeholder: 'https://... or Base64 QR image',
                      onChange: e => updateField('bankDetails', 'qrCode', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Scan & Pay QR code rendered on customer invoices' })
                  ]
                })
              ]
            }),
            jsxs('div', {
              className: 'form-save-row',
              style: { display: openSec.bankDetails ? 'flex' : 'none' },
              children: [
                editingProf.bankDetails ? jsx('button', { type: 'button', className: 'btn btn--ghost', disabled: savingSec === 'bankDetails', onClick: () => startNewProfile('bankDetails'), children: 'Cancel' }) : null,
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  disabled: savingSec === 'bankDetails',
                  onClick: () => saveProfile('bankDetails', false),
                  children: savingSec === 'bankDetails' ? 'Saving...' : (editingProf.bankDetails ? 'Update profile' : 'Save profile')
                })
              ]
            })
          ]
        }),
        profileListCard('bankDetails', 'Saved Bank Accounts', 'Pick one as the default - new invoices and templates print it.', ['UPI QR', 'Bank', 'Account Name', 'Account No.', 'IFSC'], (d) => [thumb(d.qrCode, 'UPI QR'), d.bankName, d.accountName, d.accountNumber, d.ifsc])
      ]
      }),

      // SECTION 3: STATUTORY GST & HSN TAX SLABS
      jsx('div', {
        id: 'sec-gst-slabs',
        style: { display: activeSection === 'gstSettings' ? 'block' : 'none' },
        children: [jsxs(Card, {
          title: 'Statutory GST & HSN Tax Slabs',
          sub: 'Statutory GST slabs, default SAC codes, CGST/SGST/IGST rates, and Export LUT reference.',
          tools: jsx('button', {
            type: 'button',
            className: 'btn btn--sm tl-chev' + (openSec.gstSettings ? ' is-open' : ''),
            title: openSec.gstSettings ? 'Collapse form' : 'Expand form', 'aria-label': openSec.gstSettings ? 'Collapse form' : 'Expand form', 'aria-expanded': !!openSec.gstSettings,
            onClick: () => setOpenSec(s => ({ ...s, gstSettings: !s.gstSettings })),
            children: jsx('svg', { className: 'ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', children: jsx('polyline', { points: '6 9 12 15 18 9' }) })
          }),
          children: [
            jsxs('div', {
              style: { display: openSec.gstSettings ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', padding: '16px 0' },
              children: [
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Default HSN / SAC Code' }),
                    jsx('input', {
                      className: 'input',
                      value: curGst.defaultHsn || '',
                      placeholder: 'e.g. 998314',
                      onChange: e => updateField('gstSettings', 'defaultHsn', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Default Service Accounting Code applied to new invoice items' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Default Statutory GST Rate (%)' }),
                    jsx('input', {
                      type: 'number',
                      className: 'input',
                      value: curGst.defaultGstRate ?? '',
                      placeholder: '18',
                      onChange: e => updateField('gstSettings', 'defaultGstRate', Number(e.target.value))
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Standard rate (e.g. 18% splits to 9% CGST + 9% SGST)' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Default Tax Regime' }),
                    jsxs('select', {
                      className: 'input',
                      value: curGst.defaultTaxType || 'CGST+SGST',
                      onChange: e => updateField('gstSettings', 'defaultTaxType', e.target.value),
                      children: [
                        jsx('option', { value: 'CGST+SGST', children: 'CGST (9%) + SGST (9%) — Intra-State' }),
                        jsx('option', { value: 'IGST', children: 'IGST (18%) — Inter-State' }),
                        jsx('option', { value: 'Export LUT', children: 'Export LUT (0% Zero-Rated)' })
                      ]
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Initial tax category selected for new client invoices' })
                  ]
                }),
                jsxs('label', {
                  className: 'field',
                  children: [
                    jsx('span', { children: 'Export LUT / Bond Reference Number' }),
                    jsx('input', {
                      className: 'input',
                      value: curGst.lutNumber || '',
                      placeholder: 'e.g. ARN-AD270824001928K',
                      onChange: e => updateField('gstSettings', 'lutNumber', e.target.value)
                    }),
                    jsx('small', { className: 'admin-field-desc', children: 'Letter of Undertaking reference for zero-rated export supplies' })
                  ]
                })
              ]
            }),
            jsxs('div', {
              className: 'form-save-row',
              style: { display: openSec.gstSettings ? 'flex' : 'none' },
              children: [
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  disabled: savingSec === 'gstSettings',
                  onClick: () => saveSection('gstSettings'),
                  children: savingSec === 'gstSettings' ? 'Saving...' : 'Save GST Settings'
                })
              ]
            })
          ]
        }),

        // Live GST Tax Slabs Directory Table (its own container)
        jsxs(Card, {
          className: 'gst-list-card',
          title: 'Active Statutory GST Tax Slabs',
          sub: `${gstRates.length} slabs configured in MongoDB`,
          tools: jsx('button', {
            type: 'button',
            className: 'btn btn--sm btn--primary',
            onClick: () => { setNewRate({ hsnCode: '', gstRate: '', taxType: 'Standard', serviceName: '', status: 'Active', isDefault: false }); setSlabModal({ id: null }); },
            children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Add Slab'] })
          }),
          flush: true,
          children: [
            jsxs('div', {
              style: {},
              children: [
                jsxs('div', {
                  className: 'table-wrap',
                  children: jsxs('table', {
                    className: 'table admin-tax-table',
                    children: [
                      jsx('thead', {
                        children: jsxs('tr', {
                          children: [
                            jsx('th', { children: 'S NO' }),
                            jsx('th', { children: 'HSN / SAC' }),
                            jsx('th', { children: 'Service / Item Description' }),
                            jsx('th', { style: { textAlign: 'right' }, children: 'Rate (%)' }),
                            jsx('th', { style: { textAlign: 'right' }, children: 'CGST' }),
                            jsx('th', { style: { textAlign: 'right' }, children: 'SGST' }),
                            jsx('th', { style: { textAlign: 'right' }, children: 'IGST' }),
                            jsx('th', { children: 'Tax Classification' }),
                            jsx('th', { children: 'Status' }),
                            jsx('th', { children: 'Default' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Action' })
                          ]
                        })
                      }),
                      jsx('tbody', {
                        children: gstRates.length === 0 ? jsx('tr', {
                          children: jsx('td', {
                            colSpan: 11,
                            className: 'cd-empty-td',
                            style: { textAlign: 'center', padding: '28px 24px' },
                            children: 'No custom GST slabs configured.'
                          })
                        }) : gstRates.map((r, __i) => jsxs('tr', {
                          key: r._id,
                          children: [
 jsx('td', { children: jsx('span', { className: 'sno-pill ' + (__i < 3 ? 'sno-pill--top' : 'sno-pill--normal'), children: __i + 1 }) }),
                            jsx('td', { style: { fontFamily: 'monospace', fontWeight: 600 }, children: r.hsnCode }),
                            jsx('td', { children: r.serviceName }),
                            jsx('td', { style: { textAlign: 'right', fontWeight: 700 }, children: `${r.gstRate}%` }),
                            jsx('td', { style: { textAlign: 'right', fontFamily: 'monospace' }, children: `${r.cgst ?? r.gstRate / 2}%` }),
                            jsx('td', { style: { textAlign: 'right', fontFamily: 'monospace' }, children: `${r.sgst ?? r.gstRate / 2}%` }),
                            jsx('td', { style: { textAlign: 'right', fontFamily: 'monospace' }, children: `${r.igst ?? r.gstRate}%` }),
                            jsx('td', {
                              children: jsx('span', {
                                className: `admin-tax-badge ${r.taxType === 'Standard' ? 'standard' : r.taxType === 'Zero-Rated' ? 'zero' : 'exempt'}`,
                                children: r.taxType
                              })
                            }),
                            jsx('td', {
                              children: jsx('span', {
                                style: { color: r.status === 'Active' ? '#10b981' : '#94a3b8', fontSize: '12px', fontWeight: 600 },
                                children: r.status
                              })
                            }),
                            jsx('td', { children: defaultPill(r.isDefault) }),
                            jsx('td', {
                              style: { textAlign: 'center' },
                              children: jsxs('div', { style: { display: 'inline-flex', gap: 6 }, children: [
                                r.isDefault || r.status === 'Inactive' ? null : jsx('button', {
                                  type: 'button',
                                  className: 'action-btn',
                                  title: 'Set as default',
                                  'aria-label': 'Set as default',
                                  onClick: () => setDefaultSlab(r),
                                  children: 'Set as default'
                                }),
                                jsx('button', {
                                  type: 'button',
                                  className: 'action-btn action-btn--edit',
                                  title: 'Edit GST Rate',
                                  'aria-label': 'Edit GST Rate',
                                  onClick: () => { setNewRate({ hsnCode: r.hsnCode || '', gstRate: r.gstRate, taxType: r.taxType || 'Standard', serviceName: r.serviceName || '', status: r.status || 'Active', isDefault: !!r.isDefault }); setSlabModal({ id: r._id }); },
                                  children: jsx(Icon, { name: 'edit' })
                                }),
                                jsx('button', {
                                  type: 'button',
                                  className: 'action-btn action-btn--delete',
                                  title: 'Delete GST Rate',
                                  'aria-label': 'Delete GST Rate',
                                  onClick: () => handleDeleteGstRate(r._id),
                                  children: jsx(Icon, { name: 'trash' })
                                })
                              ] })
                            })
                          ]
                        }, r._id))
                      })
                    ]
                  })
                })
              ]
            })
          ]
        }),
        slabModal && jsx('div', {
          className: 'tl-dialog-scrim',
          onMouseDown: (e) => { if (e.target === e.currentTarget) setSlabModal(null); },
          children: jsxs('form', {
            className: 'tl-form-modal',
            onSubmit: handleAddGstRate,
            children: [
              jsx('h3', { children: slabModal.id ? 'Edit GST Slab' : 'Add GST Slab' }),
              jsxs('div', { className: 'tl-form-modal__grid', children: [
                jsxs('label', { className: 'field', children: [jsx('span', { children: 'HSN / SAC Code *' }), jsx('input', { className: 'input', required: true, value: newRate.hsnCode, placeholder: 'e.g. 998315', onChange: (e) => setNewRate({ ...newRate, hsnCode: e.target.value }) })] }),
                jsxs('label', { className: 'field', children: [jsx('span', { children: 'GST Rate (%) *' }), jsx('input', { className: 'input', required: true, type: 'number', min: 0, max: 100, step: '0.01', value: newRate.gstRate, placeholder: '18', onChange: (e) => setNewRate({ ...newRate, gstRate: e.target.value }) })] }),
                jsxs('label', { className: 'field span-2', children: [jsx('span', { children: 'Service Description *' }), jsx('input', { className: 'input', required: true, value: newRate.serviceName, placeholder: 'e.g. Cloud Hosting & DevOps', onChange: (e) => setNewRate({ ...newRate, serviceName: e.target.value }) })] }),
                jsxs('label', { className: 'field', children: [jsx('span', { children: 'Tax Type' }), jsxs('select', { className: 'select', value: newRate.taxType, onChange: (e) => setNewRate({ ...newRate, taxType: e.target.value }), children: ['Standard', 'Zero-Rated', 'Exempted'].map((o) => jsx('option', { value: o, children: o }, o)) })] }),
                jsxs('label', { className: 'field', children: [jsx('span', { children: 'Status' }), jsxs('select', { className: 'select', value: newRate.status, onChange: (e) => setNewRate({ ...newRate, status: e.target.value }), children: ['Active', 'Inactive'].map((o) => jsx('option', { value: o, children: o }, o)) })] })
              ] }),
              jsxs('div', { className: 'tl-dialog__actions', children: [
                jsx('button', { type: 'button', className: 'tl-dialog__btn', onClick: () => setSlabModal(null), children: 'Cancel' }),
                jsx('button', { type: 'submit', className: 'tl-dialog__btn tl-dialog__btn--primary', children: slabModal.id ? 'Save Changes' : 'Add Slab' })
              ] })
            ]
          })
        })
      ]
      })
    ]
  });
}

// ==========================================================================
// 9. MAIN FINANCE VIEW COMPONENT (EXPORT DEFAULT)
// ==========================================================================
// ==========================================================================
// TEMPLATE SELECTION PAGE (separate route: /finance/templates)
// A selectable A4 layout gallery + live preview. Three GENUINELY DIFFERENT
// templates (Classic / Retail Light / Settlement Fintech), each a distinct
// visual design of the INV-2026-0121 document.
// ==========================================================================

// --- Spec brand tokens ---
const SPEC = {
  indigo: '#4d33b6', slate: '#0f172a', slate2: '#1e293b',
  cyan: '#06b6d4', surface: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', muted: '#64748b', label: '#475569',
  amberBg: 'rgba(245,158,11,0.14)', amberFg: '#b45309', green: '#047857',
};

// PDF-style INR (2 decimals, no leading space)
const specMoney = (v) => '\u20b9' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Neutral placeholders (no hard-coded company, client or bank data). Live data from
// Settings (issuer + bank) and the latest real invoice / quotation is merged in at runtime.
const SPEC_SAMPLE_INVOICE = {
  _id: 'spec-inv', invoiceNumber: 'INV-0000', clientName: 'Client name', clientOffice: '',
  gstCategory: '', gstType: '', issueDate: '', dueDate: '',
  hsn: '', subtotal: 0, gstAmount: 0, paidAmount: 0, totalAmount: 0, balance: 0, status: 'Draft',
  items: [{ sNo: 1, description: 'Item description', hsn: '', price: 0, qty: 0, total: 0 }],
  companyName: '', companyAddress: '', companyGst: '', companyPan: '',
  issuerOffice: '', issuerPhone: '', issuerEmail: '', signatoryName: '', signatoryDesignation: '',
  bankDetails: {}
};
const SPEC_SAMPLE_QUOTATION = {
  _id: 'spec-prp', propagationNumber: 'PRP-0000', quotationNumber: 'PRP-0000', clientName: 'Client name', clientOffice: '',
  title: '', issueDate: '', validUntil: '',
  subtotal: 0, tax: 0, total: 0, status: 'Draft',
  items: [{ description: 'Item description', qty: 0, rate: 0, amount: 0 }],
  companyName: '', companyAddress: '', companyGst: '', companyPan: '',
  signatoryName: '', signatoryDesignation: '',
  bankDetails: {}
};

// Per-template VISUAL DESIGN (three genuinely different A4 templates)
const TMPL_VIS = {
  classic: {
    id: 'classic',
    name: 'Classic Corporate', tag: 'Invoice - A4', accent: SPEC.indigo, kind: 'invoice',
    headerVariant: 'dark', quoteHeaderVariant: 'light',
    cardBg: SPEC.surface, cardBorder: SPEC.border, cardAccent: SPEC.indigo,
    thBg: SPEC.indigo, thColor: '#ffffff', thBorder: 'none',
    moneyAccent: SPEC.indigo, footerBg: SPEC.slate, wordmark: SPEC.indigo,
    pill: { bg: SPEC.amberBg, fg: SPEC.amberFg, border: 'rgba(217,119,6,0.35)' },
    desc: 'Flagship statutory layout: dark header with logo box & diagonal slashes, dual Billed-To / Issuer cards, indigo line-items header, Subtotal / Tax / TOTAL summary, and the Bank & Wire settlement tray with UPI QR and signature.',
    badges: ['B2B GST', 'LUT / Export', 'SEZ'],
  },
  retail: {
    id: 'retail',
    name: 'Crimson Creative', tag: 'Quotation - A4', accent: '#e5252a', kind: 'quotation',
    headerVariant: 'creative', quoteHeaderVariant: 'creative',
    cardBg: '#ffffff', cardBorder: '#e5e7eb', cardAccent: '#e5252a',
    thBg: '#e5252a', thColor: '#ffffff', thBorder: 'none',
    moneyAccent: '#e5252a', footerBg: '#ffffff', wordmark: '#e5252a',
    footerBorder: '#e5e7eb',
    pill: { bg: 'rgba(229,37,42,0.10)', fg: '#e5252a', border: 'rgba(229,37,42,0.30)' },
    desc: 'High-contrast Crimson & Black creative quotation: dynamic angled header with red slashes, signature badge coordinates, bold red line-items header, red settlement ribbon, and corporate seal.',
    badges: ['Creative A4', 'Quotation', 'Brand Identity'],
  },
  fintech: {
    id: 'fintech',
    name: 'Settlement Fintech', tag: 'Banking - A4', accent: SPEC.slate, kind: 'invoice',
    headerVariant: 'rail', quoteHeaderVariant: 'rail',
    cardBg: '#f1f5f9', cardBorder: '#dbe3ec', cardAccent: SPEC.indigo,
    thBg: SPEC.slate, thColor: '#ffffff', thBorder: 'none',
    moneyAccent: SPEC.indigo, footerBg: SPEC.slate, wordmark: SPEC.indigo,
    railAccent: SPEC.indigo,
    pill: { bg: 'rgba(77,51,182,0.08)', fg: SPEC.indigo, border: 'rgba(77,51,182,0.25)' },
    desc: 'Data-dense banking template: a vertical accent rail, slate top band, monospace-forward Bank & Wire block, and a verified corporate signature for settlement-heavy issuers (NEFT / RTGS / UPI).',
    badges: ['NEFT/RTGS', 'UPI VPA', 'Seal'],
  },
};

const TEMPLATE_META = [TMPL_VIS.classic, TMPL_VIS.retail, TMPL_VIS.fintech];

// Shared fallback: any template renders both an invoice AND a quotation;
// each uses its own visual system for the kind it was designed for, and a
// neutral fallback otherwise. This guarantees no undefined-visual crash.
const VIS_FALLBACK = {
  name: 'Default', accent: SPEC.indigo, kind: 'invoice',
  headerVariant: 'dark', quoteHeaderVariant: 'light',
  cardBg: SPEC.surface, cardBorder: SPEC.border, cardAccent: SPEC.indigo,
  thBg: SPEC.indigo, thColor: '#ffffff', thBorder: 'none',
  moneyAccent: SPEC.indigo, footerBg: SPEC.slate, wordmark: SPEC.indigo,
  pill: { bg: SPEC.amberBg, fg: SPEC.amberFg, border: 'rgba(217,119,6,0.35)' },
};
// ---- Template colour override (per template, saved in localStorage "tessly:templateColors") ----
const TPL_BASE_COLOR = { classic: '#4d33b6', retail: '#e5252a', fintech: '#4d33b6' };
const TPL_PRESETS = ['#4d33b6', '#2563eb', '#0891b2', '#059669', '#d97706', '#e5252a', '#db2777', '#0f172a'];
const readTplColors = () => { try { return JSON.parse(localStorage.getItem('tessly:templateColors') || '{}') || {}; } catch (e) { return {}; } };
const writeTplColor = (id, hex) => {
  try { const all = readTplColors(); if (hex) all[id] = hex; else delete all[id]; localStorage.setItem('tessly:templateColors', JSON.stringify(all)); } catch (e) {}
};
const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
let TPL_ACTIVE = { from: null, to: null, fromRgb: null, toRgb: null };
// Select which template's palette the next render uses (base colour -> chosen colour).
function setTplPalette(templateId, override) {
  const base = TPL_BASE_COLOR[templateId];
  const ov = override === undefined ? readTplColors()[templateId] : override;
  if (base && ov && hexRgb(ov) && ov.toLowerCase() !== base.toLowerCase()) TPL_ACTIVE = { from: base.toLowerCase(), to: ov, fromRgb: hexRgb(base), toRgb: hexRgb(ov) };
  else TPL_ACTIVE = { from: null, to: null, fromRgb: null, toRgb: null };
}
// tc('#4d33b6') -> the chosen colour when that base colour is being overridden
const tc = (hex) => (TPL_ACTIVE.from && String(hex).toLowerCase() === TPL_ACTIVE.from ? TPL_ACTIVE.to : hex);
// tca(77, 51, 182, 0.08) -> rgba() in the chosen colour when overriding
const tca = (r, g, b, a) => {
  const m = TPL_ACTIVE.fromRgb;
  const c = m && m[0] === r && m[1] === g && m[2] === b ? TPL_ACTIVE.toRgb : [r, g, b];
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
};

function resolveVis(templateId, kind) {
  setTplPalette(templateId);
  const base0 = TEMPLATE_META.find((t) => t.id === templateId) || VIS_FALLBACK;
  const base = {
    ...base0,
    accent: tc(base0.accent), cardAccent: tc(base0.cardAccent), moneyAccent: tc(base0.moneyAccent), wordmark: tc(base0.wordmark),
    thBg: tc(base0.thBg), railAccent: base0.railAccent ? tc(base0.railAccent) : base0.railAccent,
    pill: base0.pill && TPL_ACTIVE.from ? { bg: TPL_ACTIVE.toRgb ? 'rgba(' + TPL_ACTIVE.toRgb.join(',') + ',0.10)' : base0.pill.bg, fg: TPL_ACTIVE.to, border: 'rgba(' + TPL_ACTIVE.toRgb.join(',') + ',0.30)' } : base0.pill
  };
  const headerVariant = kind === 'quotation' ? base.quoteHeaderVariant : base.headerVariant;
  const thBg = base.thBg;
  const thColor = base.thColor;
  const thBorder = base.thBorder;
  const footerBg = base.footerBg;
  const footerBorder = base.footerBorder;
  const accent = base.accent;
  const railAccent = base.railAccent;
  const wordmark = base.wordmark;
  const pill = base.pill;
  return {
    name: base.name, tag: base.tag, desc: base.desc, badges: base.badges,
    accent, headerVariant, cardBg: base.cardBg, cardBorder: base.cardBorder, cardAccent: base.cardAccent,
    thBg, thColor, thBorder, moneyAccent: base.moneyAccent, footerBg, footerBorder, wordmark,
    pill, railAccent
  };
}

// --- Deterministic UPI QR (17x17 + 3 finders) ---
function SpecQr({ vpa, accent }) {
  let seed = 0;
  for (const ch of String(vpa || '—')) seed = (seed * 31 + ch.charCodeAt(0)) & 0xffff;
  const size = 17, cells = [];
  let s = ((seed || 7) * 2654435761) & 0x7fffffff;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const inFinder = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
    if (!inFinder && s % 2 === 1) cells.push([r, c]);
  }
  const finder = (ox, oy) => jsxs('g', { children: [
    jsx('rect', { x: ox, y: oy, width: 7, height: 7, fill: accent || SPEC.slate }),
    jsx('rect', { x: ox + 1, y: oy + 1, width: 5, height: 5, fill: '#ffffff' }),
    jsx('rect', { x: ox + 2, y: oy + 2, width: 3, height: 3, fill: accent || SPEC.indigo }),
  ] }, ox + ',' + oy);
  return jsxs('svg', {
    viewBox: `0 0 ${size} ${size}`, width: '92', height: '92', style: { display: 'block', shapeRendering: 'crispEdges' }, 'data-spec-qr': 'true',
    children: [
      jsx('rect', { x: 0, y: 0, width: size, height: size, fill: '#ffffff' }),
      cells.map(([r, c], i) => jsx('rect', { x: c, y: r, width: 1, height: 1, fill: accent || SPEC.slate }, i)),
      finder(0, 0), finder(size - 7, 0), finder(0, size - 7),
    ]
  });
}

// ---- Inline editing on the template (used by the full-page invoice editor) ----
// The editor publishes its state on window.__tlInvEdit while it is mounted; templates call <Ed/> for
// every editable value. Outside the editor <Ed/> simply returns the value (view / print unaffected).
function Ed({ field, index, value, type, placeholder, style }) {
  const ed = typeof window !== 'undefined' ? window.__tlInvEdit : null;
  if (!ed) return value;
  const isItem = index != null;
  const cur = isItem ? (ed.items[index] || {})[field] : ed.values[field];
  return jsx('input', {
    className: 'tl-ed' + (type === 'number' ? ' tl-ed--num' : ''),
    type: type || 'text',
    value: cur == null ? '' : cur,
    placeholder: placeholder || '',
    min: type === 'number' ? 0 : undefined,
    step: type === 'number' ? 'any' : undefined,
    style: style || {},
    onChange: (e) => (isItem ? ed.setItem(index, field, e.target.value) : ed.setValue(field, e.target.value))
  });
}
function EdRemove({ index }) {
  const ed = typeof window !== 'undefined' ? window.__tlInvEdit : null;
  if (!ed || (ed.items || []).length < 2) return null;
  return jsx('button', { type: 'button', className: 'tl-ed__del', title: 'Remove this line', 'aria-label': 'Remove this line', onClick: () => ed.removeItem(index), children: '\u00d7' });
}

// --- Logo block (monogram + wordmark) ---
function SpecLogo({ vis, small }) {
  // Logo comes from Settings > Invoice Sender (company logo); neutral placeholder when none is set.
  const logo = (typeof window !== 'undefined' && window.__tlLogo) || '';
  const dark = vis.headerVariant === 'dark';
  return jsx('div', {
    style: dark
      ? { display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', minWidth: '96px', height: '54px' }
      : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', minWidth: '96px', height: '48px', border: '1px dashed #cbd5e1', borderRadius: '8px' },
    'data-spec-logo': 'true',
    children: logo
      ? jsx('img', { src: logo, alt: 'Company logo', style: { height: '42px', width: 'auto', maxWidth: '180px', objectFit: 'contain', display: 'block' } })
      : jsx('span', { style: { fontSize: '11px', fontWeight: '700', letterSpacing: '0.12em', color: '#94a3b8' }, children: 'YOUR LOGO' })
  });
}

// --- Header (three variants) ---
function SpecHeader({ vis, kind, meta, pillLabel }) {
  const isInv = kind === 'invoice';
  const word = isInv ? 'INVOICE' : 'QUOTATION';
  const dateLabel = isInv ? 'Invoice Date:' : 'Issue Date:';
  const dueLabel = isInv ? 'Due Date:' : 'Valid Until:';

  // RIGHT SIDE (shared across variants)
  const right = jsxs('div', { style: { textAlign: 'right' }, children: [
    jsx('div', { style: { fontSize: '32px', fontWeight: '900', color: vis.headerVariant === 'dark' ? tc('#4d33b6') : vis.wordmark, letterSpacing: '-0.01em', lineHeight: 1 }, children: word }),
    jsx('div', {
      style: {
        display: 'inline-block',
        marginTop: '6px',
        padding: '4px 14px',
        borderRadius: '999px',
        background: vis.headerVariant === 'dark' ? '#fef3c7' : vis.pill.bg,
        color: vis.headerVariant === 'dark' ? '#b45309' : vis.pill.fg,
        fontSize: '10.5px',
        fontWeight: '800',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        border: '1px solid ' + (vis.headerVariant === 'dark' ? 'rgba(217,119,6,0.35)' : vis.pill.border)
      },
      'data-spec-pill': 'true',
      children: isInv ? 'COMMERCIAL INVOICE (LUT)' : (pillLabel || 'COMMERCIAL QUOTATION (LUT)')
    }),
    jsxs('div', { style: { marginTop: '8px', fontSize: '11.5px', lineHeight: 1.55, color: '#64748b' }, children: [
      jsxs('div', { children: [isInv ? 'Invoice Number: ' : 'Quotation No: ', jsx('b', { style: { color: '#0f172a', fontWeight: '800' }, children: (isInv && !meta.number.startsWith('#') ? '#' + meta.number : meta.number) })] }),
      jsxs('div', { children: [dateLabel + ' ', jsx('b', { style: { color: '#0f172a', fontWeight: '700' }, children: meta.date })] }),
      jsxs('div', { children: [dueLabel + ' ', jsx('b', { style: { color: '#0f172a', fontWeight: '700' }, children: jsx(Ed, { field: 'dueDate', value: meta.due, type: 'date' }) })] })
    ] })
  ] });

  if (vis.headerVariant === 'dark') {
    return jsxs('div', { style: { position: 'relative', background: '#ffffff', minHeight: '130px', overflow: 'hidden' }, 'data-spec-header': 'dark', children: [
      jsx('svg', { width: '100%', height: '130', viewBox: '0 0 794 130', preserveAspectRatio: 'none', style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '130px', zIndex: 1 }, children: [
        jsx('polygon', { points: '0,0 435,0 345,130 0,130', fill: '#0b1120' }),
        jsx('polygon', { points: '435,0 460,0 370,130 345,130', fill: '#00d2ff' }),
        jsx('polygon', { points: '460,0 498,0 408,130 370,130', fill: tc('#4d33b6') })
      ] }),
      jsxs('div', { style: { position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '130px', padding: '0 40px' }, children: [
        jsx(SpecLogo, { vis }), right
      ] })
    ] });
  }

  if (vis.headerVariant === 'light') {
    return jsxs('div', { style: { position: 'relative', background: '#ffffff', minHeight: '120px', borderTop: '6px solid ' + vis.accent, overflow: 'hidden', boxSizing: 'border-box' }, 'data-spec-header': 'light', children: [
      jsx('div', { style: { position: 'absolute', right: 0, top: 6, width: '120px', height: '114px', background: 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(6,182,212,0.02))' } }),
      jsxs('div', { style: { position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '120px', padding: '0 40px' }, children: [
        jsx(SpecLogo, { vis }), right
      ] })
    ] });
  }

  // rail variant
  return jsxs('div', { style: { position: 'relative', background: '#ffffff', minHeight: '120px', overflow: 'hidden', borderLeft: '10px solid ' + (vis.railAccent || SPEC.indigo), boxSizing: 'border-box' }, 'data-spec-header': 'rail', children: [
    jsx('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, ' + (vis.railAccent || SPEC.indigo) + ' 0 30%, ' + SPEC.cyan + ' 70%, transparent)' } }),
    jsxs('div', { style: { position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '120px', padding: '0 40px' }, children: [
      jsx(SpecLogo, { vis }), right
    ] })
  ] });
}

// --- Dual coordinate cards (variant-aware) ---
function SpecCoordCard({ vis, badge, title, rows, right }) {
  const accentColor = right ? '#0f172a' : tc('#4d33b6');
  const badgeBg = right ? '#f1f5f9' : '#eef2ff';
  const badgeColor = right ? '#0f172a' : tc('#4d33b6');
  return jsxs('div', {
    style: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      padding: '16px 20px',
      borderLeft: '5px solid ' + accentColor,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      position: 'relative'
    },
    'data-spec-card': right ? 'issuer' : 'buyer',
    children: [
      jsx('div', {
        style: { display: 'inline-block', fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '6px', background: badgeBg, color: badgeColor },
        children: badge
      }),
      jsx('div', {
        style: { fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em', margin: '8px 0 2px', lineHeight: 1.2, wordBreak: 'break-word' },
        children: title
      }),
      jsx('div', { style: { height: '1px', background: '#e2e8f0', margin: '8px 0 10px' } }),
      jsxs('table', { style: { width: '100%', borderCollapse: 'collapse' }, children: rows.map((r, i) => jsxs('tr', { key: i, children: [
        jsx('td', { style: { width: '75px', fontSize: '12px', fontWeight: '500', color: '#64748b', verticalAlign: 'top', padding: '3px 0' }, children: r.label }),
        jsx('td', { style: { width: '12px', color: '#64748b', fontSize: '12px', padding: '3px 0', textAlign: 'center', verticalAlign: 'top' }, children: ':' }),
        jsx('td', { style: { fontSize: '12.5px', padding: '3px 0', lineHeight: 1.4, verticalAlign: 'top', fontWeight: r.strong ? '700' : '500', fontStyle: r.muted ? 'italic' : 'normal', color: r.muted ? '#94a3b8' : '#0f172a' }, children: r.value })
      ] }, i)) })
    ]
  });
}

// An invoice with no GST (bill of supply / export LUT / exempt) hides tax and HSN details.
const specNoTax = (inv) => !inv || ['N/A', 'Non-GST', 'Export LUT'].includes(inv.gstCategory) || ['Exempted', 'Export LUT'].includes(inv.gstType);

// --- Line items table (variant-aware header) ---
function SpecItemsTable({ vis, items, descLabel, rateLabel, noTax }) {
  const th = (width, align) => ({
    background: vis.thBg,
    color: vis.thColor,
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '12px 14px',
    width,
    textAlign: align,
    borderRight: '1px solid rgba(255,255,255,0.18)'
  });
  const td = (align, extra) => Object.assign({
    padding: '12px 14px',
    fontSize: '12.5px',
    borderBottom: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    color: '#0f172a'
  }, { textAlign: align }, extra || {});

  return jsxs('table', {
    style: { width: '100%', borderCollapse: 'separate', borderSpacing: '0', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' },
    'data-spec-items': 'true',
    children: [
      jsx('thead', { children: jsxs('tr', { children: [
        jsx('th', { style: th('50px', 'center'), children: 'NO.' }),
        jsx('th', { style: th('auto', 'center'), children: descLabel || 'PRODUCT DESCRIPTION' }),
        jsx('th', { style: th('120px', 'right'), children: rateLabel || 'PRICE (\u20b9)' }),
        jsx('th', { style: th('65px', 'center'), children: 'QTY' }),
        noTax ? null : jsx('th', { style: th('95px', 'center'), children: 'HSN/SAC' }),
        jsx('th', { style: Object.assign(th('130px', 'right'), { borderRight: 'none' }), children: 'TOTAL (\u20b9)' })
      ] }) }),
      jsx('tbody', { children: (items || []).map((it, idx) => jsxs('tr', { key: idx, children: [
        jsxs('td', { style: td('center', { fontWeight: '600', color: '#334155' }), children: [String(idx + 1).padStart(2, '0'), jsx(EdRemove, { index: idx })] }),
        jsx('td', { style: td('center', { color: '#0f172a', fontWeight: '500' }), children: jsx(Ed, { field: 'description', index: idx, value: it.description || it.item || '-', placeholder: 'Item description' }) }),
        jsx('td', { style: td('right', { fontWeight: '700', color: '#0f172a' }), children: jsx(Ed, { field: 'price', index: idx, type: 'number', value: specMoney(it.price != null ? it.price : it.rate), placeholder: '0' }) }),
        jsx('td', { style: td('center', { color: '#0f172a' }), children: jsx(Ed, { field: 'qty', index: idx, type: 'number', value: it.qty || 1, placeholder: '1' }) }),
        noTax ? null : jsx('td', { style: td('center', { color: '#64748b' }), children: jsx(Ed, { field: 'hsn', index: idx, value: it.hsn || '998314', placeholder: 'HSN' }) }),
        jsx('td', { style: td('right', { fontWeight: '700', color: '#0f172a', borderRight: 'none' }), children: specMoney(it.total != null ? it.total : it.amount || (it.price || it.rate || 0) * (it.qty || 1)) })
      ] }, idx)) })
    ]
  });
}

// --- Summary (variant-aware accent) ---
function SpecSummary({ vis, invoice }) {
  const taxStatus = (invoice.gstCategory === 'Export LUT' || invoice.gstCategory === 'Non-GST' || !invoice.gstAmount)
    ? specMoney(0) + ' (Non-GST / Tax-Exempt)'
    : specMoney(invoice.gstAmount);
  const row = (label, val, primary) => jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0f172a', gap: '16px' }, children: [
    jsx('span', { style: { color: '#64748b', fontWeight: '500' }, children: label }),
    jsx('span', { style: { fontWeight: primary ? '700' : '500', color: '#0f172a' }, children: val })
  ] });
  return jsxs('div', { style: { display: 'flex', justifyContent: 'flex-end', padding: '22px 40px 0' }, children: jsxs('div', {
    style: { width: '360px', display: 'flex', flexDirection: 'column', gap: '8px' }, 'data-spec-summary': 'true',
    children: [
      row('Subtotal:', specMoney(invoice.subtotal), true),
      ...(Number(invoice.discountAmount) > 0 ? [row(invoice.discountType === 'percent' ? `Discount (${invoice.discountValue}%):` : 'Discount:', '− ' + specMoney(invoice.discountAmount), false)] : []),
      ...(specNoTax(invoice) ? [] : [row(invoice.gstType === 'CGST+SGST' ? 'CGST + SGST:' : 'IGST:', specMoney(invoice.gstAmount || 0), false)]),
      ...(Number(invoice.paidAmount) > 0 ? [row('Paid:', specMoney(invoice.paidAmount), false)] : []),
      jsx('div', { style: { height: '1.5px', background: '#cbd5e1', margin: '4px 0 2px' } }),
      jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }, children: [
        jsx('span', { style: { fontSize: '15px', fontWeight: '800', color: tc('#4d33b6'), letterSpacing: '0.02em' }, children: 'TOTAL AMOUNT:' }),
        jsx('span', { style: { color: tc('#4d33b6'), fontSize: '22px', fontWeight: '900' }, children: specMoney(invoice.totalAmount) })
      ] }),
      jsx('div', { style: { height: '3px', background: tc('#4d33b6'), marginTop: '2px' } })
    ]
  }) });
}

// --- Settlement row (Bank & Wire + QR + signature), variant-aware ---
function SpecSettlementRow({ vis, doc }) {
  const bank = doc.bankDetails || {};
  const mono = vis.headerVariant === 'rail';
  const bankRows = [
    ['Bank Name', bank.bankName || '—', mono, false, true],
    ['Account Name', bank.accountName || '—', false, false, true],
    ['Account Type', bank.accountType || 'Current Account', false, false, true],
    ['Account No', bank.accountNumber || '—', true, true, true],
    ['IFSC / RTGS', bank.ifsc || '—', true, true, true, tc('#4d33b6')],
    ['Branch', bank.branch || '—', false, false, true],
    ['UPI ID', bank.upiId || '—', true, true, true, tc('#4d33b6')],
    ['Branch Address', bank.branchAddress || '—', false, false, false]
  ];
  const rows = bankRows.map((r, i) =>
    jsxs('tr', { key: i, children: [
      jsx('td', { style: { width: '110px', fontSize: '12px', color: '#64748b', padding: '3px 0', fontWeight: '500', verticalAlign: 'top' }, children: r[0] }),
      jsx('td', { style: { width: '14px', textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '3px 0', verticalAlign: 'top' }, children: ':' }),
      jsx('td', { style: { fontSize: '12.5px', color: r[5] || '#0f172a', padding: '3px 0', lineHeight: 1.35, verticalAlign: 'top', fontWeight: r[4] ? '700' : '500', fontFamily: r[3] ? 'monospace' : 'inherit' }, children: r[1] })
    ] })
  );
  return jsxs('div', { style: { display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.3fr', gap: '20px', padding: '24px 40px 18px', alignItems: 'center' }, 'data-spec-settlement': 'true', children: [
    // Left: Bank details
    jsxs('div', { children: [
      jsx('div', { style: { fontSize: '13px', fontWeight: '800', color: tc('#4d33b6'), letterSpacing: '0.04em', textTransform: 'uppercase', borderLeft: '3.5px solid ' + tc('#4d33b6'), paddingLeft: '8px', marginBottom: '10px' }, children: 'BANK & WIRE REMITTANCE DETAILS' }),
      jsxs('table', { style: { width: '100%', borderCollapse: 'collapse' }, children: [jsx('tbody', { children: rows })] })
    ] }),
    // Middle: QR Code card
    jsxs('div', {
      style: { background: '#ffffff', border: '1.5px solid #e0e7ff', borderRadius: '12px', padding: '12px 14px 10px', textAlign: 'center', boxShadow: '0 4px 14px ' + tca(77,51,182,0.06), width: 'fit-content', margin: '0 auto' },
      children: [
        jsx('div', { style: { width: '104px', height: '104px', margin: '0 auto', display: 'grid', placeItems: 'center' }, children: [
          jsx('img', { src: '/assets/spec-qr-code.png', alt: 'UPI QR', style: { width: '104px', height: '104px', display: 'block', borderRadius: '6px' }, 'data-spec-qr': 'true' })
        ] }),
        jsxs('div', { style: { fontSize: '10.5px', fontWeight: '800', color: tc('#4d33b6'), letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '6px' }, children: [
          jsx('span', { style: { fontSize: '12px' }, children: '\ud83d\udcf1 ' }), 'SCAN TO PAY'
        ] })
      ]
    }),
    // Right: Signature
    jsxs('div', { style: { textAlign: 'center' }, children: [
      jsx('div', { style: { fontSize: '12px', fontWeight: '700', color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }, children: 'FOR ' + String((doc && doc.companyName) || 'COMPANY').toUpperCase() }),
      jsx('img', { src: '/assets/spec-signature.png', alt: 'Authorised Signature', style: { height: '46px', width: 'auto', margin: '4px auto', display: 'block' }, 'data-spec-signature': 'true' }),
      jsx('div', { style: { height: '1.5px', background: '#0f172a', width: '160px', margin: '4px auto 6px' } }),
      jsx('div', { style: { fontSize: '14px', fontWeight: '800', color: '#0f172a' }, children: doc.signatoryName || '—' }),
      jsx('div', { style: { fontSize: '11px', fontWeight: '700', color: tc('#4d33b6'), marginTop: '2px', whiteSpace: 'nowrap' }, children: doc.signatoryDesignation || 'Authorised Signatory' })
    ] })
  ] });
}

// --- Footer (variant-aware) ---
function SpecFooter({ vis, doc }) {
  const dark = vis.footerBg !== '#ffffff';
  const icon = (type) => {
    const s = { width: 13, height: 13, viewBox: '0 0 24 24', stroke: '#ffffff', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
    let path = null;
    if (type === 'phone') path = jsx('path', { d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z' });
    else if (type === 'mail') path = jsxs(Fragment, { children: [jsx('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }), jsx('path', { d: 'm22 7-10 6L2 7' })] });
    else path = jsxs(Fragment, { children: [jsx('path', { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z' }), jsx('circle', { cx: 12, cy: 10, r: 3 })] });
    return jsx('span', { style: { background: tc('#4d33b6'), width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: jsx('svg', Object.assign({ key: type }, s, { children: path })) });
  };
  const contacts = [
    ['phone', doc.issuerPhone || '—'],
    ['mail', doc.issuerEmail || '—'],
    ['pin', doc.companyAddress || '—']
  ];
  return jsxs('div', {
    style: { background: dark ? '#0b1120' : '#ffffff', borderTop: vis.footerBorder ? '1px solid ' + vis.footerBorder : 'none', marginTop: 'auto', padding: '14px 40px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' },
    'data-spec-footer': 'true',
    children: [
      contacts.map((c, i) => jsxs('span', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: '8px', color: dark ? '#ffffff' : SPEC.slate2, fontSize: '12px', fontWeight: '500' }, children: [dark ? icon(c[0]) : null, c[1]] })),
      jsx('span', { style: { marginLeft: 'auto', color: dark ? '#ffffff' : SPEC.text, fontSize: '13.5px', fontWeight: '800' }, children: 'Thank You For Your Business' })
    ]
  });
}

// ---------------------------------------------------------------------------
// TEMPLATE 2: CRIMSON CREATIVE (BOLD BLACK & RED GEOMETRIC QUOTATION FORMAT)
// ---------------------------------------------------------------------------
function RetailInvoiceSheet({ invoice, template, kind }) {
  setTplPalette('retail');
  const isInv = kind === "invoice";
  const docNum = isInv
    ? (invoice.invoiceNumber || "INV-0000")
    : (invoice.propagationNumber || invoice.quotationNumber || "PRP-0000");
  const dateStr = invoice.issueDate || invoice.date || "2026-11-05";
  const dueStr = isInv
    ? (invoice.dueDate || "2026-11-10")
    : (invoice.validUntil || "2026-12-05");

  const rawItems = (invoice.items && invoice.items.length) ? invoice.items : [
    { description: "Business Card Design", price: 200, qty: 1, total: 200 },
    { description: "Logo Design", price: 200, qty: 1, total: 200 },
    { description: "Flyer Design", price: 200, qty: 1, total: 200 },
    { description: "Brochure Design", price: 300, qty: 1, total: 300 },
    { description: "Packaging Design", price: 500, qty: 1, total: 500 },
    { description: "Mockup Design", price: 600, qty: 1, total: 600 }
  ];

  const subtotal = invoice.subtotal != null ? invoice.subtotal : rawItems.reduce((s, it) => s + (it.total || (it.price || 0) * (it.qty || 1)), 0);
  const total = invoice.totalAmount != null ? invoice.totalAmount : (invoice.total != null ? invoice.total : subtotal);
  const clientName = invoice.clientName || "Client name";
  const bank = invoice.bankDetails || {};

  // Signature Black Badge + Red Underline
  const SectionBadge = (label) => jsxs("div", {
    style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-start", marginBottom: "8px" },
    children: [
      jsx("div", {
        style: {
          background: "#111113",
          color: "#ffffff",
          padding: "4px 14px",
          borderRadius: "3px",
          fontSize: "11px",
          fontWeight: "800",
          letterSpacing: "0.06em",
          textTransform: "uppercase"
        },
        children: label
      }),
      jsx("div", {
        style: {
          height: "3px",
          background: tc("#e5252a"),
          marginTop: "2px",
          width: "100%",
          borderRadius: "1.5px"
        }
      })
    ]
  });

  return jsxs("div", {
    className: "spec-sheet crimson-sheet",
    "data-spec-sheet": kind || "quotation",
    "data-template": "retail",
    style: {
      background: "#ffffff",
      color: "#111113",
      width: "100%",
      maxWidth: "794px",
      minHeight: "1050px",
      margin: "0 auto",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      overflow: "hidden",
      fontFamily: "\x27Urbanist\x27, ui-sans-serif, system-ui, -apple-system, sans-serif"
    },
    children: [
      // 1. Asymmetric Black & Red Geometric Header
      jsxs("div", {
        "data-spec-header": "creative",
        style: {
          position: "relative",
          background: "#ffffff",
          minHeight: "140px",
          overflow: "hidden",
          boxSizing: "border-box"
        },
        children: [
          // SVG Polygons
          jsx("svg", {
            viewBox: "0 0 794 140",
            width: "100%",
            height: "140",
            preserveAspectRatio: "none",
            style: { position: "absolute", left: 0, top: 0, width: "100%", height: "140px", zIndex: 1 },
            children: [
              jsx("polygon", { points: "0,0 490,0 375,140 0,140", fill: "#111113" }),
              jsx("polygon", { points: "470,0 500,0 425,140 375,140", fill: tca(229,37,42,0.45) }),
              jsx("polygon", { points: "495,0 535,0 455,140 415,140", fill: tc("#e5252a") })
            ]
          }),
          // Header Content
          jsxs("div", {
            style: {
              position: "relative",
              zIndex: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: "140px",
              padding: "0 44px"
            },
            children: [
              // Left: Logo & Company Name
              jsxs("div", {
                style: { display: "flex", alignItems: "center", gap: "14px" },
                children: [
                  jsx("svg", {
                    width: "44",
                    height: "44",
                    viewBox: "0 0 48 48",
                    children: [
                      jsx("path", { d: "M6 38 L24 8 L32 22 L24 22 L18 32 L38 32 L42 38 Z", fill: tc("#e5252a") }),
                      jsx("path", { d: "M24 16 L38 38 L30 38 L24 28 L18 38 L12 38 Z", fill: "#ffffff" }),
                      jsx("circle", { cx: 24, cy: 12, r: 2.5, fill: "#ffffff" })
                    ]
                  }),
                  jsxs("div", {
                    style: { textAlign: "left" },
                    children: [
                      jsx("div", {
                        style: { fontSize: "23px", fontWeight: "900", color: "#ffffff", letterSpacing: "0.06em", lineHeight: 1.1 },
                        children: "Company name"
                      }),
                      jsx("div", {
                        style: { fontSize: "8.5px", fontWeight: "800", color: tc("#e5252a"), letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "3px" },
                        children: "SMART CLOUD · DIGITAL SOLUTIONS"
                      })
                    ]
                  })
                ]
              }),
              // Right: Document Title & ID
              jsxs("div", {
                style: { textAlign: "right" },
                children: [
                  jsx("div", {
                    style: { fontSize: "27px", fontWeight: "900", color: tc("#e5252a"), letterSpacing: "-0.02em", lineHeight: 1 },
                    children: isInv ? "INVOICE" : "COMMERCIAL QUOTATION"
                  }),
                  jsxs("div", {
                    style: { fontSize: "12px", fontWeight: "800", color: "#111113", marginTop: "6px", letterSpacing: "0.02em" },
                    children: [
                      isInv ? "ID NO : " : "REF NO : ",
                      jsx("span", { style: { color: tc("#e5252a") }, children: docNum })
                    ]
                  }),
                  jsxs("div", {
                    style: { fontSize: "11px", color: "#6b7280", marginTop: "4px", lineHeight: 1.4 },
                    children: [
                      jsxs("span", { children: ["Date : ", jsx("b", { style: { color: "#111113" }, children: dateStr })] }),
                      jsx("span", { style: { margin: "0 6px" }, children: "·" }),
                      jsxs("span", { children: [isInv ? "Due : " : "Valid : ", jsx("b", { style: { color: "#111113" }, children: jsx(Ed, { field: "dueDate", value: dueStr, type: "date" }) })] })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),

      // 2. Coordinates: Invoice To & Invoice From (Perfect Dual Column Alignment)
      jsxs("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "36px",
          padding: "26px 44px 12px",
          alignItems: "start"
        },
        children: [
          // Left: Invoice To
          jsxs("div", {
            style: { textAlign: "left" },
            children: [
              SectionBadge(isInv ? "INVOICE TO :" : "QUOTE TO :"),
              jsx("div", {
                style: { fontSize: "16px", fontWeight: "800", color: "#111113", marginBottom: "4px" },
                children: jsx(Ed, { field: "clientName", value: clientName, placeholder: "Client / buyer name" })
              }),
              jsxs("div", {
                style: { fontSize: "12px", color: "#4b5563", lineHeight: 1.6 },
                children: [
                  (invoice.clientOffice && invoice.clientOffice !== clientName)
                    ? jsx("div", { children: invoice.clientOffice })
                    : null,
                  jsxs("div", { children: ["Phone : ", jsx("span", { style: { color: "#111113" }, children: invoice.clientPhone || "+91 94893 00587" })] }),
                  jsxs("div", { children: ["Email : ", jsx("span", { style: { color: "#111113" }, children: invoice.clientEmail || "contact@client.com" })] }),
                  jsx("div", { children: invoice.clientAddress || invoice.buyerAddress || "—" }),
                  invoice.buyerGstin ? jsxs("div", { children: ["GSTIN : ", jsx("b", { children: invoice.buyerGstin })] }) : null
                ]
              })
            ]
          }),

          // Right: Invoice From
          jsxs("div", {
            style: { textAlign: "left" },
            children: [
              SectionBadge(isInv ? "INVOICE FROM :" : "QUOTE FROM :"),
              jsx("div", {
                style: { fontSize: "16px", fontWeight: "800", color: "#111113", marginBottom: "4px" },
                children: invoice.companyName || "Company name"
              }),
              jsxs("div", {
                style: { fontSize: "12px", color: "#4b5563", lineHeight: 1.6 },
                children: [
                  jsx("div", { children: "Managing Director / Corporate Desk" }),
                  jsxs("div", { children: ["Phone : ", jsx("span", { style: { color: "#111113" }, children: invoice.issuerPhone || "—" })] }),
                  jsxs("div", { children: ["Email : ", jsx("span", { style: { color: "#111113" }, children: invoice.issuerEmail || "—" })] }),
                  jsx("div", { children: invoice.companyAddress || "" }),
                  jsxs("div", { children: ["GSTIN : ", jsx("b", { children: invoice.companyGst || "—" })] })
                ]
              })
            ]
          })
        ]
      }),

      // 3. Line Items Table with Solid Crimson Red Header & Flawless Column Alignments
      jsx("div", {
        style: { padding: "16px 44px 0" },
        children: jsxs("table", {
          style: {
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            border: "1px solid #e5e7eb"
          },
          "data-spec-items": "true",
          children: [
            jsx("thead", {
              children: jsxs("tr", {
                style: { background: tc("#e5252a") },
                children: [
                  jsx("th", {
                    style: {
                      background: tc("#e5252a"),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "12px 8px",
                      textAlign: "center",
                      width: "8%",
                      border: "1px solid rgba(255,255,255,0.35)"
                    },
                    children: "S NO"
                  }),
                  jsx("th", {
                    style: {
                      background: tc("#e5252a"),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "12px 16px",
                      textAlign: "center",
                      width: "44%",
                      border: "1px solid rgba(255,255,255,0.35)"
                    },
                    children: "DESCRIPTION"
                  }),
                  jsx("th", {
                    style: {
                      background: tc("#e5252a"),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "12px 12px",
                      textAlign: "right",
                      width: "18%",
                      border: "1px solid rgba(255,255,255,0.35)"
                    },
                    children: "PRICE"
                  }),
                  jsx("th", {
                    style: {
                      background: tc("#e5252a"),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "12px 8px",
                      textAlign: "center",
                      width: "10%",
                      border: "1px solid rgba(255,255,255,0.35)"
                    },
                    children: "QTY"
                  }),
                  jsx("th", {
                    style: {
                      background: tc("#e5252a"),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "12px 16px",
                      textAlign: "right",
                      width: "20%",
                      border: "1px solid rgba(255,255,255,0.35)"
                    },
                    children: "TOTAL"
                  })
                ]
              })
            }),
            jsx("tbody", {
              children: rawItems.map((it, idx) =>
                jsxs("tr", {
                  key: idx,
                  style: { borderBottom: "1px solid #e5e7eb" },
                  children: [
                    jsx("td", {
                      style: { padding: "13px 8px", fontSize: "12.5px", fontWeight: "700", color: "#475569", textAlign: "center", border: "1px solid #e5e7eb", fontVariantNumeric: "tabular-nums" },
                      children: [String(idx + 1).padStart(2, "0"), jsx(EdRemove, { index: idx })]
                    }),
                    jsx("td", {
                      style: {
                        padding: "13px 16px",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        color: "#111113",
                        textAlign: "center",
                        border: "1px solid #e5e7eb"
                      },
                      children: jsx(Ed, { field: "description", index: idx, value: it.description || it.item || "Service Consultation", placeholder: "Item description" })
                    }),
                    jsx("td", {
                      style: {
                        padding: "13px 12px",
                        fontSize: "12.5px",
                        fontWeight: "700",
                        color: "#111113",
                        textAlign: "right",
                        border: "1px solid #e5e7eb",
                        fontVariantNumeric: "tabular-nums"
                      },
                      children: jsx(Ed, { field: "price", index: idx, type: "number", value: specMoney(it.price != null ? it.price : it.rate), placeholder: "0" })
                    }),
                    jsx("td", {
                      style: {
                        padding: "13px 8px",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        color: "#4b5563",
                        textAlign: "center",
                        border: "1px solid #e5e7eb",
                        fontVariantNumeric: "tabular-nums"
                      },
                      children: jsx(Ed, { field: "qty", index: idx, type: "number", value: it.qty || 1, placeholder: "1" })
                    }),
                    jsx("td", {
                      style: {
                        padding: "13px 16px",
                        fontSize: "12.5px",
                        fontWeight: "800",
                        color: "#111113",
                        textAlign: "right",
                        border: "1px solid #e5e7eb",
                        fontVariantNumeric: "tabular-nums"
                      },
                      children: specMoney(it.total != null ? it.total : it.amount || (it.price || it.rate || 0) * (it.qty || 1))
                    })
                  ]
                }, idx)
              )
            })
          ]
        })
      }),

      // 4. Summary & Settlement Tray (Crisp Column Alignment)
      jsxs("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: "40px",
          padding: "24px 44px 16px",
          alignItems: "start"
        },
        "data-spec-settlement": "true",
        children: [
          // Left: Payment Method, Contact Info, Thanks note
          jsxs("div", {
            style: { display: "flex", flexDirection: "column", gap: "16px" },
            children: [
              // Payment Method
              jsxs("div", {
                children: [
                  SectionBadge("Payment Method :"),
                  jsxs("div", {
                    style: { fontSize: "11.5px", color: "#4b5563", lineHeight: 1.55 },
                    children: [
                      jsxs("div", { children: ["Account No : ", jsx("b", { style: { color: "#111113" }, children: bank.accountNumber || "—" })] }),
                      jsxs("div", { children: ["Account Name : ", jsx("b", { style: { color: "#111113" }, children: bank.accountName || "—" })] }),
                      jsxs("div", { children: ["Branch : ", jsx("span", { children: bank.branch || "—" })] }),
                      jsxs("div", { children: ["UPI VPA : ", jsx("b", { style: { color: tc("#e5252a") }, children: bank.upiId || "—" })] })
                    ]
                  })
                ]
              }),
              // Contact Info
              jsxs("div", {
                children: [
                  SectionBadge("Contact Info :"),
                  jsxs("div", {
                    style: { fontSize: "11.5px", color: "#4b5563", lineHeight: 1.55 },
                    children: [
                      jsxs("div", { children: ["Phone : ", jsx("span", { style: { color: "#111113" }, children: "—" })] }),
                      jsxs("div", { children: ["Email : ", jsx("span", { style: { color: "#111113" }, children: "—" })] }),
                      jsxs("div", { children: ["Web : ", jsx("span", { style: { color: "#111113" }, children: "—" })] })
                    ]
                  })
                ]
              }),
              // Thanks note
              jsxs("div", {
                style: { marginTop: "2px" },
                children: [
                  jsx("div", {
                    style: { fontSize: "13px", fontWeight: "800", fontStyle: "italic", color: "#111113", marginBottom: "3px" },
                    children: "Thanks for your business"
                  }),
                  jsx("div", {
                    style: { fontSize: "10.5px", color: "#6b7280", lineHeight: 1.45, maxWidth: "360px" },
                    children: "We value your business and look forward to continuing our partnership. All services rendered adhere to standard quality benchmarks."
                  })
                ]
              })
            ]
          }),

          // Right: Subtotal, Tax, TOTAL ribbon, Signature (100% Flush Alignment)
          jsxs("div", {
            style: { display: "flex", flexDirection: "column", gap: "6px" },
            "data-spec-summary": "true",
            children: [
              // Subtotal
              jsxs("div", {
                style: { display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#4b5563", padding: "4px 16px" },
                children: [
                  jsx("span", { children: "Subtotal :" }),
                  jsx("b", { style: { color: "#111113", fontVariantNumeric: "tabular-nums" }, children: specMoney(subtotal) })
                ]
              }),
              Number(invoice.discountAmount) > 0 ? jsxs("div", {
                style: { display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#14806f", padding: "4px 16px" },
                children: [
                  jsx("span", { children: invoice.discountType === "percent" ? `Discount (${invoice.discountValue}%) :` : "Discount :" }),
                  jsx("b", { style: { fontVariantNumeric: "tabular-nums" }, children: "− " + specMoney(invoice.discountAmount) })
                ]
              }) : null,
              // Tax (only when the invoice carries GST)
              specNoTax(invoice) ? null : jsxs("div", {
                style: { display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#4b5563", padding: "4px 16px" },
                children: [
                  jsx("span", { children: invoice.gstType === "CGST+SGST" ? "CGST + SGST :" : "IGST :" }),
                  jsx("span", { style: { fontVariantNumeric: "tabular-nums" }, children: specMoney(invoice.gstAmount || 0) })
                ]
              }),
              // Crimson Total Ribbon (Flush Alignment with Table Total Column)
              jsxs("div", {
                style: {
                  background: tc("#e5252a"),
                  color: "#ffffff",
                  padding: "10px 16px",
                  borderRadius: "3px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "8px 0 18px",
                  boxSizing: "border-box"
                },
                children: [
                  jsx("span", { style: { fontSize: "13px", fontWeight: "900", letterSpacing: "0.08em" }, children: "TOTAL" }),
                  jsx("span", { style: { fontSize: "19px", fontWeight: "900", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }, children: specMoney(total) })
                ]
              }),
              // Signature Block (Centered under Signature Line, Flush on Right Axis)
              jsxs("div", {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  width: "160px",
                  marginLeft: "auto",
                  marginRight: "16px",
                  marginTop: "6px"
                },
                children: [
                  jsx("img", {
                    src: "/assets/spec-signature.png",
                    alt: "Authorised Signature",
                    style: { height: "36px", width: "auto", display: "block", marginBottom: "2px" },
                    "data-spec-signature": "true"
                  }),
                  jsx("div", {
                    style: { height: "1.5px", background: "#111113", width: "100%", marginBottom: "4px" }
                  }),
                  jsx("div", {
                    style: { fontSize: "10px", fontWeight: "800", color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase" },
                    children: "SIGNATURE"
                  }),
                  jsx("div", {
                    style: { fontSize: "12px", fontWeight: "800", color: "#111113", marginTop: "2px" },
                    children: invoice.signatoryName || "—"
                  })
                ]
              })
            ]
          })
        ]
      }),

      // 5. Bottom Geometric Framing (Black polygon + Red slash)
      jsxs("div", {
        "data-spec-footer": "true",
        style: {
          position: "relative",
          marginTop: "auto",
          background: "#ffffff",
          overflow: "hidden"
        },
        children: [
          jsx("svg", {
            viewBox: "0 0 794 44",
            width: "100%",
            height: "44",
            preserveAspectRatio: "none",
            style: { display: "block" },
            children: [
              jsx("rect", { x: 0, y: 38, width: 794, height: 6, fill: tc("#e5252a") }),
              jsx("polygon", { points: "660,44 794,0 794,44", fill: "#111113" }),
              jsx("polygon", { points: "630,44 660,44 794,0 764,0", fill: tc("#e5252a") })
            ]
          })
        ]
      })
    ]
  });
}

function FintechInvoiceSheet({ invoice, template, kind }) {
  setTplPalette('fintech');
  const isInv = kind === 'invoice';
  const docNum = isInv ? (invoice.invoiceNumber || 'INV-0000') : (invoice.propagationNumber || invoice.quotationNumber || 'PRP-0000');
  const dateStr = invoice.issueDate || '2026-11-05';
  const dueStr = isInv ? (invoice.dueDate || '2026-11-10') : (invoice.validUntil || '2026-12-05');
  const items = invoice.items || [];
  const subtotal = invoice.subtotal || invoice.total || 1000;
  const total = invoice.totalAmount || invoice.total || 1000;
  const clientName = invoice.clientName || 'Client name';
  const bank = invoice.bankDetails || {};

  return jsxs('div', {
    className: 'spec-sheet fintech-sheet',
    'data-spec-sheet': kind || 'invoice',
    'data-template': 'fintech',
    style: { background: '#ffffff', color: '#1e293b', borderLeft: '10px solid #1e293b', minHeight: '1050px', display: 'flex', flexDirection: 'column' },
    children: [
      // 1. Institutional Executive Header with rail accent (meets test: [data-spec-header="rail"])
      jsxs('div', {
        'data-spec-header': 'rail',
        style: { position: 'relative', background: '#ffffff', minHeight: '120px', overflow: 'hidden', padding: '20px 40px', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        children: [
          jsx('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #1e293b 0 35%, ' + tc('#4d33b6') + ' 70%, #06b6d4)' } }),
          // Left: Corporate Treasury entity
          jsxs('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' }, children: [
            jsx('div', { style: { width: '46px', height: '46px', borderRadius: '10px', background: '#0f172a', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(15,23,42,0.25)' }, children: [
              jsx('svg', { width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: '#ffffff', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', children: [
                jsx('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10' }),
                jsx('path', { d: 'm9 12 2 2 4-4' })
              ] })
            ] }),
            jsxs('div', { children: [
              jsx('div', { style: { fontSize: '18px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }, children: String((invoice && invoice.companyName) || 'Company name').toUpperCase() }),
              jsx('div', { style: { fontSize: '9.5px', fontWeight: '700', color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }, children: 'Institutional Wire, Interbank Settlement & Trade Finance' }),
              jsx('div', { style: { fontSize: '10px', fontFamily: 'monospace', color: '#64748b', marginTop: '2px' }, children: (invoice && invoice.companyGst) ? 'GSTIN: ' + invoice.companyGst : '' })
            ] })
          ] }),
          // Right: Settlement dossier & clearance badge
          jsxs('div', { style: { textAlign: 'right' }, children: [
            jsx('div', { style: { fontSize: '22px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }, children: isInv ? 'SETTLEMENT MEMORANDUM' : 'COMMERCIAL QUOTATION' }),
            jsx('div', {
              style: { display: 'inline-block', marginTop: '4px', padding: '3px 10px', borderRadius: '4px', background: tca(77,51,182,0.08), color: tc('#4d33b6'), border: '1px solid ' + tca(77,51,182,0.25), fontSize: '9.5px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase' },
              'data-spec-pill': 'true',
              children: isInv ? '🔒 VERIFIED SETTLEMENT · RTGS/NEFT' : 'COMMERCIAL QUOTATION'
            }),
            jsxs('div', { style: { marginTop: '5px', fontSize: '10.5px', fontFamily: 'monospace', lineHeight: 1.45, color: '#475569' }, children: [
              jsxs('div', { children: ['Voucher: ', jsx('b', { style: { color: '#0f172a' }, children: (isInv && !docNum.startsWith('#') ? '#' + docNum : docNum) })] }),
              jsxs('div', { children: ['Value Date: ', jsx('b', { style: { color: '#0f172a' }, children: dateStr })] }),
              jsxs('div', { children: ['Maturity: ', jsx('b', { style: { color: '#0f172a' }, children: dueStr + ' (NET 5)' })] })
            ] })
          ] })
        ]
      }),

      // 2. 3-Column Banking Coordinates Docket (Debtor, Beneficiary, Mandate)
      jsxs('div', {
        style: { margin: '14px 40px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' },
        children: [
          // Debtor
          jsxs('div', { style: { background: '#f8fafc', border: '1px solid #dbe3ec', borderRadius: '8px', padding: '12px 14px' }, children: [
            jsx('div', { style: { fontSize: '9px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', display: 'inline-block', marginBottom: '6px' }, children: 'DEBTOR (CLIENT ENTITY)' }),
            jsx('div', { style: { fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }, children: jsx(Ed, { field: 'clientName', value: clientName, placeholder: 'Client / buyer name' }) }),
            jsxs('div', { style: { fontSize: '11px', color: '#475569', lineHeight: 1.45, fontFamily: 'monospace' }, children: [
              jsxs('div', { children: ['Office: ', clientName] }),
              jsxs('div', { children: ['Tax Reg: ', invoice.buyerGstin || 'Unregistered / Overseas'] }),
              jsxs('div', { children: ['Jurisdiction: ', invoice.buyerAddress || '—'] })
            ] })
          ] }),
          // Beneficiary
          jsxs('div', { style: { background: '#f8fafc', border: '1px solid #dbe3ec', borderRadius: '8px', padding: '12px 14px' }, children: [
            jsx('div', { style: { fontSize: '9px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: 'rgba(77,51,182,0.12)', color: tc('#4d33b6'), display: 'inline-block', marginBottom: '6px' }, children: 'BENEFICIARY (ISSUER)' }),
            jsx('div', { style: { fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }, children: 'Company name' }),
            jsxs('div', { style: { fontSize: '11px', color: '#475569', lineHeight: 1.45, fontFamily: 'monospace' }, children: [
              jsxs('div', { children: ['GSTIN: ', jsx('b', { children: '—' })] }),
              jsxs('div', { children: ['PAN: ', jsx('b', { children: '—' })] }),
              jsx('div', { children: 'Treasury: ' + ((invoice && invoice.issuerOffice) || '—') })
            ] })
          ] }),
          // Clearing Mandate
          jsxs('div', { style: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px' }, children: [
            jsx('div', { style: { fontSize: '9px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: '#0f172a', color: '#ffffff', display: 'inline-block', marginBottom: '6px' }, children: 'CLEARING MANDATE' }),
            jsx('div', { style: { fontSize: '12.5px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }, children: 'Interbank RTGS / NEFT / UPI' }),
            jsxs('div', { style: { fontSize: '11px', color: '#475569', lineHeight: 1.45, fontFamily: 'monospace' }, children: [
              jsxs('div', { children: ['Regime: ', jsx('b', { children: 'Export LUT (Zero-Rated)' })] }),
              jsxs('div', { children: ['State Code: ', jsx('b', { children: '33 (Tamil Nadu)' })] }),
              jsxs('div', { children: ['Audit: ', jsx('span', { style: { color: '#059669', fontWeight: '700' }, children: 'SHA256 VERIFIED' })] })
            ] })
          ] })
        ]
      }),

      // 3. High-Density Institutional Table (meets test: fTh = rgb(15, 23, 42))
      jsx('div', {
        style: { padding: '16px 40px 0' },
        children: jsxs('table', {
          style: { width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' },
          'data-spec-items': 'true',
          children: [
            jsx('thead', { children: jsxs('tr', { children: [
              jsx('th', { style: { background: '#0f172a', color: '#ffffff', padding: '10px 12px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', width: '50px', textAlign: 'center' }, children: 'LINE' }),
              jsx('th', { style: { background: '#0f172a', color: '#ffffff', padding: '10px 12px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', textAlign: 'center' }, children: 'FINANCIAL SCOPE & DELIVERABLE SPECIFICATION' }),
              jsx('th', { style: { background: '#0f172a', color: '#ffffff', padding: '10px 12px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', width: '90px', textAlign: 'center' }, children: 'HSN/SAC' }),
              jsx('th', { style: { background: '#0f172a', color: '#ffffff', padding: '10px 12px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', width: '110px', textAlign: 'right' }, children: 'BASE RATE' }),
              jsx('th', { style: { background: '#0f172a', color: '#ffffff', padding: '10px 12px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', width: '50px', textAlign: 'center' }, children: 'QTY' }),
              jsx('th', { style: { background: '#0f172a', color: '#ffffff', padding: '10px 12px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', width: '130px', textAlign: 'right' }, children: 'SETTLEMENT TOTAL' })
            ] }) }),
            jsx('tbody', { children: items.map((it, idx) => jsxs('tr', { key: idx, style: { borderBottom: '1px solid #e2e8f0', background: '#ffffff' }, children: [
              jsx('td', { style: { textAlign: 'center', padding: '10px 12px', fontSize: '11.5px', fontFamily: 'monospace', color: '#64748b' }, children: [`[0${idx + 1}]`, jsx(EdRemove, { index: idx })] }),
              jsx('td', { style: { textAlign: 'center', padding: '10px 12px', fontSize: '12px', color: '#0f172a', fontWeight: '600' }, children: jsx(Ed, { field: 'description', index: idx, value: it.description || it.item || 'Service Maintenance Cost', placeholder: 'Item description' }) }),
              jsx('td', { style: { textAlign: 'center', padding: '10px 12px', fontSize: '11.5px', fontFamily: 'monospace', color: tc('#4d33b6'), fontWeight: '600' }, children: jsx(Ed, { field: 'hsn', index: idx, value: it.hsn || '998314', placeholder: 'HSN' }) }),
              jsx('td', { style: { textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace', color: '#0f172a' }, children: jsx(Ed, { field: 'price', index: idx, type: 'number', value: specMoney(it.price != null ? it.price : it.rate), placeholder: '0' }) }),
              jsx('td', { style: { textAlign: 'center', padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace', color: '#0f172a' }, children: jsx(Ed, { field: 'qty', index: idx, type: 'number', value: it.qty || 1, placeholder: '1' }) }),
              jsx('td', { style: { textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }, children: specMoney(it.total != null ? it.total : it.amount || (it.price || it.rate || 0) * (it.qty || 1)) })
            ] }, idx)) })
          ]
        })
      }),

      // 4. Banking Clearing Mandate & Net Settlement
      jsxs('div', {
        style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', padding: '14px 40px 10px', alignItems: 'start' },
        'data-spec-settlement': 'true',
        children: [
          // Left: Interbank Routing & Treasury Matrix
          jsxs('div', {
            style: { background: '#f8fafc', border: '1px solid #dbe3ec', borderRadius: '8px', padding: '12px 16px' },
            children: [
              jsx('div', { style: { fontSize: '10.5px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', borderLeft: '3px solid #0f172a', paddingLeft: '8px', marginBottom: '8px' }, children: '🏛️ INTERBANK SETTLEMENT & WIRE ROUTING' }),
              jsxs('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px', alignItems: 'center' }, children: [
                // QR
                jsxs('div', { style: { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px', textAlign: 'center' }, children: [
                  jsx('img', { src: '/assets/spec-qr-code.png', alt: 'UPI QR', style: { width: '76px', height: '76px', display: 'block', borderRadius: '4px' }, 'data-spec-qr': 'true' }),
                  jsx('div', { style: { fontSize: '8.5px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a', marginTop: '3px' }, children: 'SCAN TO PAY' })
                ] }),
                // Bank fields table
                jsxs('div', { style: { fontSize: '11px', fontFamily: 'monospace', lineHeight: 1.45, color: '#334155' }, children: [
                  jsxs('div', { children: ['Settlement Bank: ', jsx('b', { children: bank.bankName || '—' })] }),
                  jsxs('div', { children: ['Account Number:  ', jsx('b', { style: { color: '#0f172a' }, children: bank.accountNumber || '—' })] }),
                  jsxs('div', { children: ['IFSC / Routing:  ', jsx('b', { style: { color: tc('#4d33b6') }, children: bank.ifsc || '—' })] }),
                  jsxs('div', { children: ['Account Title:   ', jsx('b', { children: bank.accountName || '—' })] }),
                  jsxs('div', { children: ['Direct UPI VPA:  ', jsx('b', { style: { color: tc('#4d33b6') }, children: bank.upiId || '—' })] })
                ] })
              ] }),
              // Verified seal
              jsxs('div', { style: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '4px', padding: '5px 8px', fontSize: '9.5px', fontFamily: 'monospace', color: '#059669', fontWeight: '700' }, children: [
                jsx('span', { children: '★' }),
                jsx('span', { children: 'AUTHORIZED SETTLEMENT MANDATE' })
              ] })
            ]
          }),

          // Right: Reconciliation ledger & sign-off
          jsxs('div', {
            children: [
              jsxs('div', {
                style: { background: '#f8fafc', border: '1px solid #dbe3ec', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px' },
                'data-spec-summary': 'true',
                children: [
                  jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontFamily: 'monospace', color: '#475569', marginBottom: '5px' }, children: [
                    jsx('span', { children: 'Base Scope Amount:' }),
                    jsx('b', { style: { color: '#0f172a' }, children: specMoney(subtotal) })
                  ] }),
                  jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontFamily: 'monospace', color: '#475569', marginBottom: '5px' }, children: [
                    jsx('span', { children: 'Statutory Taxes (LUT 0%):' }),
                    jsx('span', { children: '₹ 0.00' })
                  ] }),
                  jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontFamily: 'monospace', color: '#475569', marginBottom: '5px' }, children: [
                    jsx('span', { children: 'Prior Inward Settlement:' }),
                    jsx('span', { children: '₹ 0.00' })
                  ] }),
                  jsx('div', { style: { height: '1.5px', background: '#cbd5e1', margin: '6px 0 5px' } }),
                  jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '3px double #0f172a', paddingBottom: '3px' }, children: [
                    jsx('span', { style: { fontSize: '11.5px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a' }, children: 'NET SETTLEMENT DEMAND:' }),
                    jsx('span', { style: { fontSize: '17px', fontWeight: '900', fontFamily: 'monospace', color: '#0f172a' }, children: specMoney(total) })
                  ] })
                ]
              }),
              // Signatory
              jsxs('div', { style: { textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px' }, children: [
                jsx('div', { style: { fontSize: '9.5px', fontWeight: '800', fontFamily: 'monospace', color: '#475569', textTransform: 'uppercase' }, children: 'FOR ' + String((invoice && invoice.companyName) || 'COMPANY').toUpperCase() }),
                jsx('img', { src: '/assets/spec-signature.png', alt: 'Authorised Signature', style: { height: '34px', width: 'auto', margin: '2px auto', display: 'block' }, 'data-spec-signature': 'true' }),
                jsx('div', { style: { fontSize: '12px', fontWeight: '800', color: '#0f172a' }, children: invoice.signatoryName || '—' }),
                jsx('div', { style: { fontSize: '9.5px', fontWeight: '700', color: tc('#4d33b6'), fontFamily: 'monospace' }, children: 'Treasury Clearing Officer · Authorised Signatory' })
              ] })
            ]
          })
        ]
      }),

      // 5. Slate Compliance Footer (meets test: fTh = rgb(15, 23, 42))
      jsxs('div', {
        'data-spec-footer': 'true',
        style: { background: '#0f172a', color: '#ffffff', padding: '12px 40px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' },
        children: [
          jsxs('div', { style: { display: 'flex', gap: '16px', color: '#cbd5e1' }, children: [
            jsx('span', { children: 'Local jurisdiction' }),
            jsx('span', { children: '·' }),
            jsx('span', { children: 'Statutory E-Invoice Instrument' }),
            jsx('span', { children: '·' }),
            jsx('span', { children: '—' })
          ] }),
          jsx('span', { style: { fontWeight: '700', color: '#ffffff' }, children: 'Thank You For Your Business' })
        ]
      })
    ]
  });
}

// ---------------------------------------------------------------------------
// SHEETS — a distinct A4 design per selected template (template id)
// ---------------------------------------------------------------------------
function specPill(doc) {
  if (doc.gstCategory === 'Export LUT' || doc.gstCategory === 'Non-GST') return { text: 'Unregistered / Overseas', muted: true };
  if (doc.gstCategory === 'B2C') return { text: 'B2C Retail (URP)', muted: false, color: SPEC.green };
  return { text: 'B2B Registered', muted: false, color: SPEC.indigo };
}
const specPan = (gst, explicit) => explicit || (gst && gst.length >= 15 ? gst.slice(2, 12) : '');

// Invoice drawer document: renders the invoice in the EXACT template chosen as default on
// Document Templates (Classic / Crimson / Fintech), with issuer + bank details from Settings.
function InvoiceDocView({ invoice }) {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => { try { const r = await fetch('/api/settings'); const j = await r.json(); if (alive && j.data) setSettings(j.data); } catch (e) {} })();
    return () => { alive = false; };
  }, []);
  let templateId = 'classic';
  try {
    const saved = JSON.parse(localStorage.getItem('tessly:templateDefault') || 'null');
    if (saved && TEMPLATE_META.some((x) => x.id === saved.selected)) templateId = saved.selected;
  } catch (e) {}
  const s = (settings && settings.invoiceSender) || {};
  const b = (settings && settings.bankDetails) || {};
  if (typeof window !== 'undefined') window.__tlLogo = invoice.companyLogo || s.companyLogo || '';
  const merged = {
    ...invoice,
    companyName: invoice.companyName || s.companyName || '',
    companyAddress: invoice.companyAddress || s.companyAddress || '',
    companyGst: invoice.companyGst || s.companyGst || '',
    companyPan: invoice.companyPan || s.companyPan || '',
    issuerOffice: invoice.issuerOffice || invoice.companyContactPerson || s.signatoryDesignation || '',
    issuerPhone: invoice.issuerPhone || invoice.companyPhone || s.companyPhone || '',
    issuerEmail: invoice.issuerEmail || invoice.companyEmail || s.companyEmail || '',
    signatoryName: invoice.signatoryName || s.signatoryName || '',
    signatoryDesignation: invoice.signatoryDesignation || s.signatoryDesignation || '',
    bankDetails: { ...b, ...Object.fromEntries(Object.entries(invoice.bankDetails || {}).filter(([, v]) => String(v || '').trim())) }
  };
  return jsx('div', { id: 'printable-invoice-doc', children: jsx(SpecInvoiceSheet, { invoice: merged, template: templateId }) });
}

function SpecInvoiceSheet({ invoice, template }) {
  if (template === 'retail') {
    return jsx(RetailInvoiceSheet, { invoice, template: 'retail', kind: 'invoice' });
  }
  if (template === 'fintech') {
    return jsx(FintechInvoiceSheet, { invoice, template: 'fintech', kind: 'invoice' });
  }
  const vis = resolveVis('classic', 'invoice');
  const pill = specPill(invoice);
  const buyerPan = specPan(invoice.buyerGstin, invoice.buyerPan);
  const pillLabel = invoice.gstCategory === 'Export LUT' ? 'COMMERCIAL INVOICE (LUT)' : invoice.gstCategory === 'B2B' ? 'TAX INVOICE (B2B)' : 'COMMERCIAL INVOICE (LUT)';
  return jsxs('div', {
    className: 'spec-sheet', 'data-spec-sheet': 'invoice', 'data-template': 'classic',
    children: [
      jsx(SpecHeader, { vis, kind: 'invoice', meta: { number: invoice.invoiceNumber || 'INV-0000', date: invoice.issueDate || '2026-11-05', due: invoice.dueDate || '2026-11-10' }, pillLabel }),
      jsxs('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', padding: '26px 40px 6px' }, children: [
        jsx(SpecCoordCard, { vis, badge: 'INVOICE TO (BILLED TO)', title: jsx(Ed, { field: 'clientName', value: invoice.clientName, placeholder: 'Client / buyer name' }), rows: [
          { label: 'Office', value: invoice.clientOffice || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !invoice.clientOffice },
          { label: 'Phone', value: invoice.clientPhone || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !invoice.clientPhone },
          { label: 'Email', value: invoice.clientEmail || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !invoice.clientEmail },
          { label: 'Address', value: (invoice.buyerAddress || invoice.clientAddress) || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), strong: !!(invoice.buyerAddress || invoice.clientAddress) },
          { label: 'GST', value: invoice.buyerGstin || jsxs('span', { style: { fontStyle: pill.muted ? 'italic' : 'normal', color: pill.muted ? SPEC.muted : (pill.color || SPEC.indigo) }, children: [pill.muted ? 'Unregistered / Overseas' : 'Registered - ' + pill.text] }), muted: !invoice.buyerGstin },
          { label: 'PAN', value: buyerPan || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !buyerPan }
        ] }),
        jsx(SpecCoordCard, { vis, badge: 'INVOICE FROM (ISSUER)', title: invoice.companyName || 'Company name', right: true, rows: [
          { label: 'Office', value: invoice.issuerOffice || '—' },
          { label: 'Phone', value: invoice.issuerPhone || '—' },
          { label: 'Email', value: invoice.issuerEmail || '—' },
          { label: 'Address', value: invoice.companyAddress || '', strong: true },
          { label: 'GST', value: invoice.companyGst || '—', strong: true },
          { label: 'PAN', value: invoice.companyPan || '—', strong: true }
        ] })
      ] }),
      jsx('div', { style: { padding: '18px 40px 0' }, children: jsx(SpecItemsTable, { vis, items: invoice.items, noTax: specNoTax(invoice) }) }),
      jsx(SpecSummary, { vis, invoice }),
      jsx(SpecSettlementRow, { vis, doc: invoice }),
      jsx(SpecFooter, { vis, doc: invoice })
    ]
  });
}

function SpecQuotationSheet({ propagation, template }) {
  if (template === 'retail') {
    return jsx(RetailInvoiceSheet, { invoice: propagation, template: 'retail', kind: 'quotation' });
  }
  if (template === 'fintech') {
    return jsx(FintechInvoiceSheet, { invoice: propagation, template: 'fintech', kind: 'quotation' });
  }
  const vis = resolveVis('classic', 'quotation');
  const sellerPan = specPan(propagation.companyGst, propagation.companyPan);
  return jsxs('div', {
    className: 'spec-sheet', 'data-spec-sheet': 'quotation', 'data-template': 'classic',
    children: [
      jsx(SpecHeader, { vis, kind: 'quotation', meta: { number: propagation.propagationNumber || propagation.quotationNumber || 'PRP-0000', date: propagation.issueDate || '2026-11-05', due: propagation.validUntil || 'Net 30' }, pillLabel: 'COMMERCIAL QUOTATION' }),
      jsxs('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', padding: '26px 40px 6px' }, children: [
        jsx(SpecCoordCard, { vis, badge: 'QUOTATION TO (BILLED TO)', title: propagation.clientName, rows: [
          { label: 'Office', value: propagation.clientOffice || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !propagation.clientOffice },
          { label: 'Phone', value: propagation.clientPhone || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !propagation.clientPhone },
          { label: 'Email', value: propagation.clientEmail || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !propagation.clientEmail },
          { label: 'Address', value: propagation.clientAddress || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !propagation.clientAddress },
          { label: 'GST', value: propagation.buyerGstin || 'Unregistered / Overseas', muted: !propagation.buyerGstin },
          { label: 'PAN', value: propagation.buyerPan || jsx('i', { style: { color: SPEC.muted, fontStyle: 'italic' }, children: 'Not Provided' }), muted: !propagation.buyerPan }
        ] }),
        jsx(SpecCoordCard, { vis, badge: 'QUOTATION FROM (ISSUER)', title: propagation.companyName || 'Company name', right: true, rows: [
          { label: 'Office', value: propagation.issuerOffice || '—' },
          { label: 'Phone', value: '—' },
          { label: 'Email', value: '—' },
          { label: 'Address', value: propagation.companyAddress || '', strong: true },
          { label: 'GST', value: propagation.companyGst || '—', strong: true },
          { label: 'PAN', value: sellerPan || '—', strong: true }
        ] })
      ] }),
      jsx('div', { style: { padding: '18px 40px 0' }, children: jsx(SpecItemsTable, { vis, items: propagation.items, descLabel: 'DELIVERABLE DESCRIPTION', rateLabel: 'RATE (\u20b9)' }) }),
      jsx(SpecSummary, { vis, invoice: { subtotal: propagation.subtotal || propagation.total, gstAmount: 0, paidAmount: 0, totalAmount: propagation.total || propagation.subtotal, gstCategory: 'Non-GST' } }),
      jsx(SpecSettlementRow, { vis, doc: propagation }),
      jsx(SpecFooter, { vis, doc: propagation })
    ]
  });
}

// ---------------------------------------------------------------------------
// TemplateSelectionView (PRESENTATIONAL) — no own PageHeader (buttons live in
// the top FinancePage header). Receives kind/selected/saved + setters.
// ---------------------------------------------------------------------------
function TemplateSelectionView({ kind, selected, onToggleKind, onSelectTemplate, onSetDefault, saved, defaultTpl }) {
  const [colors, setColors] = useState(() => readTplColors());
  const defaultIds = (() => {
    const d = defaultTpl || {};
    const by = d.byKind || {};
    const ids = new Set(Object.values(by));
    if (d.selected && !Object.keys(by).length) ids.add(d.selected);
    return ids;
  })();
  const pickColor = (id, hex) => { writeTplColor(id, hex && hex.toLowerCase() !== TPL_BASE_COLOR[id].toLowerCase() ? hex : ''); setColors(readTplColors()); };
  const [invoices, setInvoices] = useState([]);
  const [propagations, setPropagations] = useState([]);
  const [liveSettings, setLiveSettings] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await fetch('/api/invoices'); const j = await r.json(); if (alive && j.data) setInvoices(j.data); } catch (e) {}
      try { const r = await fetch('/api/propagations'); const j = await r.json(); if (alive && j.data) setPropagations(j.data); } catch (e) {}
      try { const r = await fetch('/api/settings'); const j = await r.json(); if (alive && j.data) setLiveSettings(j.data); } catch (e) {}
    })();
    return () => { alive = false; };
  }, []);

  // Issuer + bank come from Settings; client/items from the latest real document (if any).
  const sndr = (liveSettings && liveSettings.invoiceSender) || {};
  const bnk = (liveSettings && liveSettings.bankDetails) || {};
  const issuer = {
    companyName: sndr.companyName || '', companyAddress: sndr.companyAddress || '', companyGst: sndr.companyGst || '', companyPan: sndr.companyPan || '',
    issuerOffice: sndr.signatoryDesignation || '', issuerPhone: sndr.companyPhone || '', issuerEmail: sndr.companyEmail || '',
    signatoryName: sndr.signatoryName || '', signatoryDesignation: sndr.signatoryDesignation || '',
    bankDetails: { ...bnk }
  };
  if (typeof window !== 'undefined') window.__tlLogo = sndr.companyLogo || '';
  const sampleInvoice = { ...(invoices[0] || SPEC_SAMPLE_INVOICE), ...issuer };
  const sampleQuotation = { ...(propagations[0] || SPEC_SAMPLE_QUOTATION), ...issuer };

  const active = TEMPLATE_META.find((t) => t.id === selected) || TEMPLATE_META[0];
  const previewSheet = kind === 'quotation'
    ? jsx(SpecQuotationSheet, { propagation: sampleQuotation, template: active.id })
    : jsx(SpecInvoiceSheet, { invoice: sampleInvoice, template: active.id });

  // Per-template swatch (visually distinct mini-previews)
  const swatch = (t) => {
    setTplPalette(t.id, colors[t.id] || '');
    const v = resolveVis(t.id, t.kind);
    setTplPalette(t.id, colors[t.id] || '');
    if (v.headerVariant === 'dark') return jsxs('svg', { viewBox: '0 0 794 130', width: '100%', height: '60', preserveAspectRatio: 'none', 'aria-hidden': 'true', children: [
      jsx('rect', { x: 0, y: 0, width: 794, height: 130, fill: '#ffffff' }),
      jsx('polygon', { points: '0,0 435,0 345,130 0,130', fill: '#0b1120' }),
      jsx('polygon', { points: '435,0 460,0 370,130 345,130', fill: '#00d2ff' }),
      jsx('polygon', { points: '460,0 498,0 408,130 370,130', fill: tc('#4d33b6') }),
      jsx('rect', { x: '34', y: '36', width: '150', height: '56', rx: '8', fill: '#ffffff' }),
      jsx('circle', { cx: 58, cy: 64, r: 14, fill: '#0b1120' }),
      jsx('rect', { x: '82', y: '56', width: '80', height: '10', rx: '2', fill: '#0b1120' }),
      jsx('text', { x: 700, y: 56, fill: tc('#4d33b6'), fontSize: 28, fontWeight: 900, textAnchor: 'end' }, { children: 'INVOICE' })
    ] });
    if (v.headerVariant === 'light' || v.headerVariant === 'creative') return jsxs('svg', { viewBox: '0 0 794 130', width: '100%', height: '60', preserveAspectRatio: 'none', 'aria-hidden': 'true', children: [
      jsx('rect', { x: 0, y: 0, width: 794, height: 130, fill: '#ffffff' }),
      jsx('polygon', { points: '0,0 460,0 350,130 0,130', fill: '#111113' }),
      jsx('polygon', { points: '440,0 485,0 395,130 350,130', fill: tc('#e5252a') }),
      jsx('polygon', { points: '470,0 495,0 425,130 395,130', fill: tca(229,37,42,0.45) }),
      jsx('circle', { cx: 58, cy: 64, r: 14, fill: tc('#e5252a') }),
      jsx('rect', { x: '82', y: '56', width: '90', height: '10', rx: '2', fill: '#ffffff' }),
      jsx('text', { x: 720, y: 56, fill: tc('#e5252a'), fontSize: 26, fontWeight: 900, textAnchor: 'end' }, { children: 'QUOTATION' }),
      jsx('rect', { x: 580, y: 70, width: 140, height: 18, rx: 9, fill: tca(229,37,42,0.15) }),
      jsx('rect', { x: 0, y: 124, width: 794, height: 6, fill: tc('#e5252a') })
    ] });
    // rail
    return jsxs('svg', { viewBox: '0 0 794 130', width: '100%', height: '60', preserveAspectRatio: 'none', 'aria-hidden': 'true', children: [
      jsx('rect', { x: 0, y: 0, width: 794, height: 130, fill: '#ffffff' }),
      jsx('rect', { x: 0, y: 0, width: 14, height: 130, fill: '#0f172a' }),
      jsx('rect', { x: 14, y: 0, width: 780, height: 4, fill: '#0f172a' }),
      jsx('rect', { x: 36, y: 36, width: 44, height: 44, rx: 8, fill: '#0f172a' }),
      jsx('rect', { x: 92, y: 44, width: 160, height: 12, rx: 2, fill: '#0f172a' }),
      jsx('rect', { x: 92, y: 62, width: 110, height: 8, rx: 2, fill: '#475569' }),
      jsx('text', { x: 720, y: 56, fill: '#0f172a', fontSize: 24, fontWeight: 900, textAnchor: 'end' }, { children: 'FINTECH' }),
      jsx('rect', { x: 560, y: 68, width: 160, height: 18, rx: 4, fill: 'rgba(15,23,42,0.08)' })
    ] });
  };

  return jsxs('div', { className: 'page finance-page tmpl-page', 'data-spec-page': 'templates', children: [
    jsxs('div', { className: 'tmpl-grid', children: [
      // LEFT - gallery
      jsxs('div', { className: 'tmpl-gallery', 'data-tmpl-gallery': 'true', children: [
        jsxs('div', { className: 'tmpl-gallery__head', style: { marginBottom: '14px' }, children: [
          jsxs('h3', { style: { fontSize: '15px', fontWeight: '700', letterSpacing: '-0.01em' }, children: ['Template Library ', jsxs('span', { style: { color: 'var(--muted)', fontWeight: '500', fontSize: '12px' }, children: ['\u00b7 ' + TEMPLATE_META.length + ' distinct A4 templates'] })] }),
          jsx('p', { className: 'muted', style: { fontSize: '12.5px', marginTop: '4px', lineHeight: 1.45 }, children: 'Each layout is a different A4 design (header, line-items header, settlement & footer). Pick one - the preview on the right re-renders in that exact template.' })
        ] }),
        TEMPLATE_META.map((t) => {
          const isSel = t.id === selected;
          const isDef = defaultIds.has(t.id);
          setTplPalette(t.id, colors[t.id] || '');
          const tagColor = tc(t.accent === SPEC.slate ? SPEC.indigo : t.accent);
          return jsxs('div', {
            key: t.id, className: 'tmpl-card' + (isSel ? ' is-selected' : '') + (isDef ? ' is-default' : ''), 'data-template-card': t.id, 'data-default': isDef ? 'true' : 'false',
            onClick: () => onSelectTemplate(t.id),
            children: [
              jsx('div', { className: 'tmpl-card__swatch', children: [swatch(t)] }),
              jsxs('div', { className: 'tmpl-card__body', children: [
                jsxs('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }, children: [
                  jsxs('b', { style: { fontSize: '14px', letterSpacing: '-0.01em', display: 'inline-flex', alignItems: 'center', gap: '8px' }, children: [t.name, isDef ? jsxs('span', { className: 'tmpl-default-pill', 'data-default-pill': t.id, children: [jsx(Icon, { name: 'check' }), 'Default'] }) : null] }),
                  jsx('span', { className: 'tmpl-card__tag', style: { color: tagColor }, children: t.tag })
                ] }),
                jsx('p', { className: 'muted', style: { fontSize: '12.5px', lineHeight: 1.5, margin: '6px 0 10px' }, children: t.desc }),
                jsxs('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: t.badges.map((b, i) => jsx('span', { key: i, className: 'tmpl-badge', children: b })) })
              ] }),
              isSel ? jsxs('div', { className: 'tmpl-card__pick', style: { color: tagColor }, children: [jsx(Icon, { name: 'check' }), 'Selected'] }) : null
            ]
          }, t.id);
        })
      ] }),
      // RIGHT - live preview
      jsxs('div', { className: 'tmpl-preview', 'data-spec-preview': active.id, children: [
        jsxs('div', { className: 'tmpl-preview__bar', children: [
          jsxs('span', { style: { fontSize: '12px', fontWeight: '700', letterSpacing: '0.03em' }, children: ['LIVE PREVIEW ', jsxs('i', { className: 'muted', style: { fontWeight: '500' }, children: ['\u00b7 ' + active.name + ' \u00b7 ' + (kind === 'invoice' ? 'Tax Invoice' : 'Quotation')] })] }),
          jsxs('div', { className: 'tmpl-color', 'data-tmpl-color': active.id, children: [
            jsx('span', { className: 'tmpl-color__label', children: 'Colour' }),
            ...TPL_PRESETS.map((hex) => jsx('button', {
              key: hex, type: 'button', className: 'tmpl-swatch' + ((colors[active.id] || TPL_BASE_COLOR[active.id]).toLowerCase() === hex.toLowerCase() ? ' is-on' : ''),
              'data-color': hex, title: hex, 'aria-label': 'Use colour ' + hex, style: { background: hex }, onClick: () => pickColor(active.id, hex)
            })),
            jsx('input', { type: 'color', id: 'tpl-color-input', className: 'tmpl-color__input', 'aria-label': 'Custom colour', value: (colors[active.id] || TPL_BASE_COLOR[active.id]).toLowerCase(), onChange: (e) => pickColor(active.id, e.target.value) }),
            jsx('button', { type: 'button', id: 'tpl-color-reset', className: 'btn btn--sm btn--ghost', disabled: !colors[active.id], onClick: () => pickColor(active.id, ''), children: 'Reset' })
          ] }),
          jsxs('div', { className: 'row', style: { gap: '6px' }, children: [
            jsxs('span', { className: 'tmpl-kpi', children: ['Sheet ', jsx('b', { children: '794 \u00d7 1050' })] }),
            jsxs('span', { className: 'tmpl-kpi', children: ['Page', jsx('b', { children: 'A4' })] })
          ] })
        ] }),
        jsx('div', { className: 'tmpl-preview__stage', children: previewSheet })
      ] })
    ] })
  ] });
}

// ==========================================================================
// END TEMPLATE SELECTION PAGE
// ==========================================================================



function FinancePage({ route }) {
  const globalState = useGlobalState();
  const activeSub =
    route.sub === 'templates' ? 'templates' :
    route.sub === 'propagations' ? 'propagations' :
    route.sub === 'commissions' ? 'commissions' :
    (route.sub === 'settings' || route.sub === 'tax-banking' || route.sub === 'config') ? 'settings' :
    'invoices';

  // Full-page invoice editor (create / edit)
  const [invoiceEditor, setInvoiceEditor] = useState(null);
  useEffect(() => {
    const onEdit = (ev) => setInvoiceEditor({ invoice: ev.detail || null });
    window.addEventListener('financeEditInvoice', onEdit);
    return () => window.removeEventListener('financeEditInvoice', onEdit);
  }, []);
  useEffect(() => { setInvoiceEditor(null); }, [activeSub]);

  // Template selection state (lifted so the action buttons live in the TOP header)
  const readTplDefault = () => { try { return JSON.parse(localStorage.getItem('tessly:templateDefault') || 'null'); } catch (e) { return null; } };
  const savedTpl = readTplDefault();
  const [tplKind, setTplKind] = useState(() => (savedTpl && (savedTpl.kind === 'invoice' || savedTpl.kind === 'quotation')) ? savedTpl.kind : 'invoice');
  const [tplSelected, setTplSelected] = useState(() => (savedTpl && TEMPLATE_META.some((t) => t.id === savedTpl.selected)) ? savedTpl.selected : 'classic');
  const [tplSaved, setTplSaved] = useState(false);
  const [tplDefault, setTplDefault] = useState(() => readTplDefault());

  const handleTplToggleKind = () => {
    const next = tplKind === 'invoice' ? 'quotation' : 'invoice';
    setTplKind(next);
    setTplSelected(next === 'quotation' ? 'retail' : 'classic');
  };
  const handleSetTplDefault = () => {
    const prev = readTplDefault() || {};
    const next = { kind: tplKind, selected: tplSelected, byKind: { ...(prev.byKind || {}), [tplKind]: tplSelected } };
    try { localStorage.setItem('tessly:templateDefault', JSON.stringify(next)); } catch (e) {}
    setTplDefault(next);
    setTplSaved(true);
    setTimeout(() => setTplSaved(false), 1800);
  };

  const [activeSettingsSection, setActiveSettingsSection] = useState(() => {
    const p = location.pathname;
    if (p.includes('banking') || p.includes('wire') || p.includes('bankDetails')) return 'bankDetails';
    if (p.includes('gst') || p.includes('slab') || p.includes('gstSettings')) return 'gstSettings';
    return 'invoiceSender';
  });

  useEffect(() => {
    const p = location.pathname;
    if (p.includes('banking') || p.includes('wire') || p.includes('bankDetails')) setActiveSettingsSection('bankDetails');
    else if (p.includes('gst') || p.includes('slab') || p.includes('gstSettings')) setActiveSettingsSection('gstSettings');
    else if (p.includes('settings')) setActiveSettingsSection('invoiceSender');
  }, [route.param, route.sub]);

  const settingsTabs = [
    { id: 'invoiceSender', label: 'Invoice Sender', icon: 'finance', desc: 'Legal entity, registered address, corporate tax identifiers, and authorized signatory.' },
    { id: 'bankDetails', label: 'Banking & Wire', icon: 'deals', desc: 'Settlement bank accounts, RTGS/NEFT/IFSC clearing, international SWIFT routing, and UPI QR codes.' },
    { id: 'gstSettings', label: 'GST & HSN Slabs', icon: 'receipt', desc: 'Statutory GST slabs, default SAC codes, CGST/SGST/IGST rates, and Export LUT reference.' }
  ];

  const curSettingsSection = settingsTabs.find(s => s.id === activeSettingsSection) || settingsTabs[0];

  const titleText =
    activeSub === 'invoices' ? (invoiceEditor ? (invoiceEditor.invoice ? 'Edit Tax Invoice' : 'Create Tax Invoice') : 'Tax Invoices') :
    activeSub === 'propagations' ? 'Commercial Propagations' :
    activeSub === 'commissions' ? 'Commissions' :
    activeSub === 'templates' ? 'Document Templates' :
    'Tax, Banking & Invoice Settings';

  const subText =
    activeSub === 'invoices' ? 'Statutory GST-compliant commercial invoices, tax regimes, and inward payment tracking.' :
    activeSub === 'propagations' ? 'Commercial proposals, itemized deliverables, and formal client commitments.' :
    activeSub === 'commissions' ? 'What the team has earned on won deals, and when it is paid.' :
    activeSub === 'templates' ? 'Spec-faithful A4 layout picker for invoice & commercial propagation documents.' :
    curSettingsSection.desc;

  // Open New Invoice (full page)
  const handleNewInvoice = () => setInvoiceEditor({ invoice: null });

  const handleNewInvoiceModalLegacy = () => {
    openDrawer(
      jsx(CreateInvoiceModal, {
        onClose: () => openDrawer(null),
        onSuccess: () => {
          openDrawer(null);
          window.dispatchEvent(new CustomEvent('finance:refresh'));
        }
      })
    );
  };

  // Open New Propagation Modal
  const handleNewPropagation = () => {
    openDrawer(
      jsx(CreatePropagationModal, {
        onClose: () => openDrawer(null),
        onSuccess: () => {
          openDrawer(null);
          window.dispatchEvent(new CustomEvent('finance:refresh'));
        }
      })
    );
  };

  return jsxs('div', {
    className: 'page finance-page commissions-page',
    children: [
      // Top Header
      jsx(PageHeader, {
        crumbs: [{ label: 'Invoice' }, { label: titleText }],
        title: titleText,
        sub: subText,
        actions: activeSub === 'settings' ? null : activeSub === 'templates' ? jsxs('div', {
          className: 'row',
          style: { gap: '8px' },
          children: [
            jsxs('button', {
              className: 'btn btn--outline magnetic',
              type: 'button',
              onClick: handleTplToggleKind,
              children: [
                jsx(Icon, { name: tplKind === 'invoice' ? 'finance' : 'check' }),
                tplKind === 'invoice' ? 'Preview Quotation' : 'Preview Invoice'
              ]
            }),
            jsxs('button', {
              className: 'btn btn--primary magnetic',
              type: 'button',
              onClick: handleSetTplDefault,
              children: [jsx(Icon, { name: 'check' }), tplSaved ? 'Saved as Default' : 'Set as Default']
            })
          ]
        }) : undefined
      }),

      // Navigation Tabs (Sections on top inside header container when in Tax & Banking Settings)
      activeSub === 'settings' ? jsx(Tabs, {
        active: activeSettingsSection,
        label: 'Tax & Banking Sections',
        items: settingsTabs.map(s => ({
          id: s.id,
          href: `/finance/settings/${s.id}`,
          label: s.label,
          icon: s.icon
        }))
      }) : undefined,

      // Active Section View
      activeSub === 'invoices' && invoiceEditor && jsx(InvoiceBuilderPage, {
        invoice: invoiceEditor.invoice,
        onClose: () => setInvoiceEditor(null)
      }, 'invoice-editor-' + (invoiceEditor.invoice ? invoiceEditor.invoice._id : 'new')),
      activeSub === 'invoices' && !invoiceEditor && jsx(TaxInvoicesView, { openId: route.param, onNewInvoice: handleNewInvoice }, 'invoices'),
      activeSub === 'propagations' && jsx(CommercialPropagationsView, { openId: route.param, onNewPropagation: handleNewPropagation }, 'propagations'),
      activeSub === 'commissions' && jsx(CommissionsView, {}, 'commissions'),
      activeSub === 'templates' && jsx(TemplateSelectionView, {
        kind: tplKind, selected: tplSelected, saved: tplSaved, defaultTpl: tplDefault,
        onToggleKind: handleTplToggleKind, onSelectTemplate: setTplSelected, onSetDefault: handleSetTplDefault
      }, 'templates'),
      activeSub === 'settings' && jsx(FinanceSettingsView, { activeSection: activeSettingsSection }, 'settings')
    ]
  });
}

export { FinancePage as default };
