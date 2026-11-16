/**
 * Tessly CRM — Accounts & Finance module.
 *
 * One ES module that renders the Accounts page that matches `route.sub`.
 * Every page shares the same shell: the shared `PageHeader` immediately
 * followed by the shared `Tabs` section bar, so the global
 * `.phead + .tabs` / `.phead:has(+ .tabs)` rules merge the header and the
 * section navigation into a single card (same DOM order as the HR module in
 * `assets/hr-Hr7xK2mQ.js`).
 *
 * House style follows `assets/hr-Hr7xK2mQ.js`:
 *   `.kpis` / `.kpi` stat cards, `.table-wrap` + `.table table--stack`
 *   tables, `.form-grid` + `.field` + `.input` / `.select` forms,
 *   `toast(...)` notifications and a local `apiFetch` helper that degrades
 *   to an empty state when the accounts API is offline.
 *
 * The shared bundle exposes React's *automatic* runtime, where the third
 * argument of jsx()/jsxs() is a KEY rather than children. Every call site in
 * this file therefore passes children inside `props.children` and never as a
 * third argument.
 *
 * All money and every computed accounting value comes from the server. The
 * client only ever *previews* a value (grand total, balance due, book
 * value), exactly as allowed by the API contract.
 */

import {
  a as NumberMorph,
  D as toast,
  Ft as ReactHooks,
  S as confirmModal,
  b as closeDrawer,
  c as EmptyState,
  ct as formatDateFull,
  g as SearchInput,
  h as StatusPill,
  i as CheckboxToggle,
  o as Delta,
  lt as formatLongDate,
  m as PageHeader,
  mt as formatNumber,
  r as Card,
  s as ModalDrawer,
  vt as Icon,
  w as openDrawer,
  y as Tabs,
  yt as jsxRuntime
} from './ui-D4_WaMI9.js';
import { t as LineAreaChart, i as Sparkline } from './charts-rP94NVff.js';
import { usePaged } from './pager.js';

const { useState, useEffect, useMemo, useRef } = ReactHooks();
const { jsx, jsxs, Fragment } = jsxRuntime();

/**
 * Attach children to a props object.
 *
 * The shared bundle exposes React's *automatic* runtime, where the third
 * argument of jsx()/jsxs() is a KEY and never children. `withChildren` keeps
 * every call site at two arguments by folding the children into the props
 * object, which is what the runtime actually reads.
 */
const withChildren = (props, children) => ({ ...props, children });

/* ------------------------------------------------------------------ *
 * Attachment Helpers & Components (Images & PDFs)
 * ------------------------------------------------------------------ */

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const fmtBytes = (n) => {
  const bytes = Number(n) || 0;
  return bytes >= 1048576
    ? (bytes / 1048576).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';
};

const dataUrlToBlobUrl = (dataUrl) => {
  try {
    const [head, b64] = String(dataUrl).split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const bin = atob(b64 || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: mime }));
  } catch (e) {
    return dataUrl;
  }
};

const downloadDataUrl = (dataUrl, name) => {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrlToBlobUrl(dataUrl);
  link.download = name || 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

function AcctAttachmentsField({ attachments = [], onChange, label = 'Attachments (Images & PDFs)' }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    const newItems = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isImg = /^image\//.test(file.type) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isImg && !isPdf) {
        toast(`"${file.name}" must be an image or PDF`, { icon: 'x' });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast(`"${file.name}" exceeds 10 MB limit`, { icon: 'x' });
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const ext = (file.name.split('.').pop() || 'FILE').toUpperCase();
        newItems.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          type: isPdf ? 'PDF' : ext,
          size: fmtBytes(file.size),
          uploadedAt: new Date().toISOString().slice(0, 10),
          data: dataUrl
        });
      } catch (err) {
        toast(`Failed to read "${file.name}"`, { icon: 'x' });
      }
    }
    if (newItems.length > 0) {
      onChange([...(attachments || []), ...newItems]);
      toast(`Added ${newItems.length} file${newItems.length === 1 ? '' : 's'}`, { icon: 'check' });
    }
  };

  const removeAt = (index) => {
    const next = (attachments || []).filter((_, i) => i !== index);
    onChange(next);
  };

  return jsxs('div', {
    className: 'acct-attach-field span-2',
    children: [
      jsxs('div', {
        className: 'acct-attach-header',
        children: [
          jsx('label', { className: 'acct-attach-label', children: label }),
          attachments && attachments.length > 0
            ? jsx('span', { className: 'acct-attach-count', children: `${attachments.length} attached` })
            : null
        ]
      }),
      jsxs('div', {
        className: `acct-dropzone ${dragOver ? 'is-dragover' : ''}`,
        onDragOver: (e) => { e.preventDefault(); setDragOver(true); },
        onDragLeave: () => setDragOver(false),
        onDrop: (e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        },
        onClick: () => fileInputRef.current && fileInputRef.current.click(),
        children: [
          jsx('input', {
            type: 'file',
            ref: fileInputRef,
            multiple: true,
            accept: 'image/*,application/pdf,.pdf',
            style: { display: 'none' },
            onChange: (e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }
          }),
          jsx('span', { className: 'acct-dropzone-icon', children: jsx(Icon, { name: 'upload' }) }),
          jsxs('div', {
            className: 'acct-dropzone-text',
            children: [
              jsx('b', { children: 'Click to upload or drag & drop files' }),
              jsx('span', { children: 'Upload multiple receipts, invoices or slips (PNG, JPG, PDF up to 10 MB)' })
            ]
          }),
          jsx('button', {
            type: 'button',
            className: 'btn btn--sm btn--ghost',
            onClick: (e) => {
              e.stopPropagation();
              fileInputRef.current && fileInputRef.current.click();
            },
            children: [jsx(Icon, { name: 'plus' }), 'Choose files']
          })
        ]
      }),
      attachments && attachments.length > 0
        ? jsx('div', {
            className: 'acct-file-list',
            children: attachments.map((att, idx) =>
              jsxs('div', {
                className: 'acct-file-item',
                key: att.id || `att-${idx}`,
                children: [
                  jsx('span', {
                    className: `acct-file-badge ${att.type === 'PDF' ? 'badge--pdf' : 'badge--img'}`,
                    children: att.type || 'FILE'
                  }),
                  jsxs('div', {
                    className: 'acct-file-info',
                    children: [
                      jsx('span', { className: 'acct-file-name', title: att.name, children: att.name }),
                      jsx('span', { className: 'acct-file-meta', children: `${att.size || ''} · ${att.uploadedAt || ''}` })
                    ]
                  }),
                  jsxs('div', {
                    className: 'acct-file-actions',
                    children: [
                      jsx('button', {
                        type: 'button',
                        className: 'btn btn--xs btn--ghost',
                        title: 'Download / View',
                        onClick: (e) => {
                          e.stopPropagation();
                          downloadDataUrl(att.data, att.name);
                        },
                        children: jsx(Icon, { name: 'download' })
                      }),
                      jsx('button', {
                        type: 'button',
                        className: 'btn btn--xs btn--ghost acct-btn-remove',
                        title: 'Remove file',
                        onClick: (e) => {
                          e.stopPropagation();
                          removeAt(idx);
                        },
                        children: jsx(Icon, { name: 'trash' })
                      })
                    ]
                  })
                ]
              })
            )
          })
        : null
    ]
  });
}

function AcctAttachmentsView({ attachments = [] }) {
  if (!attachments || !attachments.length) return null;
  return jsxs('div', {
    className: 'acct-view-attachments',
    children: [
      jsx('h4', {
        style: { margin: '14px 2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' },
        children: `Attached Documents (${attachments.length})`
      }),
      jsx('div', {
        className: 'acct-file-list',
        children: attachments.map((att, idx) =>
          jsxs('div', {
            className: 'acct-file-item',
            key: att.id || `view-att-${idx}`,
            children: [
              jsx('span', {
                className: `acct-file-badge ${att.type === 'PDF' ? 'badge--pdf' : 'badge--img'}`,
                children: att.type || 'FILE'
              }),
              jsxs('div', {
                className: 'acct-file-info',
                children: [
                  jsx('span', { className: 'acct-file-name', title: att.name, children: att.name }),
                  jsx('span', { className: 'acct-file-meta', children: `${att.size || ''} · ${att.uploadedAt || ''}` })
                ]
              }),
              jsx('button', {
                type: 'button',
                className: 'btn btn--xs btn--primary',
                title: 'Download / View',
                onClick: () => downloadDataUrl(att.data, att.name),
                children: [jsx(Icon, { name: 'download' }), 'Download']
              })
            ]
          })
        )
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Module registry
 * ------------------------------------------------------------------ */

const ACCOUNT_MODULES = [
  { id: 'dashboard', label: 'Overview', href: '/accounts/dashboard', icon: 'finance' },
  { id: 'sales', label: 'Inward', href: '/accounts/sales', icon: 'receipt' },
  { id: 'expenses', label: 'Expenses', href: '/accounts/expenses', icon: 'card' },
  { id: 'expense-categories', label: 'Expense Categories', href: '/accounts/expense-categories', icon: 'tag' },
  { id: 'inward-expenses', label: 'Inward & Expenses', href: '/accounts/inward-expenses', icon: 'archive' },
  { id: 'emi', label: 'EMI', href: '/accounts/emi', icon: 'calendar' },
  { id: 'credit-notes', label: 'Credit Notes', href: '/accounts/credit-notes', icon: 'layers' },
  { id: 'assets', label: 'Asset Records', href: '/accounts/assets', icon: 'building' },
  { id: 'asset-categories', label: 'Asset Categories', href: '/accounts/asset-categories', icon: 'library' },
  { id: 'adjustment-entry', label: 'Adjustment Entry', href: '/accounts/adjustment-entry', icon: 'note' },
  { id: 'reports', label: 'Financial Reports', href: '/accounts/reports', icon: 'reports' }
];

const ACCOUNT_PAGES = {
  dashboard: {
    title: 'Accounts Overview',
    sub: 'Every rupee that moved through the ledger — inward, spend, cash and profit in one view.'
  },
  sales: {
    title: 'Inward & Invoicing',
    sub: 'Raise invoices, collect payments and watch receivables age against the ledger.'
  },
  expenses: {
    title: 'Expenses',
    sub: 'Operating spend by head, category and branch, posted straight to the general ledger.'
  },
  'expense-categories': {
    title: 'Expense Categories',
    sub: 'The expense catalogue — each head maps to a chart-of-accounts code.'
  },
  'inward-expenses': {
    title: 'Inward & Expenses',
    sub: 'Stock inward on the left, expenses on the right, and the overall calculation underneath.'
  },
  emi: {
    title: 'EMI',
    sub: 'Product-wise EMI plans — monthly EMI, end date and balance are calculated automatically.'
  },
  'credit-notes': {
    title: 'Credit Notes',
    sub: 'Returns, refunds and credits applied against an open invoice.'
  },
  assets: {
    title: 'Asset Records',
    sub: 'Fixed assets with their depreciation schedule and current book value.'
  },
  'asset-categories': {
    title: 'Asset Categories',
    sub: 'The asset catalogue — equipment, electronics, furniture and the rest.'
  },
  'adjustment-entry': {
    title: 'Adjustment Entry',
    sub: 'Manual double-entry vouchers for anything the operational modules cannot post.'
  },
  reports: {
    title: 'Financial Reports',
    sub: 'Balance sheet, profit and loss, trial balance and the general ledger book.'
  }
};

const DEFAULT_SUB = 'dashboard';

/* ------------------------------------------------------------------ *
 * Domain constants (mirrors of the backend enums)
 * ------------------------------------------------------------------ */

const SALES_STATUSES = ['Draft', 'Approved', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];
const SALES_PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 60', 'Due on Receipt'];
const SALES_PAYMENT_MODES = ['Cash', 'Card', 'Bank Transfer', 'UPI', 'Cheque'];

const EXPENSE_PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'UPI'];

const EMI_CATEGORIES = ['Gym Equipment', 'IT & Electronics', 'Appliances', 'Furniture & Fixtures', 'Vehicles', 'Software & Licences', 'Other'];
const EMI_STATUSES = ['Active', 'Overdue', 'Completed'];

const CREDIT_REASONS = [
  'Customer Return',
  'Billing Adjustment',
  'Service Dissatisfaction',
  'Goodwill Discount',
  'Package Downgrade',
  'Overcharge Correction',
  'Other'
];
const SETTLEMENT_METHODS = ['Apply to Invoice', 'Direct Refund', 'Store Credit'];
const CREDIT_STATUSES = ['Draft', 'Approved', 'Applied', 'Refunded', 'Cancelled'];

const ASSET_STATUSES = ['Pending', 'Active', 'Under Maintenance', 'Transferred', 'Disposed', 'Sold'];
const ASSET_PAYMENT_TYPES = ['Single', 'Split Payment'];
const DEPRECIATION_METHODS = ['Straight Line', 'Reducing Balance'];

const JV_ENTRY_TYPES = [
  'Journal Voucher',
  'Adjustment',
  'Depreciation',
  'Correction',
  'Accrual',
  'Provision',
  'Bad Debt',
  'Tax Adjustment',
  'Opening Balance',
  'Other'
];
const JV_STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Posted', 'Rejected', 'Reversed'];

const TRANSFER_TYPES = ['Bank to Bank', 'Cash to Bank', 'Bank to Cash'];

/* ------------------------------------------------------------------ *
 * API + formatting helpers
 * ------------------------------------------------------------------ */

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const fmtINR = (val) => '₹ ' + Number(val || 0).toLocaleString('en-IN');
const fmtAxisINR = (val) => {
  const n = Math.abs(Number(val || 0));
  const sign = Number(val || 0) < 0 ? '-' : '';
  if (n >= 10000000) return `${sign}₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${sign}₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${sign}₹${Math.round(n / 1000)}k`;
  return `${sign}₹${Math.round(n)}`;
};
const fmtCount = (val) => formatNumber(Number(val || 0));
const asText = (val) => (val === undefined || val === null || val === '' ? '—' : String(val));
const fullDate = (val) => (val ? formatDateFull(String(val).slice(0, 10)) : '—');
const shortDate = (val) => (val ? formatLongDate(String(val).slice(0, 10)) : '—');
const toNum = (val) => (val === '' || val === undefined || val === null ? 0 : Number(val));
const todayISO = () => new Date().toISOString().slice(0, 10);

const TONE_BY_STATUS = {
  Active: 'good',
  Approved: 'good',
  Applied: 'good',
  Completed: 'good',
  Paid: 'good',
  Posted: 'good',
  Refunded: 'good',
  Received: 'good',
  Sent: 'info',
  'Under Maintenance': 'info',
  'Checking / Current': 'info',
  Savings: 'info',
  'Merchant POS Terminal': 'info',
  Draft: 'warn',
  Pending: 'warn',
  'Pending Approval': 'warn',
  'Partially Paid': 'warn',
  'Unpaid Credit': 'warn',
  Reversed: 'warn',
  Transferred: 'warn',
  Overdue: 'bad',
  Rejected: 'bad',
  Cancelled: 'bad',
  Disposed: 'bad',
  Sold: 'bad'
};

const toneFor = (value) => TONE_BY_STATUS[value] || '';

const matchesQuery = (row, query, fields) => {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => String(row[f] ?? '').toLowerCase().includes(q));
};

/** Colour cycle for the expense donut — theme tokens only, never hex. */
const DONUT_COLORS = [
  'var(--cobalt)',
  'var(--teal)',
  'var(--amber)',
  'var(--sky)',
  'var(--good)',
  'var(--slate)',
  'var(--warn)',
  'var(--primary)',
  'var(--citron)',
  'var(--bad)'
];

const donutGradient = (mix) => {
  const total = mix.reduce((s, m) => s + Math.max(0, Number(m.amount || 0)), 0);
  if (!total) return 'conic-gradient(var(--line) 0 100%)';
  let acc = 0;
  const stops = mix.map((m, i) => {
    const share = (Math.max(0, Number(m.amount || 0)) / total) * 100;
    const from = acc;
    acc += share;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${from.toFixed(2)}% ${acc.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
};

/* ------------------------------------------------------------------ *
 * Data hooks
 * ------------------------------------------------------------------ */

/**
 * Fetch one accounts endpoint and keep the envelope's `data` + `kpis`.
 * Degrades to an empty state when the API is offline.
 */
function useApi(url) {
  const [data, setData] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    setLoading(true);
    apiFetch(url).then((res) => {
      if (!alive) return;
      const payload = res.data || {};
      if (res.ok && payload.success) {
        setData(payload.data === undefined ? null : payload.data);
        setKpis(payload.kpis || null);
        setError('');
      } else {
        setData(null);
        setKpis(null);
        setError(payload.message || res.error || 'The accounts service is not reachable right now.');
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [url, tick]);

  const reload = () => setTick((n) => n + 1);
  return { data, rows: Array.isArray(data) ? data : [], kpis, loading, error, reload };
}

/**
 * The header date-range filter (window.TesslyDateRange, see assets/date-range.js).
 * Returns { preset, from, to, label }; re-renders when the user picks another range.
 */
function useDateRange() {
  const store = typeof window !== 'undefined' ? window.TesslyDateRange : null;
  const [range, setRange] = useState(() => (store ? store.get() : { preset: 'all', from: '', to: '', label: 'All time' }));
  useEffect(() => (store ? store.subscribe(setRange) : undefined), [store]);
  return range;
}

/* ------------------------------------------------------------------ *
 * Shared presentational primitives
 * ------------------------------------------------------------------ */

function KpiRow({ items, className }) {
  return jsxs('div', {
    className: className ? `kpis ${className}` : 'kpis',
    children: items.filter(Boolean).map((item) =>
      jsxs('div', {
        className: 'kpi',
        'data-tone': item.tone,
        'data-tile': '',
        key: item.label,
        children: [
          jsxs('span', {
            className: 'kpi__label',
            children: [
              item.icon ? jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: item.icon }) }) : null,
              item.label
            ]
          }),
          jsx('span', { className: 'kpi__value', children: item.value }),
          item.foot ? jsx('span', { className: 'kpi__foot', children: item.foot }) : null
        ]
      })
    )
  });
}

function AcctField({ label, required, error, className, children }) {
  return jsxs('label', {
    className: `field${error ? ' is-bad' : ''}${className ? ` ${className}` : ''}`,
    children: [
      jsxs('span', {
        className: 'field__label-row',
        children: [jsx('span', { className: 'field__label', children: required ? `${label} *` : label })]
      }),
      children,
      error ? jsx('small', { className: 'field__err', children: error }) : null
    ]
  });
}

function AcctTable({ head, headNode, rows, renderRow, emptyTitle, emptyText, emptyIcon, paged }) {
  const offset = paged && paged.pagination ? paged.pagination.from - 1 : 0;
  let tableHead = Array.isArray(head) ? [...head] : head;
  const hasHead = Array.isArray(tableHead) && tableHead.length > 0;
  const hasSno = hasHead && (tableHead[0] === 'S No' || tableHead[0] === 'S NO' || tableHead[0] === '#');

  // Auto-detect if renderRow produces more cells than head (e.g. actions column omitted in head)
  if (hasHead && rows && rows.length > 0 && typeof renderRow === 'function') {
    try {
      const sample = renderRow(rows[0], 0);
      const cells = sample && sample.props && Array.isArray(sample.props.children)
        ? sample.props.children
        : (sample && sample.props && sample.props.children ? [sample.props.children] : []);
      const expectedCount = hasSno ? tableHead.length - 1 : tableHead.length;
      if (cells.length > expectedCount && !tableHead.some((h) => typeof h === 'string' && /action/i.test(h))) {
        tableHead.push('Actions');
      }
    } catch (e) {}
  }

  const theadChildren = hasSno || !hasHead
    ? (tableHead || []).map((h) => jsx('th', { key: h, style: { textAlign: 'center' }, children: h }))
    : [
        jsx('th', { key: 'sno', style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center', paddingLeft: 8, paddingRight: 8 }, children: 'S No' }),
        ...tableHead.map((h) => jsx('th', { key: h, style: { textAlign: 'center' }, children: h }))
      ];
  const colCount = hasHead ? (hasSno ? tableHead.length : tableHead.length + 1) : 1;

  const tableEl = jsx('div', {
    className: 'table-wrap',
    children: jsxs('table', {
      className: 'table table--stack',
      children: [
        jsx('thead', {
          children: headNode || jsx('tr', {
            children: theadChildren
          })
        }),
        jsx('tbody', {
          children: !rows.length
            ? [jsx('tr', { key: 'empty', children: jsx('td', { colSpan: colCount, children: jsx(EmptyState, { icon: emptyIcon || 'search', title: emptyTitle || 'Nothing to show yet', text: emptyText || '' }) }) })]
            : rows.map((row, i) => {
            const trNode = renderRow(row, i);
            if (!hasSno && trNode && trNode.props) {
              const existingChildren = Array.isArray(trNode.props.children) ? trNode.props.children : [trNode.props.children];
              const snoTd = jsx('td', {
                key: 'sno-' + i,
                style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center', paddingLeft: 8, paddingRight: 8, verticalAlign: 'middle' },
                children: jsx('span', {
                  className: `sno-pill ${i + offset < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`,
                  children: i + offset + 1
                })
              });
              return {
                ...trNode,
                props: {
                  ...trNode.props,
                  children: [snoTd, ...existingChildren]
                }
              };
            }
            return trNode;
          })
        })
      ]
    })
  });
  return paged && paged.pager ? jsxs(Fragment, { children: [tableEl, paged.pager] }) : tableEl;
}

function AcctToolbar({ children }) {
  return jsx('div', { className: 'toolbar acct-toolbar', children });
}

function AcctBanner({ tone, children }) {
  return jsxs('div', {
    className: `acct-banner acct-banner--${tone || 'bad'}`,
    children: [
      jsx(Icon, { name: tone === 'good' ? 'check' : tone === 'warn' ? 'clock' : 'x' }),
      jsx('span', { children })
    ]
  });
}

function StatusCell({ value }) {
  if (!value) return jsx('span', { className: 'muted', children: '—' });
  return jsx(StatusPill, { kind: toneFor(value), children: value });
}

function RowActions({ children }) {
  return jsx('div', { className: 'acct-row-actions', children });
}

function ActionButton({ icon, label, onClick, disabled, variant = 'default', danger = false }) {
  return jsx('button', {
    type: 'button',
    className: `action-btn action-btn--${variant}${danger ? ' action-btn--delete' : ''}`,
    title: label,
    'aria-label': label,
    disabled: !!disabled,
    onClick,
    children: jsx(Icon, { name: icon })
  });
}

function ActionCell({ children }) {
  return jsx('td', { className: 'acct-actions-cell', children });
}

function PreviewBox({ title, children }) {
  return jsxs('div', {
    className: 'acct-preview',
    children: [
      jsx('span', { className: 'acct-preview__title', children: title }),
      jsx('div', { className: 'acct-preview__body', children })
    ]
  });
}

function PreviewRow({ label, value, tone }) {
  return jsxs('div', {
    className: `acct-preview__row${tone ? ` is-${tone}` : ''}`,
    children: [jsx('span', { children: label }), jsx('b', { children: value })]
  });
}

function SubTabs({ items, active, onChange }) {
  return jsx('div', {
    className: 'acct-seg',
    children: jsxs('div', {
      className: 'seg',
      children: items.map((item) =>
        jsx('button', {
          type: 'button',
          key: item.id,
          className: `seg__btn${item.id === active ? ' is-on' : ''}`,
          onClick: () => onChange(item.id),
          children: item.label
        })
      )
    })
  });
}

/** Confirmed delete against the API, using the app's own confirm modal. */
async function runDelete({ url, entity, label, anchor, onDone }) {
  const ok = await confirmModal(
    {
      title: `Delete this ${entity}?`,
      text: `${label || 'This record'} will be permanently removed.`,
      ok: 'Delete',
      danger: true
    },
    anchor
  );
  if (!ok) return false;
  const res = await apiFetch(url, { method: 'DELETE' });
  if (res.ok && res.data && res.data.success) {
    toast(res.data.message || `${entity} deleted`, { icon: 'trash' });
    onDone();
    return true;
  }
  toast((res.data && res.data.message) || res.error || `Could not delete the ${entity}`, { icon: 'x' });
  return false;
}

/* ------------------------------------------------------------------ *
 * Configuration-driven master module
 * (Expense Categories, Asset Categories, Bank Accounts)
 * ------------------------------------------------------------------ */

const GROUP_LABELS = { main: '', details: 'Details' };

const textField = (name, label, extra) => Object.assign({ name, label, type: 'text' }, extra || {});
const numberField = (name, label, extra) => Object.assign({ name, label, type: 'number' }, extra || {});
const selectField = (name, label, options, extra) =>
  Object.assign({ name, label, type: 'select', options }, extra || {});
const areaField = (name, label, extra) => Object.assign({ name, label, type: 'textarea' }, extra || {});

/** Theme-styled branch dropdown fed by the HR branch master. */
function BranchSelect({ value, onChange }) {
  const [list, setList] = useState([]);
  const [defaultBranch, setDefaultBranch] = useState('');
  useEffect(() => {
    let alive = true;
    apiFetch('/api/hr/branches/options').then((res) => {
      const payload = res.data || {};
      if (alive && res.ok && payload.success && Array.isArray(payload.data)) {
        setList(payload.data);
        if (payload.defaultBranch) {
          setDefaultBranch(payload.defaultBranch);
          if (!value && onChange) onChange(payload.defaultBranch);
        }
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  const current = value || defaultBranch || 'All Branches';
  const options = ['All Branches', ...list];
  if (options.indexOf(current) < 0) options.push(current);
  return jsx(
    'select',
    withChildren(
      { className: 'select', value: current, onChange: (ev) => onChange(ev.target.value) },
      options.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
    )
  );
}

function MasterControl({ field, values, setValue, config }) {
  const value = values[field.name];
  if (field.type === 'toggle') {
    return jsx(CheckboxToggle, {
      on: Boolean(value),
      label: field.label,
      onChange: () => setValue(field.name, !value)
    });
  }
  if (field.type === 'branch') {
    return jsx(BranchSelect, { value, onChange: (v) => setValue(field.name, v) });
  }
  if (field.type === 'select') {
    return jsx(
      'select', withChildren(
      {
        className: 'select',
        value: value === undefined || value === null ? '' : value,
        onChange: (ev) => setValue(field.name, ev.target.value)
      }, 
      [
        jsx('option', { value: '', key: '__none', children: field.placeholder || 'Select…' }),
        ...(field.options || []).map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
      ]
    ));
  }
  if (field.type === 'options') {
    const opts = (config.options ? config.options(values) : []) || [];
    return jsx(
      'select', withChildren(
      {
        className: 'select',
        value: value === undefined || value === null ? '' : value,
        onChange: (ev) => setValue(field.name, ev.target.value)
      }, 
      [
        jsx('option', { value: '', key: '__none', children: field.placeholder || 'Select…' }),
        ...opts.map((opt) =>
          jsx('option', { value: opt.value, key: String(opt.value), children: opt.label })
        )
      ]
    ));
  }
  if (field.type === 'textarea') {
    return jsx('textarea', {
      className: 'textarea',
      rows: 3,
      value: value === undefined || value === null ? '' : value,
      placeholder: field.placeholder || '',
      onChange: (ev) => setValue(field.name, ev.target.value)
    });
  }
  return jsx('input', {
    className: 'input',
    type: field.type === 'number' ? 'number' : field.type,
    step: field.type === 'number' ? 'any' : undefined,
    min: field.type === 'number' ? '0' : undefined,
    value: value === undefined || value === null ? '' : value,
    placeholder: field.placeholder || '',
    onChange: (ev) => setValue(field.name, ev.target.value)
  });
}

function MasterFormBody({ config, values, setValue }) {
  const groups = [];
  config.fields.forEach((f) => {
    const name = f.group || 'main';
    let bucket = groups.find((g) => g.name === name);
    if (!bucket) {
      bucket = { name, label: GROUP_LABELS[name] || '', fields: [] };
      groups.push(bucket);
    }
    bucket.fields.push(f);
  });
  return jsxs(Fragment, {
    children: groups.map((group) =>
      jsxs('section', {
        className: 'acct-group',
        key: group.name,
        children: [
          group.label ? jsx('h4', { className: 'acct-group__title', children: group.label }) : null,
          jsxs('div', {
            className: 'form-grid',
            children: group.fields.map((field) =>
              jsx(AcctField, {
                key: field.name,
                label: field.label,
                required: field.required,
                className: field.span || '',
                children: jsx(MasterControl, { field, values, setValue, config })
              })
            )
          })
        ]
      })
    )
  });
}

function MasterDrawerBody({ config, record, onDone }) {
  const [values, setValues] = useState(() => {
    const next = config.initial();
    if (record) {
      config.fields.forEach((f) => {
        if (record[f.name] !== undefined && record[f.name] !== null) next[f.name] = record[f.name];
      });
    }
    return next;
  });
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    const missing = config.fields.find((f) => {
      if (!f.required) return false;
      const v = values[f.name];
      return v === '' || v === undefined || v === null;
    });
    if (missing) {
      toast(`${missing.label} is required`, { icon: 'x' });
      return;
    }
    setSaving(true);
    const url = record ? `${config.endpoint}/${record._id}` : config.endpoint;
    const res = await apiFetch(url, {
      method: record ? 'PUT' : 'POST',
      body: JSON.stringify(config.payload(values))
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || `${config.entity} saved`, { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || `Could not save the ${config.entity}`, { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: record ? `Edit ${config.entity}` : config.formTitle,
    sub: config.formSub,
    foot: jsxs(Fragment, {
      children: [
        jsx('button', {
          type: 'button',
          className: 'btn btn--ghost',
          onClick: closeDrawer,
          children: 'Cancel'
        }),
        jsx('button', {
          type: 'submit',
          form: 'acct-master-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Saving…' : record ? 'Save changes' : `Create ${config.entity}`
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-master-form',
      noValidate: true,
      onSubmit: submit,
      children: jsx(MasterFormBody, { config, values, setValue })
    })
  });
}

function GenericMasterModule({ config }) {
  const [values, setValues] = useState(config.initial);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const paged = usePaged(config.endpoint, { q: query.trim() });
  const { rows, kpis, loading, error, reload } = paged;
  const total = paged.pagination ? paged.pagination.total : 0;

  const kpiData = kpis || {};
  const visible = rows;

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const startEdit = (row) => {
    const next = config.initial();
    config.fields.forEach((f) => {
      if (row[f.name] !== undefined && row[f.name] !== null) next[f.name] = row[f.name];
    });
    setValues(next);
    setEditingId(row._id);
  };

  const resetForm = () => {
    setValues(config.initial());
    setEditingId(null);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    const missing = config.fields.find((f) => {
      if (!f.required) return false;
      const v = values[f.name];
      return v === '' || v === undefined || v === null;
    });
    if (missing) {
      toast(`${missing.label} is required`, { icon: 'x' });
      return;
    }
    setSaving(true);
    const url = editingId ? `${config.endpoint}/${editingId}` : config.endpoint;
    const res = await apiFetch(url, {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify(config.payload(values))
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || `${config.entity} saved`, { icon: 'check' });
      resetForm();
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || `Could not save the ${config.entity}`, { icon: 'x' });
    }
  };

  const openDrawerForm = (record) => {
    openDrawer(jsx(MasterDrawerBody, { config, record, onDone: reload }));
  };

  const tableCard = jsx(Card, {
    title: config.cardTitle,
    sub: `${total} record${total === 1 ? '' : 's'}`,
    flush: true,
    children: jsxs('div', {
      children: [
        jsx(AcctToolbar, {
          children: [
            jsx(SearchInput, { value: query, onChange: setQuery, placeholder: config.searchPlaceholder || 'Search…' }),
            config.layout === 'modal'
              ? jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openDrawerForm(null),
                  children: [jsx(Icon, { name: 'plus' }), `Add ${config.entity}`]
                })
              : null
          ]
        }),
        loading
          ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the latest records.' })
          : jsx(AcctTable, {
              head: [...config.columns.map((c) => c.head), 'Actions'],
              rows: visible,
                  paged,
              emptyIcon: config.emptyIcon || 'search',
              emptyTitle: query ? 'No matching records' : 'No records yet',
              emptyText: query ? 'Try a different search term.' : `Create the first ${config.entity} to get started.`,
              renderRow: (row) =>
                jsx('tr', {
                  'data-row': '',
                  key: row._id,
                  children: [
                    ...config.columns.map((c) => jsx('td', { key: c.head, children: c.cell(row) })),
                    jsx(ActionCell, {
                      children: jsx(RowActions, {
                        children: [
                          jsx(ActionButton, {
                            icon: 'edit',
                            label: 'Edit',
                            variant: 'edit',
                            onClick: () => (config.layout === 'modal' ? openDrawerForm(row) : startEdit(row))
                          }),
                          jsx(ActionButton, {
                            icon: 'trash',
                            label: 'Delete',
                            variant: 'delete',
                            danger: true,
                            onClick: (ev) =>
                              runDelete({
                                url: `${config.endpoint}/${row._id}`,
                                entity: config.entity,
                                label: config.label(row),
                                anchor: ev.currentTarget,
                                onDone: reload
                              })
                          })
                        ]
                      })
                    })
                  ]
                })
            })
      ]
    })
  });

  if (config.layout === 'modal') {
    return jsxs('div', {
      className: 'acct-stack',
      children: [
        jsx(KpiRow, { items: config.kpis(kpiData), className: config.kpiClass }),
        error ? jsx(AcctBanner, { children: error }) : null,
        tableCard
      ]
    });
  }

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(KpiRow, { items: config.kpis(kpiData), className: config.kpiClass }),
      error ? jsx(AcctBanner, { children: error }) : null,
      jsxs('div', {
        className: 'acct-grid',
        children: [
          jsx(Card, {
            title: editingId ? `Edit ${config.entity}` : config.formTitle,
            sub: config.formSub,
            tools: editingId
              ? jsx('button', {
                  type: 'button',
                  className: 'btn btn--sm btn--ghost',
                  onClick: resetForm,
                  children: 'Cancel edit'
                })
              : null,
            children: jsxs('form', {
              noValidate: true,
              onSubmit: handleSubmit,
              children: [
                jsx(MasterFormBody, { config, values, setValue }),
                jsxs('div', {
                  className: 'acct-actions',
                  children: [
                    editingId
                      ? jsx('button', {
                          type: 'button',
                          className: 'btn btn--ghost',
                          onClick: resetForm,
                          children: 'Discard'
                        })
                      : null,
                    jsx('button', {
                      type: 'submit',
                      className: 'btn btn--primary',
                      disabled: saving,
                      children: saving ? 'Saving…' : editingId ? 'Save changes' : `Create ${config.entity}`
                    })
                  ]
                })
              ]
            })
          }),
          tableCard
        ]
      })
    ]
  });
}

const EXPENSE_CATEGORY_CONFIG = {
  endpoint: '/api/accounts/expense-categories',
  entity: 'expense category',
  layout: 'modal',
  kpiClass: 'kpis--3',
  cardTitle: 'Expense category catalogue',
  cardSub: 'Every expense head with its chart-of-accounts code and branch scope.',
  formTitle: 'Add expense category',
  formSub: 'The account code is the general ledger account this head posts to.',
  searchPlaceholder: 'Search code, name, branch…',
  searchFields: ['code', 'name', 'description', 'branch'],
  initial: () => ({
    code: '',
    name: '',
    description: '',
    accountCode: '',
    branch: '',
    status: ''
  }),
  fields: [
    textField('code', 'Category code', { required: true, placeholder: '' }),
    textField('name', 'Category name', { required: true, placeholder: '' }),
    areaField('description', 'Description', { span: 'span-2', placeholder: '' }),
    textField('accountCode', 'Account code', { placeholder: '' }),
    { name: 'branch', label: 'Branch scope', type: 'branch' },
    selectField('status', 'Status', ['Active', 'Inactive'])
  ],
  payload: (v) => ({
    code: v.code.trim(),
    name: v.name.trim(),
    description: v.description.trim(),
    accountCode: v.accountCode.trim() || '5000',
    branch: v.branch.trim() || 'All Branches',
    status: v.status
  }),
  kpis: (k) => [
    { label: 'Total categories', value: fmtCount(k.total), tone: 'cobalt', icon: 'tag' },
    { label: 'Active', value: fmtCount(k.active), tone: 'teal', icon: 'check' },
    { label: 'Inactive', value: fmtCount(k.inactive), tone: 'slate', icon: 'x' }
  ],
  columns: [
    { head: 'Code', cell: (r) => jsx('b', { children: asText(r.code) }) },
    {
      head: 'Category',
      cell: (r) =>
        jsxs('span', {
          className: 'li__main',
          children: [jsx('b', { children: asText(r.name) }), jsx('small', { children: asText(r.description) })]
        })
    },
    { head: 'Account code', cell: (r) => asText(r.accountCode) },
    { head: 'Branch', cell: (r) => asText(r.branch) },
    { head: 'Status', cell: (r) => jsx(StatusCell, { value: r.status }) }
  ],
  label: (r) => r.name
};

const ASSET_CATEGORY_CONFIG = {
  endpoint: '/api/accounts/asset-categories',
  entity: 'asset category',
  layout: 'modal',
  kpiClass: 'kpis--3',
  cardTitle: 'Asset category catalogue',
  cardSub: 'The asset master — code, name, description and branch scope.',
  formTitle: 'Add asset category',
  formSub: 'Categories keep the fixed-asset register tidy and drive the inventory filters.',
  searchPlaceholder: 'Search code, name, branch…',
  searchFields: ['code', 'name', 'description', 'branch'],
  initial: () => ({ code: '', name: '', description: '', branch: '', status: '' }),
  fields: [
    textField('code', 'Category code', { required: true, placeholder: '' }),
    textField('name', 'Category name', { required: true, placeholder: '' }),
    areaField('description', 'Description', { span: 'span-2', placeholder: '' }),
    { name: 'branch', label: 'Branch scope', type: 'branch' },
    selectField('status', 'Status', ['Active', 'Inactive'])
  ],
  payload: (v) => ({
    code: v.code.trim(),
    name: v.name.trim(),
    description: v.description.trim(),
    branch: v.branch.trim() || 'All Branches',
    status: v.status
  }),
  kpis: (k) => [
    { label: 'Total categories', value: fmtCount(k.total), tone: 'cobalt', icon: 'library' },
    { label: 'Active', value: fmtCount(k.active), tone: 'teal', icon: 'check' },
    { label: 'Linked branches', value: fmtCount(k.linkedBranches), tone: 'slate', icon: 'building' }
  ],
  columns: [
    { head: 'Code', cell: (r) => jsx('b', { children: asText(r.code) }) },
    {
      head: 'Category',
      cell: (r) =>
        jsxs('span', {
          className: 'li__main',
          children: [jsx('b', { children: asText(r.name) }), jsx('small', { children: asText(r.description) })]
        })
    },
    { head: 'Branch', cell: (r) => asText(r.branch) },
    { head: 'Status', cell: (r) => jsx(StatusCell, { value: r.status }) }
  ],
  label: (r) => r.name
};

/* ------------------------------------------------------------------ *
 * Accounts overview (dashboard)
 * ------------------------------------------------------------------ */

const periodLabel = (period) => {
  if (!period) return '';
  const parts = String(period).split('-');
  if (parts.length < 2) return period;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(parts[1]) - 1] || parts[1]} ${String(parts[0]).slice(2)}`;
};

const PENDING_ACTIONS = [
  { key: 'payments', label: 'Payments outstanding', sub: 'Invoices due or partially collected', href: '/accounts/sales', icon: 'card', tone: 'amber' },
  { key: 'expenses', label: 'Expenses recorded', sub: 'Operating receipts awaiting audit', href: '/accounts/expenses', icon: 'finance', tone: 'cobalt' },
  { key: 'activeEmis', label: 'Running EMIs', sub: 'Product instalments still being repaid', href: '/accounts/emi', icon: 'calendar', tone: 'teal' },
  { key: 'salesInvoices', label: 'Draft invoices to approve', sub: 'Unposted client draft invoices', href: '/accounts/sales', icon: 'receipt', tone: 'sky' },
  { key: 'journalVouchers', label: 'Vouchers awaiting posting', sub: 'Adjustment debit/credit vouchers', href: '/accounts/adjustment-entry', icon: 'note', tone: 'slate' },
  { key: 'creditNotes', label: 'Credit notes to settle', sub: 'Returns and client credit memos', href: '/accounts/credit-notes', icon: 'layers', tone: 'citron' }
];

function DashboardPage() {
  const globalRange = useDateRange();
  const rangeQuery = [globalRange.from ? `from=${globalRange.from}` : '', globalRange.to ? `to=${globalRange.to}` : ''].filter(Boolean).join('&');
  const { data, loading, error } = useApi(`/api/accounts/dashboard${rangeQuery ? `?${rangeQuery}` : ''}`);
  const d = data || {};
  const k = d.kpis || {};
  const pending = d.pending || {};
  const trends = Array.isArray(d.trends) ? d.trends : [];
  const mix = Array.isArray(d.expenseMix) ? d.expenseMix : [];

  const nets = useMemo(
    () => trends.map((t) => Number(t.income || 0) - Number(t.expense || 0)),
    [trends]
  );
  const maxNet = useMemo(() => Math.max(1, ...nets.map((n) => Math.abs(n))), [nets]);
  const mixTotal = useMemo(() => mix.reduce((s, m) => s + Number(m.amount || 0), 0), [mix]);

  const revSpark = useMemo(() => {
    const vals = trends.map((t) => Math.max(0, Number(t.income || 0)));
    return vals.length >= 2 ? vals : [24000, 32000, 90000, 22000, 22200, 162316];
  }, [trends]);

  const expSpark = useMemo(() => {
    const vals = trends.map((t) => Math.max(0, Number(t.expense || 0)));
    return vals.length >= 2 ? vals : [18000, 26000, 48000, 84000, 227800, 290700];
  }, [trends]);

  const treasurySpark = useMemo(() => [950000, 1020000, 1140000, 1220000, 1285000, 1300000], []);

  const netSpark = useMemo(() => {
    const vals = nets.map((n) => Number(n || 0));
    return vals.length >= 2 ? vals : [-4000, 14000, 90000, 22000, -205600, -217460];
  }, [nets]);

  const chartLabels = useMemo(() => {
    if (!trends.length) return ['Aug 26', 'Sep 26', 'Oct 26', 'Nov 26'];
    return trends.map((t) => periodLabel(t.period));
  }, [trends]);

  const chartSeries = useMemo(() => {
    if (!trends.length) return [];
    return [
      {
        name: 'Revenue',
        values: trends.map((t) => Math.max(0, Number(t.income || 0))),
        tone: 'cobalt'
      },
      {
        name: 'Operating spend',
        values: trends.map((t) => Math.max(0, Number(t.expense || 0))),
        tone: 'amber'
      }
    ];
  }, [trends]);

  const liquidTreasury = Number(k.cashBalance || 0) + Number(k.bankBalance || 0);
  const netMargin = Number(k.netProfit || 0);

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      error ? jsx(AcctBanner, { children: error }) : null,

      jsxs('div', {
        className: 'acct-bento-kpis',
        children: [
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'cobalt',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'finance' }) }),
                  'Operating Revenue'
                ]
              }),
              jsx(Sparkline, { values: revSpark, delay: 0.2 }),
              jsx(NumberMorph, { className: 'kpi__value', value: Number(k.totalSales || 0), fmt: fmtINR }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: `Receivables: ${fmtINR(k.totalReceivables)}` }),
                  jsx(Delta, { v: 14.8 })
                ]
              })
            ]
          }),

          jsxs('div', {
            className: 'kpi',
            'data-tone': 'amber',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'card' }) }),
                  'Operating Expenses'
                ]
              }),
              jsx(Sparkline, { values: expSpark, delay: 0.3 }),
              jsx(NumberMorph, { className: 'kpi__value', value: Number(k.totalExpenses || 0), fmt: fmtINR }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: `${mix.length || 5} active ledger heads` }),
                  jsx(Delta, { v: -3.2 })
                ]
              })
            ]
          }),

          jsxs('div', {
            className: 'kpi',
            'data-tone': 'teal',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'building' }) }),
                  'Liquid Treasury'
                ]
              }),
              jsx(Sparkline, { values: treasurySpark, delay: 0.4 }),
              jsx(NumberMorph, { className: 'kpi__value', value: liquidTreasury, fmt: fmtINR }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: `Cash ${fmtAxisINR(k.cashBalance)} · Bank ${fmtAxisINR(k.bankBalance)}` }),
                  jsx(Delta, { v: 5.4 })
                ]
              })
            ]
          }),

          jsxs('div', {
            className: 'kpi',
            'data-tone': netMargin >= 0 ? 'cobalt' : 'citron',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'forecast' }) }),
                  'Net Position'
                ]
              }),
              jsx(Sparkline, { values: netSpark, delay: 0.5 }),
              jsx(NumberMorph, {
                className: 'kpi__value',
                style: { color: netMargin >= 0 ? 'var(--good)' : 'var(--bad)' },
                value: netMargin,
                fmt: fmtINR
              }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: 'Fiscal Year 2026' }),
                  jsx(StatusPill, {
                    tone: netMargin >= 0 ? 'good' : 'warn',
                    children: netMargin >= 0 ? 'Surplus' : 'Deficit'
                  })
                ]
              })
            ]
          })
        ]
      }),

      jsxs('div', {
        className: 'acct-telemetry-ribbon',
        children: [
          jsxs('a', {
            className: 'acct-telemetry-item',
            href: '/accounts/sales',
            children: [
              jsx('div', {
                className: 'acct-telemetry-icon',
                style: { background: 'color-mix(in srgb, var(--cobalt) 14%, transparent)', color: 'var(--cobalt)' },
                children: jsx(Icon, { name: 'receipt' })
              }),
              jsxs('div', {
                className: 'acct-telemetry-meta',
                children: [
                  jsx('span', { className: 'acct-telemetry-lbl', children: 'Receivables' }),
                  jsx('b', { className: 'acct-telemetry-val', children: fmtINR(k.totalReceivables) })
                ]
              }),
              jsx('span', { className: 'acct-telemetry-tag', children: 'Outstanding' })
            ]
          }),
          jsxs('a', {
            className: 'acct-telemetry-item',
            href: '/accounts/assets',
            children: [
              jsx('div', {
                className: 'acct-telemetry-icon',
                style: { background: 'color-mix(in srgb, var(--teal) 14%, transparent)', color: 'var(--teal)' },
                children: jsx(Icon, { name: 'building' })
              }),
              jsxs('div', {
                className: 'acct-telemetry-meta',
                children: [
                  jsx('span', { className: 'acct-telemetry-lbl', children: 'Fixed Assets' }),
                  jsx('b', { className: 'acct-telemetry-val', children: fmtINR(k.totalAssets) })
                ]
              }),
              jsx('span', { className: 'acct-telemetry-tag', children: 'Book Value' })
            ]
          }),
          jsxs('a', {
            className: 'acct-telemetry-item',
            href: '/accounts/credit-notes',
            children: [
              jsx('div', {
                className: 'acct-telemetry-icon',
                style: { background: 'color-mix(in srgb, var(--amber) 14%, transparent)', color: 'var(--amber)' },
                children: jsx(Icon, { name: 'layers' })
              }),
              jsxs('div', {
                className: 'acct-telemetry-meta',
                children: [
                  jsx('span', { className: 'acct-telemetry-lbl', children: 'Credit Notes' }),
                  jsx('b', { className: 'acct-telemetry-val', children: fmtINR(k.totalCredits) })
                ]
              }),
              jsx('span', { className: 'acct-telemetry-tag', children: 'Settled' })
            ]
          }),
          jsxs('div', {
            className: 'acct-telemetry-item',
            children: [
              jsx('div', {
                className: 'acct-telemetry-icon',
                style: { background: 'color-mix(in srgb, var(--sky) 14%, transparent)', color: 'var(--sky)' },
                children: jsx(Icon, { name: 'send' })
              }),
              jsxs('div', {
                className: 'acct-telemetry-meta',
                children: [
                  jsx('span', { className: 'acct-telemetry-lbl', children: 'Primary Bank' }),
                  jsx('b', { className: 'acct-telemetry-val', children: fmtINR(k.bankBalance) })
                ]
              }),
              jsx('span', { className: 'acct-telemetry-tag', children: 'Reconciled' })
            ]
          })
        ]
      }),

      jsxs('div', {
        className: 'acct-bento-row',
        children: [
          jsx(Card, {
            title: 'Income vs Expense Dynamics',
            sub: 'Audited 6-month general ledger postings and comparative trajectory.',
            tools: jsxs('div', {
              className: 'acct-chart-legends',
              children: [
                jsxs('span', {
                  className: 'acct-chart-legend',
                  children: [jsx('i', { style: { background: 'var(--cobalt)' } }), 'Income']
                }),
                jsxs('span', {
                  className: 'acct-chart-legend',
                  children: [jsx('i', { style: { background: 'var(--amber)' } }), 'Operating spend']
                })
              ]
            }),
            children: loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching ledger trend.' })
              : chartSeries.length
                ? jsx(LineAreaChart, {
                    series: chartSeries,
                    labels: chartLabels,
                    height: 250,
                    fmt: fmtINR,
                    axisFmt: fmtAxisINR
                  })
                : jsx(EmptyState, { icon: 'forecast', title: 'No ledger trend yet', text: 'Post a transaction to generate dynamics.' })
          }),

          jsx(Card, {
            title: 'Pending Actions & Decisions',
            sub: 'Operational tasks awaiting executive review and sign-off.',
            flush: true,
            children: jsxs('div', {
              className: 'acct-docket-list',
              children: PENDING_ACTIONS.map((action) => {
                const count = Number(pending[action.key] || 0);
                return jsxs('a', {
                  className: 'acct-docket-row',
                  key: action.key,
                  href: action.href,
                  children: [
                    jsx('span', {
                      className: 'acct-docket-icon',
                      'data-tone': action.tone,
                      children: jsx(Icon, { name: action.icon })
                    }),
                    jsxs('span', {
                      className: 'acct-docket-body',
                      children: [
                        jsx('b', { className: 'acct-docket-title', children: action.label }),
                        jsx('small', { className: 'acct-docket-sub', children: action.sub })
                      ]
                    }),
                    jsx('span', {
                      className: `acct-docket-pill ${count > 0 ? 'is-pending' : 'is-clear'}`,
                      children: count > 0 ? `${count} pending` : 'Clear'
                    }),
                    jsx('span', {
                      className: 'acct-docket-chev',
                      children: jsx(Icon, { name: 'chev-r' })
                    })
                  ]
                });
              })
            })
          })
        ]
      }),

      jsxs('div', {
        className: 'acct-bento-row acct-bento-row--half',
        children: [
          jsx(Card, {
            title: 'Expense Allocation by Head',
            sub: 'Category breakdown and weight across operational cost centers.',
            children: jsxs('div', {
              className: 'acct-mix-card',
              children: [
                jsx('div', {
                  className: 'acct-donut-box',
                  children: jsxs('div', {
                    className: 'acct-donut',
                    style: { background: donutGradient(mix) },
                    children: [
                      jsxs('div', {
                        className: 'acct-donut__hole',
                        children: [
                          jsx('b', { children: fmtINR(mixTotal) }),
                          jsx('small', { children: 'Total spend' })
                        ]
                      })
                    ]
                  })
                }),
                jsx('div', {
                  className: 'acct-mix-bars',
                  children: mix.length
                    ? mix.slice(0, 5).map((m, i) => {
                        const pct = mixTotal > 0 ? (Number(m.amount || 0) / mixTotal) * 100 : 0;
                        const color = DONUT_COLORS[i % DONUT_COLORS.length];
                        return jsxs('div', {
                          className: 'acct-mix-row',
                          key: m.category || `mix-${i}`,
                          children: [
                            jsxs('div', {
                              className: 'acct-mix-row__head',
                              children: [
                                jsxs('span', {
                                  className: 'acct-mix-row__title',
                                  children: [
                                    jsx('i', { className: 'acct-mix-row__dot', style: { background: color } }),
                                    asText(m.category)
                                  ]
                                }),
                                jsxs('span', {
                                  className: 'acct-mix-row__meta',
                                  children: [
                                    jsx('b', { children: fmtINR(m.amount) }),
                                    jsx('small', { children: `${Math.round(pct)}%` })
                                  ]
                                })
                              ]
                            }),
                            jsx('div', {
                              className: 'acct-mix-row__track',
                              children: jsx('div', {
                                className: 'acct-mix-row__bar',
                                style: { width: `${pct}%`, background: color }
                              })
                            })
                          ]
                        });
                      })
                    : jsx('span', { className: 'muted', children: 'No expenses recorded yet.' })
                })
              ]
            })
          }),

          jsx(Card, {
            title: 'Cash Book Trajectory',
            sub: 'Net movement recorded in cash & bank books per posting period.',
            children: loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching cash flow.' })
              : trends.length
                ? jsxs('div', {
                    className: 'acct-flow-box',
                    children: [
                      jsxs('div', {
                        className: 'acct-flow-tracks',
                        children: trends.map((t, i) => {
                          const net = nets[i] || 0;
                          const isPos = net >= 0;
                          const heightPct = maxNet > 0 ? Math.min(100, Math.max(14, (Math.abs(net) / maxNet) * 100)) : 14;
                          return jsxs('div', {
                            className: 'acct-flow-col',
                            key: t.period || `f-${i}`,
                            children: [
                              jsx('span', {
                                className: `acct-flow-tag ${isPos ? 'is-pos' : 'is-neg'}`,
                                children: (isPos ? '+' : '') + fmtAxisINR(net)
                              }),
                              jsxs('div', {
                                className: 'acct-flow-stage',
                                children: [
                                  jsx('div', { className: 'acct-flow-center-line' }),
                                  jsx('div', {
                                    className: `acct-flow-pill ${isPos ? 'is-pos' : 'is-neg'}`,
                                    style: {
                                      height: `${heightPct * 0.42}px`,
                                      [isPos ? 'bottom' : 'top']: '50%'
                                    }
                                  })
                                ]
                              }),
                              jsx('span', { className: 'acct-flow-label', children: periodLabel(t.period) })
                            ]
                          });
                        })
                      }),
                      jsxs('div', {
                        className: 'acct-flow-summary',
                        children: [
                          jsxs('div', {
                            className: 'acct-flow-summary-cell',
                            children: [
                              jsx('small', { children: 'Total Inflow' }),
                              jsx('b', { children: fmtINR(trends.reduce((s, t) => s + Math.max(0, Number(t.income || 0)), 0)) })
                            ]
                          }),
                          jsxs('div', {
                            className: 'acct-flow-summary-cell',
                            children: [
                              jsx('small', { children: 'Total Outflow' }),
                              jsx('b', { children: fmtINR(trends.reduce((s, t) => s + Math.max(0, Number(t.expense || 0)), 0)) })
                            ]
                          }),
                          jsxs('div', {
                            className: 'acct-flow-summary-cell',
                            children: [
                              jsx('small', { children: 'Net Variance' }),
                              jsx('b', {
                                style: { color: netMargin >= 0 ? 'var(--good)' : 'var(--bad)' },
                                children: fmtINR(netMargin)
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                : jsx(EmptyState, { icon: 'forecast', title: 'No cash flow yet', text: 'Nothing has moved through the cash book.' })
          })
        ]
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Sales & invoicing
 * ------------------------------------------------------------------ */

const emptySaleItem = () => ({ productService: '', quantity: '', rate: '', stockRef: '' });

function SalesInvoiceDrawer({ invoice, onDone }) {
  const editing = Boolean(invoice);
  const [values, setValues] = useState(() => {
    if (!invoice) {
      return {
        customer: '',
        invoiceDate: '',
        dueDate: '',
        paymentTerms: '',
        paymentMode: '',
        status: '',
        branch: '',
        notes: '',
        discount: '',
        tax: '',
        attachments: [],
        items: [emptySaleItem()]
      };
    }
    return {
      customer: invoice.customer || '',
      invoiceDate: invoice.invoiceDate || todayISO(),
      dueDate: invoice.dueDate || '',
      paymentTerms: invoice.paymentTerms || 'Net 30',
      paymentMode: invoice.paymentMode || 'Cash',
      status: invoice.status || 'Approved',
      branch: invoice.branch || 'All Branches',
      notes: invoice.notes || '',
      discount: Number(invoice.discount || 0),
      tax: Number(invoice.tax || 0),
      attachments: invoice.attachments || [],
      items: (invoice.items || []).map((i) => ({
        productService: i.productService || '',
        quantity: Number(i.quantity || 1),
        rate: Number(i.rate || 0),
        stockRef: i.stockRef || ''
      }))
    };
  });
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const setItem = (index, key, value) =>
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    }));
  const addItem = () => setValues((prev) => ({ ...prev, items: [...prev.items, emptySaleItem()] }));
  const removeItem = (index) =>
    setValues((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items
    }));

  const subtotal = values.items.reduce((s, i) => s + toNum(i.quantity) * toNum(i.rate), 0);
  const grandTotal = Math.max(0, subtotal - toNum(values.discount) + toNum(values.tax));

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    if (!values.customer.trim()) {
      toast('Customer is required', { icon: 'x' });
      return;
    }
    if (!values.invoiceDate) {
      toast('Invoice date is required', { icon: 'x' });
      return;
    }
    const usable = values.items.filter((i) => i.productService.trim());
    if (!usable.length) {
      toast('At least one line item is required', { icon: 'x' });
      return;
    }
    const payload = {
      customer: values.customer.trim(),
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      paymentTerms: values.paymentTerms,
      paymentMode: values.paymentMode,
      status: values.status,
      branch: values.branch.trim() || 'All Branches',
      notes: values.notes,
      attachments: values.attachments || [],
      discount: toNum(values.discount),
      tax: toNum(values.tax),
      items: usable.map((i) => ({
        productService: i.productService.trim(),
        quantity: Math.max(1, toNum(i.quantity)),
        rate: toNum(i.rate),
        stockRef: i.stockRef || ''
      }))
    };
    setSaving(true);
    const url = editing ? `/api/accounts/sales/${invoice._id}` : '/api/accounts/sales';
    const res = await apiFetch(url, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Inward invoice saved', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not save the inward invoice', { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: editing ? `Edit ${invoice.invoiceNumber}` : 'Create inward invoice',
    sub: editing ? invoice.invoiceNumber : 'Raise a new invoice — it posts to the general ledger on save.',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-sales-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Saving…' : editing ? 'Save invoice' : 'Create inward invoice'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-sales-form',
      noValidate: true,
      onSubmit: submit,
      children: jsxs('div', {
        className: 'acct-stack',
        children: [
          jsxs('div', {
            className: 'form-grid',
            children: [
              jsx(AcctField, { label: 'Customer', required: true, children: jsx('input', {
                className: 'input',
                value: values.customer,
                placeholder: 'Customer name',
                onChange: (ev) => setValue('customer', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Invoice date', required: true, children: jsx('input', {
                className: 'input',
                type: 'date',
                value: values.invoiceDate,
                onChange: (ev) => setValue('invoiceDate', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Due date', children: jsx('input', {
                className: 'input',
                type: 'date',
                value: values.dueDate,
                onChange: (ev) => setValue('dueDate', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Payment terms', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.paymentTerms, onChange: (ev) => setValue('paymentTerms', ev.target.value) }, 
                SALES_PAYMENT_TERMS.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Payment mode', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.paymentMode, onChange: (ev) => setValue('paymentMode', ev.target.value) }, 
                SALES_PAYMENT_MODES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Status', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.status, onChange: (ev) => setValue('status', ev.target.value) }, 
                SALES_STATUSES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Branch', children: jsx(BranchSelect, { value: values.branch, onChange: (v) => setValue('branch', v) }) })
            ]
          }),
          jsxs('div', {
            className: 'acct-lines',
            children: [
              jsxs('div', {
                className: 'acct-lines__head',
                children: [
                  jsx('b', { children: 'Line items' }),
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--sm',
                    onClick: addItem,
                    children: [jsx(Icon, { name: 'plus' }), 'Add line']
                  })
                ]
              }),
              jsx('div', {
                className: 'table-wrap',
                children: jsxs('table', {
                  className: 'table',
                  children: [
                    jsx('thead', {
                      children: jsx('tr', {
                        children: [
                          jsx('th', { key: 'h1', children: 'Product / service' }),
                          jsx('th', { key: 'h2', children: 'Qty' }),
                          jsx('th', { key: 'h3', children: 'Rate' }),
                          jsx('th', { key: 'h4', children: 'Subtotal' }),
                          jsx('th', { key: 'h5', children: 'Action' })
                        ]
                      })
                    }),
                    jsx('tbody', {
                      children: values.items.map((item, index) =>
                        jsx('tr', {
                          'data-row': '',
                          key: `line-${index}`,
                          children: [
                            jsx('td', {
                              children: jsx('input', {
                                className: 'input',
                                value: item.productService,
                                placeholder: 'Product or service',
                                onChange: (ev) => setItem(index, 'productService', ev.target.value)
                              })
                            }),
                            jsx('td', {
                              children: jsx('input', {
                                className: 'input',
                                type: 'number',
                                min: '1',
                                step: 'any',
                                value: item.quantity,
                                onChange: (ev) => setItem(index, 'quantity', ev.target.value)
                              })
                            }),
                            jsx('td', {
                              children: jsx('input', {
                                className: 'input',
                                type: 'number',
                                min: '0',
                                step: 'any',
                                value: item.rate,
                                onChange: (ev) => setItem(index, 'rate', ev.target.value)
                              })
                            }),
                            jsx('td', {
                              children: jsx('b', { children: fmtINR(toNum(item.quantity) * toNum(item.rate)) })
                            }),
                            jsx('td', {
                              children: jsx('button', {
                                type: 'button',
                                className: 'btn btn--sm btn--ghost',
                                title: 'Remove item',
                                'aria-label': 'Remove item',
                                onClick: () => removeItem(index),
                                children: jsx(Icon, { name: 'trash' })
                              })
                            })
                          ]
                        })
                      )
                    })
                  ]
                })
              })
            ]
          }),
          jsxs('div', {
            className: 'form-grid',
            children: [
              jsx(AcctField, { label: 'Discount', children: jsx('input', {
                className: 'input',
                type: 'number',
                min: '0',
                step: 'any',
                value: values.discount,
                onChange: (ev) => setValue('discount', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Tax', children: jsx('input', {
                className: 'input',
                type: 'number',
                min: '0',
                step: 'any',
                value: values.tax,
                onChange: (ev) => setValue('tax', ev.target.value)
              }) }),
              jsx(AcctField, { className: 'span-2', label: 'Notes', children: jsx('textarea', {
                className: 'textarea',
                rows: 2,
                value: values.notes,
                placeholder: 'Anything the customer should know',
                onChange: (ev) => setValue('notes', ev.target.value)
              }) }),
              jsx(AcctAttachmentsField, {
                attachments: values.attachments,
                onChange: (att) => setValue('attachments', att),
                label: 'Inward Invoice Documents (Images & PDFs)'
              })
            ]
          }),
          jsx(PreviewBox, {
            title: 'Invoice preview',
            children: jsxs('div', {
              children: [
                jsx(PreviewRow, { label: 'Subtotal', value: fmtINR(subtotal) }),
                jsx(PreviewRow, { label: 'Less discount', value: `− ${fmtINR(toNum(values.discount))}` }),
                jsx(PreviewRow, { label: 'Plus tax', value: fmtINR(toNum(values.tax)) }),
                jsx(PreviewRow, { label: 'Grand total', value: fmtINR(grandTotal), tone: 'total' })
              ]
            })
          })
        ]
      })
    })
  });
}

function SalesPaymentDrawer({ invoice, onDone }) {
  const [amount, setAmount] = useState(String(Number(invoice.outstandingAmount || 0).toFixed(2)));
  const [paymentMode, setPaymentMode] = useState(invoice.paymentMode || 'Cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    const value = Number(amount);
    if (!(value > 0)) {
      toast('Payment amount must be greater than zero', { icon: 'x' });
      return;
    }
    setSaving(true);
    const res = await apiFetch(`/api/accounts/sales/${invoice._id}/collect`, {
      method: 'POST',
      body: JSON.stringify({ amount: value, paymentMode, notes })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Payment collected', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not collect the payment', { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: `Collect payment · ${invoice.invoiceNumber}`,
    sub: `${invoice.customer} — outstanding ${fmtINR(invoice.outstandingAmount)}`,
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-collect-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Collecting…' : 'Collect payment'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-collect-form',
      noValidate: true,
      onSubmit: submit,
      children: jsxs('div', {
        className: 'acct-stack',
        children: [
          jsx(AcctField, { label: 'Amount received', required: true, children: jsx('input', {
            className: 'input',
            type: 'number',
            min: '0',
            step: 'any',
            value: amount,
            onChange: (ev) => setAmount(ev.target.value)
          }) }),
          jsx(AcctField, { label: 'Payment mode', children: jsx(
            'select', withChildren(
            { className: 'select', value: paymentMode, onChange: (ev) => setPaymentMode(ev.target.value) }, 
            SALES_PAYMENT_MODES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
          )) }),
          jsx(AcctField, { label: 'Notes', children: jsx('textarea', {
            className: 'textarea',
            rows: 2,
            value: notes,
            placeholder: 'Reference or note',
            onChange: (ev) => setNotes(ev.target.value)
          }) })
        ]
      })
    })
  });
}

function InvoicePrintDoc({ invoice }) {
  const items = invoice.items || [];
  return jsxs('div', {
    className: 'acct-print-area',
    children: [
      jsxs('div', {
        className: 'acct-print__head',
        children: [
          jsxs('div', {
            children: [
              jsx('b', { children: 'Tessly CRM' }),
              jsx('small', { children: invoice.branch || 'All Branches' })
            ]
          }),
          jsxs('div', {
            children: [
              jsx('b', { children: `Invoice ${invoice.invoiceNumber}` }),
              jsx('small', { children: `Dated ${shortDate(invoice.invoiceDate)}` })
            ]
          })
        ]
      }),
      jsxs('div', {
        className: 'acct-print__meta',
        children: [
          jsx('span', { children: `Customer: ${invoice.customer || '—'}` }),
          jsx('span', { children: `Due: ${shortDate(invoice.dueDate)}` }),
          jsx('span', { children: `Terms: ${invoice.paymentTerms || '—'}` }),
          jsx('span', { children: `Mode: ${invoice.paymentMode || '—'}` })
        ]
      }),
      jsx('div', {
        className: 'table-wrap',
        children: jsxs('table', {
          className: 'table',
          children: [
            jsx('thead', {
              children: jsx('tr', {
                children: [
                  jsx('th', { key: 'h1', children: 'Item' }),
                  jsx('th', { key: 'h2', children: 'Qty' }),
                  jsx('th', { key: 'h3', children: 'Rate' }),
                  jsx('th', { key: 'h4', children: 'Subtotal' })
                ]
              })
            }),
            jsx('tbody', {
              children: items.map((item, i) =>
                jsx('tr', {
                  'data-row': '',
                  key: `print-${i}`,
                  children: [
                    jsx('td', { children: asText(item.productService) }),
                    jsx('td', { children: fmtCount(item.quantity) }),
                    jsx('td', { children: fmtINR(item.rate) }),
                    jsx('td', { children: fmtINR(item.subtotal) })
                  ]
                })
              )
            })
          ]
        })
      }),
      jsxs('div', {
        className: 'acct-print__totals',
        children: [
          jsx(PreviewRow, { label: 'Subtotal', value: fmtINR(invoice.subtotal) }),
          jsx(PreviewRow, { label: 'Discount', value: fmtINR(invoice.discount) }),
          jsx(PreviewRow, { label: 'Tax', value: fmtINR(invoice.tax) }),
          jsx(PreviewRow, { label: 'Grand total', value: fmtINR(invoice.grandTotal), tone: 'total' }),
          jsx(PreviewRow, { label: 'Paid', value: fmtINR(invoice.paidAmount) }),
          jsx(PreviewRow, { label: 'Outstanding', value: fmtINR(invoice.outstandingAmount) })
        ]
      }),
      invoice.notes ? jsx('p', { className: 'muted acct-print__notes', children: invoice.notes }) : null
    ]
  });
}

function SalesPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const paged = usePaged('/api/accounts/sales', { q: query.trim(), status: status === 'All' ? '' : status });
  const { rows, kpis, loading, error, reload } = paged;
  const total = paged.pagination ? paged.pagination.total : 0;

  const kpiData = kpis || {};
  const visible = rows;

  const openInvoiceDrawer = (invoice) => {
    openDrawer(jsx(SalesInvoiceDrawer, { invoice, onDone: reload }));
  };
  const openPaymentDrawer = (invoice) => {
    openDrawer(jsx(SalesPaymentDrawer, { invoice, onDone: reload }));
  };
  const openPrintDrawer = (invoice) => {
    openDrawer(
      jsxs(ModalDrawer, {
        title: `Invoice ${invoice.invoiceNumber}`,
        sub: invoice.customer,
        foot: jsxs(Fragment, {
          children: [
            jsx('button', {
              type: 'button',
              className: 'btn btn--primary',
              onClick: () => {
                document.body.classList.add('acct-printing');
                window.print();
                document.body.classList.remove('acct-printing');
              },
              children: [jsx(Icon, { name: 'download' }), 'Print']
            })
          ]
        }),
        children: jsx(InvoicePrintDoc, { invoice })
      })
    );
  };

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Invoices', value: fmtCount(kpiData.totalInvoices), tone: 'cobalt', icon: 'receipt' },
          { label: 'Total inward', value: fmtINR(kpiData.totalSales), tone: 'teal', icon: 'finance' },
          { label: 'Collected', value: fmtINR(kpiData.collectedRevenue), tone: 'slate', icon: 'card' },
          { label: 'Outstanding', value: fmtINR(kpiData.outstandingReceivables), tone: 'amber', icon: 'clock' }
        ]
      }),
      error ? jsx(AcctBanner, { children: error }) : null,
      jsx(Card, {
        title: 'Inward invoices',
        sub: `${total} invoice${total === 1 ? '' : 's'}`,
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(AcctToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search invoice, customer…' }),
                jsx(
                  'select', withChildren(
                  {
                    className: 'select acct-filter',
                    value: status,
                    'aria-label': 'Filter by status',
                    onChange: (ev) => setStatus(ev.target.value)
                  }, 
                  ['All', ...SALES_STATUSES].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                )),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openInvoiceDrawer(null),
                  children: [jsx(Icon, { name: 'plus' }), 'Create inward invoice']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the invoice ledger.' })
              : jsx(AcctTable, {
                  head: ['Invoice #', 'Customer', 'Date', 'Due date', 'Grand total', 'Paid', 'Outstanding', 'Payment mode', 'Status', 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'receipt',
                  emptyTitle: query || status !== 'All' ? 'No matching invoices' : 'No invoices yet',
                  emptyText: 'Create the first invoice to start billing.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', { children: jsx('b', { children: asText(row.invoiceNumber) }) }),
                        jsx('td', {
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [jsx('b', { children: asText(row.customer) }), jsx('small', { children: asText(row.branch) })]
                          })
                        }),
                        jsx('td', { children: shortDate(row.invoiceDate) }),
                        jsx('td', { children: shortDate(row.dueDate) }),
                        jsx('td', { children: jsx('b', { children: fmtINR(row.grandTotal) }) }),
                        jsx('td', { children: fmtINR(row.paidAmount) }),
                        jsx('td', {
                          children: jsx('span', {
                            className: Number(row.outstandingAmount || 0) > 0 ? 'acct-due' : 'muted',
                            children: fmtINR(row.outstandingAmount)
                          })
                        }),
                        jsx('td', { children: asText(row.paymentMode) }),
                        jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                        jsx(ActionCell, {
                          children: jsx(RowActions, {
                            children: [
                              jsx(ActionButton, {
                                icon: 'edit',
                                label: 'Edit invoice',
                                variant: 'edit',
                                onClick: () => openInvoiceDrawer(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'card',
                                label: 'Collect payment',
                                variant: 'collect',
                                disabled: row.status === 'Draft' || row.status === 'Cancelled' || Number(row.outstandingAmount || 0) <= 0,
                                onClick: () => openPaymentDrawer(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'printer',
                                label: 'Print invoice',
                                variant: 'print',
                                onClick: () => openPrintDrawer(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'trash',
                                label: 'Delete invoice',
                                variant: 'delete',
                                danger: true,
                                onClick: (ev) =>
                                  runDelete({
                                    url: `/api/accounts/sales/${row._id}`,
                                    entity: 'inward invoice',
                                    label: row.invoiceNumber,
                                    anchor: ev.currentTarget,
                                    onDone: reload
                                  })
                              })
                            ]
                          })
                        })
                      ]
                    })
                })
          ]
        })
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Expenses
 * ------------------------------------------------------------------ */

function ExpenseDrawer({ expense, categories, onDone }) {
  const editing = Boolean(expense);
  const [values, setValues] = useState(() => ({
    title: expense ? expense.title || '' : '',
    description: expense ? expense.description || '' : '',
    category: expense ? expense.category || '' : (categories && categories[0] ? categories[0].name : ''),
    amount: expense ? (expense.amount != null ? expense.amount : '') : '',
    paymentMode: expense ? expense.paymentMode || '' : 'Cash',
    branch: expense ? expense.branch || '' : '',
    date: expense ? expense.date || '' : new Date().toISOString().slice(0, 10),
    notes: expense ? expense.notes || '' : '',
    attachments: expense ? expense.attachments || [] : []
  }));
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    if (!values.title.trim()) {
      toast('Expense title is required', { icon: 'x' });
      return;
    }
    if (!values.category) {
      toast('Expense category is required', { icon: 'x' });
      return;
    }
    if (!(Number(values.amount) > 0)) {
      toast('Expense amount must be greater than zero', { icon: 'x' });
      return;
    }
    if (!values.date) {
      toast('Expense date is required', { icon: 'x' });
      return;
    }
    setSaving(true);
    const url = editing ? `/api/accounts/expenses/${expense._id}` : '/api/accounts/expenses';
    const res = await apiFetch(url, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        amount: toNum(values.amount),
        paymentMode: values.paymentMode,
        branch: values.branch.trim() || 'All Branches',
        date: values.date,
        notes: values.notes.trim(),
        attachments: values.attachments || []
      })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Expense saved', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not save the expense', { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: editing ? `Edit ${expense.title}` : 'Add expense',
    sub: editing ? 'The ledger entry is reversed and reposted on save.' : 'Record an operating spend against a category.',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-expense-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Saving…' : editing ? 'Save expense' : 'Add expense'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-expense-form',
      noValidate: true,
      onSubmit: submit,
      children: jsxs('div', {
        className: 'form-grid',
        children: [
          jsx(AcctField, { label: 'Title', required: true, children: jsx('input', {
            className: 'input',
            value: values.title,
            placeholder: 'Monthly rent',
            onChange: (ev) => setValue('title', ev.target.value)
          }) }),
          jsx(AcctField, { label: 'Description', children: jsx('input', {
            className: 'input',
            value: values.description,
            placeholder: 'What was this spend for?',
            onChange: (ev) => setValue('description', ev.target.value)
          }) }),
          jsx(AcctField, { label: 'Category', required: true, children: jsx(
            'select', withChildren(
            { className: 'select', value: values.category, onChange: (ev) => setValue('category', ev.target.value) }, 
            categories.length
              ? categories.map((c) => jsx('option', { value: c.name, key: c._id, children: c.name }))
              : [jsx('option', { value: '', key: '__none', children: 'No categories yet' })]
          )) }),
          jsx(AcctField, { label: 'Amount', required: true, children: jsx('input', {
            className: 'input',
            type: 'number',
            min: '0',
            step: 'any',
            value: values.amount,
            onChange: (ev) => setValue('amount', ev.target.value)
          }) }),
          jsx(AcctField, { label: 'Date', required: true, children: jsx('input', {
            className: 'input',
            type: 'date',
            value: values.date,
            onChange: (ev) => setValue('date', ev.target.value)
          }) }),
          jsx(AcctField, { label: 'Branch', children: jsx(BranchSelect, { value: values.branch, onChange: (v) => setValue('branch', v) }) }),
          jsx(AcctField, { className: 'span-2', label: 'Payment mode', children: jsx(
            'select', withChildren(
            { className: 'select', value: values.paymentMode, onChange: (ev) => setValue('paymentMode', ev.target.value) }, 
            EXPENSE_PAYMENT_MODES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
          )) }),
          jsx(AcctField, { className: 'span-2', label: 'Notes', children: jsx('textarea', {
            className: 'textarea',
            rows: 2,
            value: values.notes,
            placeholder: 'Reference or note',
            onChange: (ev) => setValue('notes', ev.target.value)
          }) }),
          jsx(AcctAttachmentsField, {
            attachments: values.attachments,
            onChange: (att) => setValue('attachments', att),
            label: 'Expense Receipts & Bills (Images & PDFs)'
          })
        ]
      })
    })
  });
}

function ExpenseViewDrawer({ expense, onEdit }) {
  const rows = [
    ['Title', expense.title],
    ['Description', expense.description],
    ['Category', expense.category],
    ['Amount', fmtINR(expense.amount)],
    ['Date', expense.date],
    ['Branch', expense.branch],
    ['Payment mode', expense.paymentMode],
    ['Notes', expense.notes]
  ];
  return jsx(ModalDrawer, {
    title: expense.title || 'Expense',
    sub: 'Expense details',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Close' }),
        jsx('button', { type: 'button', className: 'btn btn--primary', onClick: onEdit, children: 'Edit expense' })
      ]
    }),
    children: jsxs('div', {
      className: 'acct-stack',
      children: [
        jsx('div', {
          className: 'cd-rows',
          children: rows.map(([k, v]) =>
            jsxs('div', { className: 'cd-row', key: k, children: [
              jsx('span', { className: 'cd-row__k', children: k }),
              jsx('span', { className: 'cd-row__v', children: asText(v) })
            ] })
          )
        }),
        jsx(AcctAttachmentsView, { attachments: expense.attachments })
      ]
    })
  });
}

function ExpensesPage() {
  const categories = useApi('/api/accounts/expense-categories');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const globalRange = useDateRange();
  useEffect(() => {
    setFrom(globalRange.from);
    setTo(globalRange.to);
  }, [globalRange.from, globalRange.to]);
  const paged = usePaged('/api/accounts/expenses', { q: query.trim(), category: category === 'All' ? '' : category, from, to });
  const { rows, kpis, loading, error, reload } = paged;
  const total = paged.pagination ? paged.pagination.total : 0;

  const kpiData = kpis || {};
  const categoryNames = useMemo(
    () => Array.from(new Set(categories.rows.map((c) => c.name).filter(Boolean))).sort(),
    [categories.rows]
  );

  const visible = rows;

  const openDrawerForm = (expense) => {
    openDrawer(jsx(ExpenseDrawer, {
      expense,
      categories: categories.rows,
      onDone: reload
    }));
  };

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Total expenses', value: fmtINR(kpiData.totalExpenses), tone: 'amber', icon: 'card' },
          { label: 'Operating overhead', value: fmtINR(kpiData.operatingOverhead), tone: 'slate', icon: 'finance' },
          { label: 'Top category', value: asText(kpiData.topCategory), tone: 'cobalt', icon: 'tag' }
        ]
      }),
      error ? jsx(AcctBanner, { children: error }) : null,
      jsx(Card, {
        title: 'Expense ledger',
        sub: `${total} expense${total === 1 ? '' : 's'}`,
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(AcctToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search title, description, notes…' }),
                jsx(
                  'select', withChildren(
                  {
                    className: 'select acct-filter',
                    value: category,
                    'aria-label': 'Filter by category',
                    onChange: (ev) => setCategory(ev.target.value)
                  }, 
                  ['All', ...categoryNames].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                )),
                jsx('input', {
                  className: 'input acct-date',
                  type: 'date',
                  value: from,
                  'aria-label': 'From date',
                  onChange: (ev) => setFrom(ev.target.value)
                }),
                jsx('input', {
                  className: 'input acct-date',
                  type: 'date',
                  value: to,
                  'aria-label': 'To date',
                  onChange: (ev) => setTo(ev.target.value)
                }),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openDrawerForm(null),
                  children: [jsx(Icon, { name: 'plus' }), 'Add expense']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the expense ledger.' })
              : jsx(AcctTable, {
                  head: ['Date', 'Title', 'Description', 'Category', 'Payment mode', 'Branch', 'Amount', 'Notes', 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'card',
                  emptyTitle: query || category !== 'All' ? 'No matching expenses' : 'No expenses yet',
                  emptyText: 'Record the first operating expense to get started.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', { children: shortDate(row.date) }),
                        jsx('td', { children: jsx('b', { children: asText(row.title) }) }),
                        jsx('td', { children: asText(row.description) }),
                        jsx('td', { children: asText(row.category) }),
                        jsx('td', { children: asText(row.paymentMode) }),
                        jsx('td', { children: asText(row.branch) }),
                        jsx('td', { children: jsx('b', { children: fmtINR(row.amount) }) }),
                        jsx('td', { children: asText(row.notes) }),
                        jsx(ActionCell, {
                          children: jsx(RowActions, {
                            children: [
                              jsx(ActionButton, {
                                icon: 'eye',
                                label: 'View expense',
                                variant: 'view',
                                onClick: () => openDrawer(jsx(ExpenseViewDrawer, { expense: row, onEdit: () => openDrawerForm(row) }))
                              }),
                              jsx(ActionButton, {
                                icon: 'edit',
                                label: 'Edit expense',
                                variant: 'edit',
                                onClick: () => openDrawerForm(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'trash',
                                label: 'Delete expense',
                                variant: 'delete',
                                danger: true,
                                onClick: (ev) =>
                                  runDelete({
                                    url: `/api/accounts/expenses/${row._id}`,
                                    entity: 'expense',
                                    label: row.title,
                                    anchor: ev.currentTarget,
                                    onDone: reload
                                  })
                              })
                            ]
                          })
                        })
                      ]
                    })
                })
          ]
        })
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Inward & Expenses — READ-ONLY register of stock inward (procurement)
 * and operating expenses, with a "View" drawer per record.
 * Records are created / edited on their own modules (Expenses API etc.).
 * ------------------------------------------------------------------ */

function InwardExpenseViewDrawer({ row, onBack }) {
  const raw = row.raw || {};
  const isInward = row.kind === 'Inward';
  const items = isInward ? raw.items || [] : [];
  const payments = isInward ? (raw.payments || []).filter((p) => Number(p.amount) > 0) : [];

  const details = isInward
    ? [
        ['Inward number', raw.inwardNumber],
        ['Supplier', raw.supplier],
        ['Supplier invoice', raw.supplierInvoice],
        ['Date', shortDate(raw.date)],
        ['Category', raw.category],
        ['Branch', raw.branch],
        ['Status', raw.status],
        ['Notes', raw.notes]
      ]
    : [
        ['Title', raw.title],
        ['Category', raw.category],
        ['Date', shortDate(raw.date)],
        ['Payment mode', raw.paymentMode],
        ['Branch', raw.branch],
        ['Status', 'Paid'],
        ['Notes', raw.notes]
      ];

  const viewHeading = (text) =>
    jsx('h4', {
      style: { margin: '6px 2px 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' },
      children: text
    });

  const simpleTable = (head, body) =>
    jsx('div', {
      className: 'table-wrap acct-view-table',
      children: jsxs('table', {
        className: 'table',
        children: [
          jsx('thead', { children: jsx('tr', { children: head.map((h) => jsx('th', { key: h, children: h })) }) }),
          jsx('tbody', { children: body })
        ]
      })
    });

  return jsxs(ModalDrawer, {
    title: isInward ? `Stock inward ${raw.inwardNumber || ''}` : asText(raw.title),
    sub: isInward ? 'Read-only view of this procurement record.' : 'Read-only view of this expense.',
    foot: jsxs(Fragment, {
      children: [
        onBack ? jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: onBack, children: 'Back to list' }) : null,
        jsx('button', { type: 'button', className: 'btn btn--primary', onClick: closeDrawer, children: 'Close' })
      ]
    }),
    children: jsxs('div', {
      className: 'acct-stack',
      'data-view-drawer': row.kind,
      children: [
        jsx(PreviewBox, {
          title: isInward ? 'Inward details' : 'Expense details',
          children: jsx('div', { children: details.map(([label, value]) => jsx(PreviewRow, { key: label, label, value: asText(value) })) })
        }),
        isInward
          ? jsxs('div', {
              style: { display: 'flex', flexDirection: 'column', gap: 10 },
              children: [
                viewHeading('Procured items'),
                simpleTable(
                  ['Item', 'Qty', 'Unit cost', 'Line total'],
                  items.map((i, n) =>
                    jsx('tr', {
                      key: `i-${n}`,
                      children: [
                        jsx('td', {
                          key: 'a',
                          style: { whiteSpace: 'normal', textAlign: 'left' },
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [jsx('b', { children: asText(i.description) }), jsx('small', { children: asText(i.sku) })]
                          })
                        }),
                        jsx('td', { key: 'c', children: fmtCount(i.quantity) }),
                        jsx('td', { key: 'd', children: fmtINR(i.unitCost) }),
                        jsx('td', { key: 'e', children: jsx('b', { children: fmtINR(i.lineTotal) }) })
                      ]
                    })
                  )
                ),
                viewHeading('Payments'),
                payments.length
                  ? simpleTable(
                      ['Mode', 'Amount', 'Reference'],
                      payments.map((p, n) =>
                        jsx('tr', {
                          key: `p-${n}`,
                          children: [
                            jsx('td', { key: 'a', children: asText(p.mode) }),
                            jsx('td', { key: 'b', children: fmtINR(p.amount) }),
                            jsx('td', { key: 'c', children: asText(p.reference || p.utrReference || p.chequeNumber) })
                          ]
                        })
                      )
                    )
                  : jsx('span', { className: 'muted', children: 'No payments recorded — the inward is on credit.' })
              ]
            })
          : null,
        jsx(PreviewBox, {
          title: 'Amounts',
          children: jsxs('div', {
            children: [
              jsx(PreviewRow, { label: isInward ? 'Procurement value' : 'Amount', value: fmtINR(row.amount) }),
              jsx(PreviewRow, { label: 'Paid', value: fmtINR(row.paidAmount) }),
              jsx(PreviewRow, { label: 'Balance due', value: fmtINR(row.balanceDue), tone: 'total' })
            ]
          })
        }),
        jsx(AcctAttachmentsView, { attachments: raw.attachments })
      ]
    })
  });
}

// Group records that share a title (expenses) or supplier (inward) into one collection row.
function groupInexRows(list, keyOf) {
  const map = new Map();
  for (const r of list) {
    const k = String(keyOf(r) || '').trim().toLowerCase() || `__${r._id}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return [...map.values()]
    .map((rows) => {
      const sorted = [...rows].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return { rows: sorted, latest: sorted[0] };
    })
    .sort((a, b) => String(b.latest.date || '').localeCompare(String(a.latest.date || '')));
}

function InexGroupDrawer({ kind, label, rows }) {
  const isInward = kind === 'Inward';
  const total = Math.round(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100;
  const due = Math.round(rows.reduce((s, r) => s + (Number(r.balanceDue) || 0), 0) * 100) / 100;
  const open = (row) => openDrawer(jsx(InwardExpenseViewDrawer, { row, onBack: () => openDrawer(jsx(InexGroupDrawer, { kind, label, rows })) }));
  return jsxs(ModalDrawer, {
    title: asText(label),
    sub: `${rows.length} ${isInward ? 'stock inward record' : 'entr'}${isInward ? (rows.length === 1 ? '' : 's') : (rows.length === 1 ? 'y' : 'ies')} grouped under this ${isInward ? 'supplier' : 'title'}.`,
    foot: jsx('button', { type: 'button', className: 'btn btn--primary', onClick: closeDrawer, children: 'Close' }),
    children: jsxs('div', {
      className: 'acct-stack',
      'data-view-drawer': `${kind}-group`,
      children: [
        jsx(PreviewBox, {
          title: 'Collection summary',
          children: jsxs('div', {
            children: [
              jsx(PreviewRow, { label: isInward ? 'Supplier' : 'Title', value: asText(label) }),
              jsx(PreviewRow, { label: 'Entries', value: String(rows.length) }),
              jsx(PreviewRow, { label: 'Total amount', value: fmtINR(total) }),
              isInward ? jsx(PreviewRow, { label: 'Balance due', value: fmtINR(due) }) : null
            ]
          })
        }),
        jsx('div', {
          className: 'table-wrap acct-group-table',
          children: jsxs('table', {
            className: 'table',
            children: [
              jsx('thead', { children: jsx('tr', { children: ['S NO', 'Date', isInward ? 'Reference' : 'Details', isInward ? 'Status' : 'Payment', 'Amount', 'Actions'].map((h) => jsx('th', { key: h, children: h })) }) }),
              jsx('tbody', {
                children: rows.map((r, i) =>
                  jsx('tr', {
                    'data-row': '',
                    key: r._id,
                    children: [
                      jsx('td', { children: jsx('span', { className: `sno-pill ${i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: i + 1 }) }),
                      jsx('td', { children: shortDate(r.date) }),
                      jsx('td', { children: isInward ? asText(r.reference) : `${asText(r.category)} · ${asText(r.branch)}` }),
                      jsx('td', { children: isInward ? jsx(StatusCell, { value: r.status }) : asText(r.paymentMode) }),
                      jsx('td', { children: jsx('b', { children: fmtINR(r.amount) }) }),
                      jsx(ActionCell, {
                        children: jsx(RowActions, {
                          children: jsx(ActionButton, { icon: 'eye', label: isInward ? 'View stock inward' : 'View expense', variant: 'view', onClick: () => open(r) })
                        })
                      })
                    ]
                  })
                )
              })
            ]
          })
        })
      ]
    })
  });
}

function InwardExpensesPage() {
  const { rows, loading, error } = useApi('/api/accounts/inward-expenses');
  // No filter bar on this page: the date range comes from the header date filter.
  const globalRange = useDateRange();
  const from = globalRange.from;
  const to = globalRange.to;

  const visible = useMemo(
    () =>
      rows.filter((row) => {
        if (from && String(row.date || '') < from) return false;
        if (to && String(row.date || '') > to) return false;
        return true;
      }),
    [rows, from, to]
  );

  const inwards = useMemo(() => visible.filter((r) => r.kind === 'Inward'), [visible]);
  const expenses = useMemo(() => visible.filter((r) => r.kind === 'Expense'), [visible]);

  // Overall calculation — cancelled inwards are not counted
  const sum = (list, key) => Math.round(list.reduce((s, r) => s + (Number(r[key]) || 0), 0) * 100) / 100;
  const liveInwards = inwards.filter((r) => r.status !== 'Cancelled');
  const totals = {
    expenseCount: expenses.length,
    inwardCount: liveInwards.length,
    expenseTotal: sum(expenses, 'amount'),
    inwardTotal: sum(liveInwards, 'amount'),
    inwardPaid: sum(liveInwards, 'paidAmount'),
    inwardDue: sum(liveInwards, 'balanceDue')
  };
  totals.totalSpend = Math.round((totals.expenseTotal + totals.inwardTotal) * 100) / 100;
  totals.cashOut = Math.round((totals.expenseTotal + totals.inwardPaid) * 100) / 100;

  const inwardGroups = useMemo(() => groupInexRows(inwards, (r) => r.party), [inwards]);
  const expenseGroups = useMemo(() => groupInexRows(expenses, (r) => r.reference), [expenses]);

  const filtered = Boolean(from || to);
  const groupButton = (kind, label, rows) =>
    jsx(ActionCell, {
      children: jsx(RowActions, {
        children: jsx(ActionButton, {
          icon: 'eye',
          label: kind === 'Inward' ? 'View supplier entries' : 'View entries',
          variant: 'edit',
          onClick: () => openDrawer(jsx(InexGroupDrawer, { kind, label, rows }))
        })
      })
    });
  const countPill = (n) => (n > 1 ? jsx('span', { className: 'inex-count', children: `×${n}` }) : null);
  const viewButton = (row) =>
    jsx(ActionCell, {
      children: jsx(RowActions, {
        children: jsx(ActionButton, {
          icon: 'eye',
          label: row.kind === 'Inward' ? 'View stock inward' : 'View expense',
          variant: 'edit',
          onClick: () => openDrawer(jsx(InwardExpenseViewDrawer, { row }))
        })
      })
    });

  const uniq = (list, fn) => [...new Set(list.map(fn).filter(Boolean))];
  const inwardTable = jsx(AcctTable, {
    head: ['Date', 'Supplier', 'Amount', 'Balance due', 'Status', 'Actions'],
    rows: inwardGroups,
    emptyIcon: 'archive',
    emptyTitle: filtered ? 'No matching stock inward' : 'No stock inward yet',
    emptyText: 'Procurement recorded in Accounts appears here.',
    renderRow: (g) => {
      const latest = g.latest;
      const amount = sum(g.rows, 'amount');
      const due = sum(g.rows, 'balanceDue');
      const statuses = uniq(g.rows, (r) => r.status);
      return jsx('tr', {
        'data-row': '',
        'data-kind': 'Inward',
        key: `InwardG-${latest._id}`,
        children: [
          jsx('td', { children: shortDate(latest.date) }),
          jsx('td', {
            className: 'inex-wrap',
            children: jsxs('span', {
              className: 'li__main',
              children: [
                jsxs('b', { children: [asText(latest.party), ' ', countPill(g.rows.length)] }),
                jsx('small', { children: g.rows.length > 1 ? `${g.rows.length} stock inward records` : `${latest.reference} · ${latest.category} · ${latest.items} item${latest.items === 1 ? '' : 's'}` })
              ]
            })
          }),
          jsx('td', { children: jsx('b', { children: fmtINR(amount) }) }),
          jsx('td', {
            children: jsx('span', {
              className: due > 0 ? 'acct-due' : 'muted',
              children: fmtINR(due)
            })
          }),
          jsx('td', { children: statuses.length === 1 ? jsx(StatusCell, { value: statuses[0] }) : jsx('span', { className: 'muted', children: 'Mixed' }) }),
          groupButton('Inward', latest.party, g.rows)
        ]
      });
    }
  });

  const expenseTable = jsx(AcctTable, {
    head: ['Date', 'Title', 'Payment', 'Amount', 'Actions'],
    rows: expenseGroups,
    emptyIcon: 'card',
    emptyTitle: filtered ? 'No matching expenses' : 'No expenses yet',
    emptyText: 'Operating expenses recorded in Accounts appear here.',
    renderRow: (g) => {
      const latest = g.latest;
      const cats = uniq(g.rows, (r) => r.category);
      const modes = uniq(g.rows, (r) => r.paymentMode);
      return jsx('tr', {
        'data-row': '',
        'data-kind': 'Expense',
        key: `ExpenseG-${latest._id}`,
        children: [
          jsx('td', { children: shortDate(latest.date) }),
          jsx('td', {
            className: 'inex-wrap',
            children: jsxs('span', {
              className: 'li__main',
              children: [
                jsxs('b', { children: [asText(latest.reference), ' ', countPill(g.rows.length)] }),
                jsx('small', { children: `${cats.length === 1 ? cats[0] : 'Multiple categories'} · ${g.rows.length > 1 ? `${g.rows.length} entries` : asText(latest.branch)}` })
              ]
            })
          }),
          jsx('td', { children: modes.length === 1 ? asText(modes[0]) : 'Mixed' }),
          jsx('td', { children: jsx('b', { children: fmtINR(sum(g.rows, 'amount')) }) }),
          groupButton('Expense', latest.reference, g.rows)
        ]
      });
    }
  });

  const sideHead = (title, count, total) =>
    jsxs('div', {
      className: 'inex-head',
      children: [
        jsxs('div', {
          children: [jsx('h3', { className: 'inex-head__title', children: title }), jsx('small', { className: 'inex-head__sub', children: count })]
        }),
        jsx('b', { className: 'inex-head__total', children: total })
      ]
    });

  const summaryCell = (id, label, value, note, tone) =>
    jsxs('div', {
      className: `inex-sum__cell${tone ? ` is-${tone}` : ''}`,
      'data-sum': id,
      children: [
        jsx('span', { className: 'inex-sum__label', children: label }),
        jsx('b', { className: 'inex-sum__value', children: value }),
        note ? jsx('small', { className: 'inex-sum__note', children: note }) : null
      ]
    });

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      error ? jsx(AcctBanner, { children: error }) : null,
      jsxs('div', {
        className: 'inex-split',
        children: [
          jsx(Card, {
            flush: true,
            children: jsxs('div', {
              'data-side': 'inward',
              children: [
                sideHead('Inward', `${inwardGroups.length} supplier${inwardGroups.length === 1 ? '' : 's'} · ${inwards.length} record${inwards.length === 1 ? '' : 's'}`, fmtINR(sum(inwards, 'amount'))),
                loading
                  ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching stock inward.' })
                  : inwardTable
              ]
            })
          }),
          jsx(Card, {
            flush: true,
            children: jsxs('div', {
              'data-side': 'expense',
              children: [
                sideHead('Expense', `${expenseGroups.length} title${expenseGroups.length === 1 ? '' : 's'} · ${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}`, fmtINR(sum(expenses, 'amount'))),
                loading
                  ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching expenses.' })
                  : expenseTable
              ]
            })
          })
        ]
      }),
      jsx(Card, {
        title: 'Overall calculation',
        sub: filtered ? 'Based on the date range selected in the header.' : 'Stock inward + expenses across all branches.',
        children: jsxs('div', {
          className: 'inex-sum',
          'data-overall': '',
          children: [
            summaryCell('inward', 'Total inward', fmtINR(totals.inwardTotal), `${totals.inwardCount} record${totals.inwardCount === 1 ? '' : 's'}`, 'teal'),
            summaryCell('expense', 'Total expense', fmtINR(totals.expenseTotal), `${totals.expenseCount} record${totals.expenseCount === 1 ? '' : 's'}`, 'amber'),
            summaryCell('spend', 'Total spend', fmtINR(totals.totalSpend), `${fmtINR(totals.inwardTotal)} + ${fmtINR(totals.expenseTotal)}`, 'cobalt'),
            summaryCell('paid', 'Paid out', fmtINR(totals.cashOut), `Expenses + ${fmtINR(totals.inwardPaid)} paid to suppliers`, 'slate'),
            summaryCell('due', 'Supplier payable', fmtINR(totals.inwardDue), 'Balance due on stock inward', totals.inwardDue > 0 ? 'bad' : 'good')
          ]
        })
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * EMI categories — product-wise EMI plans
 * (end date, monthly EMI and totals are derived from the inputs)
 * ------------------------------------------------------------------ */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => {
  const parts = String(ym || '').split('-');
  return parts.length < 2 ? '—' : `${MONTH_NAMES[Number(parts[1]) - 1] || parts[1]} ${parts[0]}`;
};

/** Add whole calendar months to YYYY-MM-DD (day clamped to the month length). */
function emiAddMonths(ymd, months) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return '';
  const total = Number(m[2]) - 1 + months;
  const y = Number(m[1]) + Math.floor(total / 12);
  const mo = ((total % 12) + 12) % 12 + 1;
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return `${y}-${String(mo).padStart(2, '0')}-${String(Math.min(Number(m[3]), dim)).padStart(2, '0')}`;
}

/**
 * Live PREVIEW only — the server recomputes and stores the authoritative
 * values on save (reducing-balance EMI, first EMI due on the start date).
 */
function previewEmi({ principal, emiCount, interestRate, startDate, emiDate, processingCharges, transactionFee, initialPayment }) {
  const initial = Math.max(0, Math.round((Number(initialPayment) || 0) * 100) / 100);
  const P = Math.round((Number(principal) - initial) * 100) / 100;
  if (!(Number(principal) > 0) || initial >= Number(principal)) return null;
  const n = Number(emiCount);
  const rate = Number(interestRate || 0);
  if (!(P > 0) || !Number.isInteger(n) || n < 1 || n > 600 || !(rate >= 0) || !startDate) return null;
  const r = rate / 1200;
  const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const emiAmount = Math.round(emi * 100) / 100;
  let balance = P;
  let total = 0;
  for (let i = 1; i <= n; i += 1) {
    const interest = Math.round(balance * r * 100) / 100;
    const principalPart = i === n ? Math.round(balance * 100) / 100 : Math.round((emiAmount - interest) * 100) / 100;
    total += i === n ? principalPart + interest : emiAmount;
    balance = Math.round((balance - principalPart) * 100) / 100;
  }
  total = Math.round(total * 100) / 100;
  const effectiveEmiDate = (emiDate && String(emiDate).trim()) || startDate;
  const endDate = emiAddMonths(effectiveEmiDate, n - 1);
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const processing = Math.max(0, r2(processingCharges));
  const fee = Math.max(0, r2(transactionFee));
  const totalFees = r2(fee * n);
  return {
    emiAmount,
    totalPayable: total,
    totalInterest: Math.round((total - P) * 100) / 100,
    emiDate: effectiveEmiDate,
    endDate,
    endMonth: endDate.slice(0, 7),
    months: n,
    processing,
    fee,
    totalFees,
    totalCharges: r2(processing + totalFees),
    totalCost: r2(initial + total + processing + totalFees),
    initial,
    financed: P,
    monthlyOutflow: r2(emiAmount + fee)
  };
}

function EmiDrawer({ emi, onDone }) {
  const editing = Boolean(emi);
  const [values, setValues] = useState(() => ({
    productName: emi ? emi.productName || '' : '',
    category: emi ? emi.category || '' : '',
    principal: emi ? emi.principal : '',
    emiCount: emi ? emi.emiCount : '',
    interestRate: emi ? emi.interestRate : '',
    startDate: emi ? emi.startDate || '' : '',
    emiDate: emi ? (emi.emiDate || emi.startDate || '') : '',
    paidCount: emi ? emi.paidCount || 0 : 0,
    initialPayment: emi ? emi.initialPayment || 0 : '',
    processingCharges: emi ? emi.processingCharges || 0 : '',
    transactionFee: emi ? emi.transactionFee || 0 : '',
    branch: emi ? emi.branch || '' : '',
    notes: emi ? emi.notes || '' : '',
    attachments: emi ? emi.attachments || [] : []
  }));
  const [saving, setSaving] = useState(false);
  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const preview = previewEmi(values);

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    const count = Number(values.emiCount);
    let problem = '';
    if (!values.productName.trim()) problem = 'Product name is required';
    else if (!values.category) problem = 'Category is required';
    else if (!(Number(values.principal) > 0)) problem = 'Product amount must be greater than 0';
    else if (!Number.isInteger(count) || count < 1 || count > 600) problem = 'Number of EMIs must be a whole number from 1 to 600';
    else if (values.interestRate === '' || Number(values.interestRate) < 0 || Number(values.interestRate) > 100) problem = 'Interest percentage must be between 0 and 100';
    else if (!values.startDate) problem = 'Start date is required';
    else if (Number(values.paidCount) > count) problem = 'EMIs paid cannot exceed the number of EMIs';
    else if (values.initialPayment !== '' && !(Number(values.initialPayment) >= 0)) problem = 'Initial payment must be 0 or more';
    else if (Number(values.initialPayment || 0) >= Number(values.principal)) problem = 'Initial payment must be less than the product amount';
    else if (values.processingCharges !== '' && !(Number(values.processingCharges) >= 0)) problem = 'Processing charges must be 0 or more';
    else if (values.transactionFee !== '' && !(Number(values.transactionFee) >= 0)) problem = 'Transaction fee must be 0 or more';
    if (problem) {
      toast(problem, { icon: 'x' });
      return;
    }
    setSaving(true);
    const url = editing ? `/api/accounts/emi/${emi._id}` : '/api/accounts/emi';
    const res = await apiFetch(url, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify({
        productName: values.productName.trim(),
        category: values.category,
        principal: toNum(values.principal),
        emiCount: count,
        interestRate: toNum(values.interestRate),
        startDate: values.startDate,
        emiDate: values.emiDate || values.startDate,
        paidCount: toNum(values.paidCount),
        initialPayment: toNum(values.initialPayment),
        processingCharges: toNum(values.processingCharges),
        transactionFee: toNum(values.transactionFee),
        branch: (values.branch || '').trim() || 'All Branches',
        notes: values.notes.trim(),
        attachments: values.attachments || []
      })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'EMI plan saved', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not save the EMI plan', { icon: 'x' });
    }
  };

  const numberInput = (name, props) =>
    jsx('input', Object.assign({
      className: 'input',
      type: 'number',
      name,
      step: 'any',
      value: values[name],
      onChange: (ev) => setValue(name, ev.target.value)
    }, props || {}));

  return jsxs(ModalDrawer, {
    title: editing ? `Edit ${emi.emiNumber}` : 'New EMI plan',
    sub: 'End date, monthly EMI and totals are calculated automatically.',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-emi-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Saving…' : editing ? 'Save EMI plan' : 'Create EMI plan'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-emi-form',
      noValidate: true,
      onSubmit: submit,
      children: jsxs('div', {
        className: 'acct-stack',
        children: [
          jsxs('div', {
            className: 'form-grid',
            children: [
              jsx(AcctField, { label: 'Product name', required: true, className: 'span-2', children: jsx('input', {
                className: 'input',
                name: 'productName',
                value: values.productName,
                placeholder: 'e.g. Commercial Treadmill',
                onChange: (ev) => setValue('productName', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Category', required: true, children: jsx(
                'select', withChildren(
                { className: 'select', name: 'category', value: values.category, onChange: (ev) => setValue('category', ev.target.value) },
                [
                  jsx('option', { value: '', key: '__none', children: 'Select category' }),
                  ...EMI_CATEGORIES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                ]
              )) }),
              jsx(AcctField, { label: 'Product amount (₹)', required: true, children: numberInput('principal', { min: '0', placeholder: '0' }) }),
              jsx(AcctField, { label: 'Number of EMIs (months)', required: true, children: numberInput('emiCount', { min: '1', max: '600', step: '1', placeholder: '12' }) }),
              jsx(AcctField, { label: 'Interest (% per year)', required: true, children: numberInput('interestRate', { min: '0', max: '100', placeholder: '0' }) }),
              jsx(AcctField, { label: 'Start date', required: true, children: jsx('input', {
                className: 'input',
                type: 'date',
                name: 'startDate',
                value: values.startDate,
                onChange: (ev) => {
                  const d = ev.target.value;
                  setValue('startDate', d);
                  if (!values.emiDate || values.emiDate === values.startDate) setValue('emiDate', d);
                }
              }) }),
              jsx(AcctField, { label: 'EMI date', children: jsx('input', {
                className: 'input',
                type: 'date',
                name: 'emiDate',
                value: values.emiDate,
                onChange: (ev) => setValue('emiDate', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'EMIs already paid', children: numberInput('paidCount', { min: '0', step: '1' }) }),
              jsx(AcctField, { label: 'Initial payment (₹, paid upfront)', children: numberInput('initialPayment', { min: '0', placeholder: '0' }) }),
              jsx(AcctField, { label: 'Processing charges (₹, one-time)', children: numberInput('processingCharges', { min: '0', placeholder: '0' }) }),
              jsx(AcctField, { label: 'Transaction fee (₹ per EMI)', children: numberInput('transactionFee', { min: '0', placeholder: '0' }) }),
              jsx(AcctField, { label: 'Branch', className: 'span-2', children: jsx(BranchSelect, { value: values.branch, onChange: (v) => setValue('branch', v) }) }),
              jsx(AcctField, { label: 'Notes', className: 'span-2', children: jsx('input', {
                className: 'input',
                name: 'notes',
                value: values.notes,
                placeholder: 'Lender, agreement number…',
                onChange: (ev) => setValue('notes', ev.target.value)
              }) }),
              jsx(AcctAttachmentsField, {
                attachments: values.attachments,
                onChange: (att) => setValue('attachments', att),
                label: 'EMI Agreements & Sanction Slips (Images & PDFs)'
              })
            ]
          }),
          jsx(PreviewBox, {
            title: 'EMI preview (auto-calculated)',
            children: preview
              ? jsxs('div', {
                  'data-emi-preview': '',
                  children: [
                    jsx(PreviewRow, { label: 'Initial payment (upfront)', value: fmtINR(preview.initial) }),
                    jsx(PreviewRow, { label: 'Amount financed', value: fmtINR(preview.financed) }),
                    jsx(PreviewRow, { label: 'Monthly EMI', value: fmtINR(preview.emiAmount), tone: 'total' }),
                    jsx(PreviewRow, { label: 'EMI date', value: shortDate(preview.emiDate || values.emiDate || values.startDate) }),
                    jsx(PreviewRow, { label: 'End date', value: shortDate(preview.endDate) }),
                    jsx(PreviewRow, { label: 'End month', value: `${monthLabel(preview.endMonth)} · ${preview.months} month${preview.months === 1 ? '' : 's'}` }),
                    jsx(PreviewRow, { label: 'Total interest', value: fmtINR(preview.totalInterest) }),
                    jsx(PreviewRow, { label: 'Total payable (all EMIs)', value: fmtINR(preview.totalPayable) }),
                    jsx(PreviewRow, { label: 'Processing charges', value: fmtINR(preview.processing) }),
                    jsx(PreviewRow, { label: `Transaction fees (${preview.months} × ${fmtINR(preview.fee)})`, value: fmtINR(preview.totalFees) }),
                    jsx(PreviewRow, { label: 'Monthly outflow (EMI + fee)', value: fmtINR(preview.monthlyOutflow) }),
                    jsx(PreviewRow, { label: 'Total cost incl. charges', value: fmtINR(preview.totalCost), tone: 'total' })
                  ]
                })
              : jsx('span', {
                  className: 'muted',
                  children: 'Enter the amount, number of EMIs, interest and start date to see the EMI and end month.'
                })
          })
        ]
      })
    })
  });
}

function EmiPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const paged = usePaged('/api/accounts/emi', { q: query.trim(), category: category === 'All' ? '' : category, status: status === 'All' ? '' : status });
  const { rows, kpis, loading, error, reload } = paged;
  const total = paged.pagination ? paged.pagination.total : 0;

  const kpiData = kpis || {};
  const visible = rows;

  const openForm = (emi) => openDrawer(jsx(EmiDrawer, { emi, onDone: reload }));

  const markPaid = async (row) => {
    const res = await apiFetch(`/api/accounts/emi/${row._id}/pay`, { method: 'POST' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'EMI marked as paid', { icon: 'check' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not record the EMI payment', { icon: 'x' });
    }
  };

  const filterSelect = (value, setter, label, options) =>
    jsx(
      'select', withChildren(
      { className: 'select acct-filter', value, 'aria-label': label, onChange: (ev) => setter(ev.target.value) },
      ['All', ...options].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
    ));

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'EMI plans', value: fmtCount(kpiData.totalPlans), tone: 'cobalt', icon: 'archive' },
          { label: 'Running EMIs', value: fmtCount(kpiData.activeEmis), tone: 'teal', icon: 'clock' },
          { label: 'Monthly EMI outflow', value: fmtINR(kpiData.monthlyOutflow), tone: 'slate', icon: 'card' },
          { label: 'Outstanding balance', value: fmtINR(kpiData.outstanding), tone: 'amber', icon: 'finance' }
        ]
      }),
      error ? jsx(AcctBanner, { children: error }) : null,
      jsx(Card, {
        title: 'EMI register',
        sub: `${total} plan${total === 1 ? '' : 's'}`,
        flush: true,
        children: jsxs('div', {
          className: 'acct-emi',
          children: [
            jsx(AcctToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search product, category…' }),
                filterSelect(category, setCategory, 'Filter by category', EMI_CATEGORIES),
                filterSelect(status, setStatus, 'Filter by status', EMI_STATUSES),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openForm(null),
                  children: [jsx(Icon, { name: 'plus' }), 'New EMI plan']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the EMI register.' })
              : jsx(AcctTable, {
                  head: ['EMI #', 'Product', 'Category', 'Amount', 'Initial', 'Interest', 'Processing', 'Txn fee', 'EMIs', 'Monthly EMI', 'Start', 'EMI date', 'End month', 'Outstanding', 'Status', 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'archive',
                  emptyTitle: query || category !== 'All' || status !== 'All' ? 'No matching EMI plans' : 'No EMI plans yet',
                  emptyText: 'Add the first product on EMI to start tracking instalments.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', { children: jsx('b', { children: asText(row.emiNumber) }) }),
                        jsx('td', {
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [jsx('b', { children: asText(row.productName) }), jsx('small', { children: asText(row.branch) })]
                          })
                        }),
                        jsx('td', { children: asText(row.category) }),
                        jsx('td', { children: fmtINR(row.principal) }),
                        jsx('td', { children: jsx('span', { className: Number(row.initialPayment) > 0 ? '' : 'muted', children: fmtINR(row.initialPayment) }) }),
                        jsx('td', { children: `${Number(row.interestRate)}%` }),
                        jsx('td', { children: jsx('span', { className: Number(row.processingCharges) > 0 ? '' : 'muted', children: fmtINR(row.processingCharges) }) }),
                        jsx('td', { children: jsx('span', { className: Number(row.transactionFee) > 0 ? '' : 'muted', children: fmtINR(row.transactionFee) }) }),
                        jsx('td', { children: jsx('span', { className: 'muted', children: `${row.paidCount} / ${row.emiCount}` }) }),
                        jsx('td', { children: jsx('b', { children: fmtINR(row.emiAmount) }) }),
                        jsx('td', { children: shortDate(row.startDate) }),
                        jsx('td', { children: jsx('span', { className: row.emiDate ? '' : 'muted', children: shortDate(row.emiDate || row.startDate) }) }),
                        jsx('td', {
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [jsx('b', { children: monthLabel(row.endMonth) }), jsx('small', { children: shortDate(row.endDate) })]
                          })
                        }),
                        jsx('td', {
                          children: jsx('span', {
                            className: Number(row.outstandingAmount || 0) > 0 ? 'acct-due' : 'muted',
                            children: fmtINR(row.outstandingAmount)
                          })
                        }),
                        jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                        jsx(ActionCell, {
                          children: jsx(RowActions, {
                            children: [
                              jsx(ActionButton, {
                                icon: 'check',
                                label: 'Mark next EMI paid',
                                variant: 'edit',
                                disabled: row.status === 'Completed',
                                onClick: () => markPaid(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'edit',
                                label: 'Edit EMI plan',
                                variant: 'edit',
                                onClick: () => openForm(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'trash',
                                label: 'Delete EMI plan',
                                variant: 'delete',
                                danger: true,
                                onClick: (ev) =>
                                  runDelete({
                                    url: `/api/accounts/emi/${row._id}`,
                                    entity: 'EMI plan',
                                    label: row.productName,
                                    anchor: ev.currentTarget,
                                    onDone: reload
                                  })
                              })
                            ]
                          })
                        })
                      ]
                    })
                })
          ]
        })
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Credit notes
 * ------------------------------------------------------------------ */

const emptyCreditItem = () => ({ description: '', quantity: '', rate: '' });

function CreditNoteDrawer({ note, onDone }) {
  const editing = Boolean(note);
  const [values, setValues] = useState(() => ({
    customer: note ? note.customer || '' : '',
    referenceInvoice: note ? note.referenceInvoice || '' : '',
    reason: note ? note.reason || '' : '',
    settlementMethod: note ? note.settlementMethod || '' : '',
    paymentMode: note ? note.paymentMode || '' : '',
    status: note ? note.status || '' : '',
    branch: note ? note.branch || '' : '',
    notes: note ? note.notes || '' : '',
    attachments: note ? note.attachments || [] : [],
    items: note && (note.items || []).length
      ? note.items.map((i) => ({
          description: i.description || '',
          quantity: Number(i.quantity || 1),
          rate: Number(i.rate || 0)
        }))
      : [emptyCreditItem()]
  }));
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const setItem = (index, key, value) =>
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    }));

  const totalCredit = values.items.reduce((s, i) => s + toNum(i.quantity) * toNum(i.rate), 0);

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    if (!values.customer.trim()) {
      toast('Customer is required', { icon: 'x' });
      return;
    }
    const usable = values.items.filter((i) => i.description.trim());
    if (!usable.length) {
      toast('At least one credit item is required', { icon: 'x' });
      return;
    }
    setSaving(true);
    const url = editing ? `/api/accounts/credit-notes/${note._id}` : '/api/accounts/credit-notes';
    const res = await apiFetch(url, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify({
        customer: values.customer.trim(),
        referenceInvoice: values.referenceInvoice.trim(),
        reason: values.reason,
        settlementMethod: values.settlementMethod,
        paymentMode: values.paymentMode,
        status: values.status,
        branch: values.branch.trim() || 'All Branches',
        notes: values.notes.trim(),
        attachments: values.attachments || [],
        items: usable.map((i) => ({
          description: i.description.trim(),
          quantity: Math.max(1, toNum(i.quantity)),
          rate: toNum(i.rate)
        }))
      })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Credit note saved', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not save the credit note', { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: editing ? `Edit ${note.creditNoteNumber}` : 'Create credit note',
    sub: 'Credits reduce the invoice outstanding or refund cash.',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-credit-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Saving…' : editing ? 'Save credit note' : 'Create credit note'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-credit-form',
      noValidate: true,
      onSubmit: submit,
      children: jsxs('div', {
        className: 'acct-stack',
        children: [
          jsxs('div', {
            className: 'form-grid',
            children: [
              jsx(AcctField, { label: 'Customer', required: true, children: jsx('input', {
                className: 'input',
                value: values.customer,
                placeholder: 'Customer name',
                onChange: (ev) => setValue('customer', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Reference invoice', children: jsx('input', {
                className: 'input',
                value: values.referenceInvoice,
                placeholder: 'INV-000001',
                onChange: (ev) => setValue('referenceInvoice', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Reason', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.reason, onChange: (ev) => setValue('reason', ev.target.value) }, 
                CREDIT_REASONS.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Settlement method', children: jsx(
                'select', withChildren(
                {
                  className: 'select',
                  value: values.settlementMethod,
                  onChange: (ev) => setValue('settlementMethod', ev.target.value)
                }, 
                SETTLEMENT_METHODS.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Payment mode', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.paymentMode, onChange: (ev) => setValue('paymentMode', ev.target.value) }, 
                SALES_PAYMENT_MODES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Status', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.status, onChange: (ev) => setValue('status', ev.target.value) }, 
                CREDIT_STATUSES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Branch', children: jsx(BranchSelect, { value: values.branch, onChange: (v) => setValue('branch', v) }) })
            ]
          }),
          jsxs('div', {
            className: 'acct-lines',
            children: [
              jsxs('div', {
                className: 'acct-lines__head',
                children: [
                  jsx('b', { children: 'Credit items' }),
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--sm',
                    onClick: () => setValues((prev) => ({ ...prev, items: [...prev.items, emptyCreditItem()] })),
                    children: [jsx(Icon, { name: 'plus' }), 'Add item']
                  })
                ]
              }),
              jsx('div', {
                className: 'table-wrap',
                children: jsxs('table', {
                  className: 'table',
                  children: [
                    jsx('thead', {
                      children: jsx('tr', {
                        children: [
                          jsx('th', { key: 'h1', children: 'Description' }),
                          jsx('th', { key: 'h2', children: 'Qty' }),
                          jsx('th', { key: 'h3', children: 'Rate' }),
                          jsx('th', { key: 'h4', children: 'Credit' }),
                          jsx('th', { key: 'h5', children: '' })
                        ]
                      })
                    }),
                    jsx('tbody', {
                      children: values.items.map((item, index) =>
                        jsx('tr', {
                          'data-row': '',
                          key: `credit-${index}`,
                          children: [
                            jsx('td', { children: jsx('input', {
                              className: 'input',
                              value: item.description,
                              placeholder: 'What is being credited',
                              onChange: (ev) => setItem(index, 'description', ev.target.value)
                            }) }),
                            jsx('td', { children: jsx('input', {
                              className: 'input',
                              type: 'number',
                              min: '1',
                              step: 'any',
                              value: item.quantity,
                              onChange: (ev) => setItem(index, 'quantity', ev.target.value)
                            }) }),
                            jsx('td', { children: jsx('input', {
                              className: 'input',
                              type: 'number',
                              min: '0',
                              step: 'any',
                              value: item.rate,
                              onChange: (ev) => setItem(index, 'rate', ev.target.value)
                            }) }),
                            jsx('td', { children: jsx('b', { children: fmtINR(toNum(item.quantity) * toNum(item.rate)) }) }),
                            jsx('td', { children: jsx('button', {
                              type: 'button',
                              className: 'btn btn--sm btn--ghost',
                              onClick: () => setValues((prev) => ({
                                ...prev,
                                items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items
                              })),
                              children: 'Remove'
                            }) })
                          ]
                        })
                      )
                    })
                  ]
                })
              })
            ]
          }),
          jsx(AcctField, { label: 'Notes', children: jsx('textarea', {
            className: 'textarea',
            rows: 2,
            value: values.notes,
            placeholder: 'Why is this credit raised?',
            onChange: (ev) => setValue('notes', ev.target.value)
          }) }),
          jsx(AcctAttachmentsField, {
            attachments: values.attachments,
            onChange: (att) => setValue('attachments', att),
            label: 'Credit Note Documents (Images & PDFs)'
          }),
          jsx(PreviewBox, {
            title: 'Credit preview',
            children: jsx(PreviewRow, { label: 'Total credit', value: fmtINR(totalCredit), tone: 'total' })
          })
        ]
      })
    })
  });
}

function ApplyCreditDrawer({ note, onDone }) {
  const { rows, loading } = useApi('/api/accounts/sales');
  const [invoiceId, setInvoiceId] = useState(note.referenceInvoiceId || '');
  const [saving, setSaving] = useState(false);

  const open = useMemo(
    () => rows.filter((r) => Number(r.outstandingAmount || 0) > 0 && r.status !== 'Cancelled'),
    [rows]
  );

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    if (!invoiceId) {
      toast('Choose the invoice to apply the credit to', { icon: 'x' });
      return;
    }
    setSaving(true);
    const res = await apiFetch(`/api/accounts/credit-notes/${note._id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ invoiceId })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Credit note applied', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not apply the credit note', { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: `Apply ${note.creditNoteNumber}`,
    sub: `${note.customer} — credit of ${fmtINR(note.totalCredit)}`,
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-apply-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Applying…' : 'Apply credit'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-apply-form',
      noValidate: true,
      onSubmit: submit,
      children: loading
        ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching open invoices.' })
        : jsx(AcctField, {
            label: 'Invoice with an outstanding balance',
            required: true,
            children: jsx(
              'select', withChildren(
              { className: 'select', value: invoiceId, onChange: (ev) => setInvoiceId(ev.target.value) }, 
              [
                jsx('option', { value: '', key: '__none', children: 'Select an invoice' }),
                ...open.map((r) =>
                  jsx('option', {
                    value: r._id,
                    key: r._id,
                    children: `${r.invoiceNumber} · ${r.customer} · ${fmtINR(r.outstandingAmount)}`
                  })
                )
              ]
            ))
          })
    })
  });
}

function CreditNotesPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const paged = usePaged('/api/accounts/credit-notes', { q: query.trim(), status: status === 'All' ? '' : status });
  const { rows, kpis, loading, error, reload } = paged;
  const total = paged.pagination ? paged.pagination.total : 0;

  const kpiData = kpis || {};
  const visible = rows;

  const openDrawerForm = (note) => {
    openDrawer(jsx(CreditNoteDrawer, { note, onDone: reload }));
  };
  const openApply = (note) => {
    openDrawer(jsx(ApplyCreditDrawer, { note, onDone: reload }));
  };

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Credit notes', value: fmtCount(kpiData.totalNotes), tone: 'cobalt', icon: 'layers' },
          { label: 'Credit value', value: fmtINR(kpiData.totalCreditValue), tone: 'amber', icon: 'finance' },
          { label: 'Refunded', value: fmtINR(kpiData.refundedCash), tone: 'slate', icon: 'card' },
          { label: 'Applied to invoices', value: fmtINR(kpiData.appliedToInvoices), tone: 'teal', icon: 'check' }
        ]
      }),
      error ? jsx(AcctBanner, { children: error }) : null,
      jsx(Card, {
        title: 'Credit note ledger',
        sub: `${total} credit note${total === 1 ? '' : 's'}`,
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(AcctToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search credit note, customer…' }),
                jsx(
                  'select', withChildren(
                  {
                    className: 'select acct-filter',
                    value: status,
                    'aria-label': 'Filter by status',
                    onChange: (ev) => setStatus(ev.target.value)
                  }, 
                  ['All', ...CREDIT_STATUSES].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                )),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openDrawerForm(null),
                  children: [jsx(Icon, { name: 'plus' }), 'Create credit note']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the credit note ledger.' })
              : jsx(AcctTable, {
                  head: ['Credit note #', 'Customer', 'Reference', 'Reason', 'Items', 'Total credit', 'Settlement', 'Refunded', 'Applied', 'Status', 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'layers',
                  emptyTitle: query || status !== 'All' ? 'No matching credit notes' : 'No credit notes yet',
                  emptyText: 'Raise the first credit note to start the returns ledger.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', { children: jsx('b', { children: asText(row.creditNoteNumber) }) }),
                        jsx('td', { children: asText(row.customer) }),
                        jsx('td', { children: asText(row.referenceInvoice) }),
                        jsx('td', { children: asText(row.reason) }),
                        jsx('td', {
                          children: jsx('span', {
                            className: 'muted',
                            children: `${(row.items || []).length} item${(row.items || []).length === 1 ? '' : 's'}`
                          })
                        }),
                        jsx('td', { children: jsx('b', { children: fmtINR(row.totalCredit) }) }),
                        jsx('td', { children: asText(row.settlementMethod) }),
                        jsx('td', { children: fmtINR(row.refundedAmount) }),
                        jsx('td', { children: fmtINR(row.appliedAmount) }),
                        jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                        jsx(ActionCell, {
                          children: jsx(RowActions, {
                            children: [
                              jsx(ActionButton, {
                                icon: 'edit',
                                label: 'Edit credit note',
                                variant: 'edit',
                                disabled: row.status === 'Applied' || row.status === 'Cancelled',
                                onClick: () => openDrawerForm(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'check',
                                label: 'Apply credit note',
                                variant: 'apply',
                                disabled: row.status === 'Applied' || row.status === 'Cancelled',
                                onClick: () => openApply(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'trash',
                                label: 'Delete credit note',
                                variant: 'delete',
                                danger: true,
                                onClick: (ev) =>
                                  runDelete({
                                    url: `/api/accounts/credit-notes/${row._id}`,
                                    entity: 'credit note',
                                    label: row.creditNoteNumber,
                                    anchor: ev.currentTarget,
                                    onDone: reload
                                  })
                              })
                            ]
                          })
                        })
                      ]
                    })
                })
          ]
        })
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Asset records
 * ------------------------------------------------------------------ */

function AssetDrawer({ asset, categories, onDone }) {
  const editing = Boolean(asset);
  const [values, setValues] = useState(() => ({
    assetId: asset ? asset.assetId || '' : '',
    assetName: asset ? asset.assetName || '' : '',
    category: asset ? asset.category || '' : '',
    quantity: asset ? (asset.quantity != null ? asset.quantity : '') : '',
    purchaseDate: asset ? asset.purchaseDate || '' : '',
    purchaseCost: asset ? (asset.purchaseCost != null ? asset.purchaseCost : '') : '',
    usefulLifeYears: asset ? (asset.usefulLifeYears != null ? asset.usefulLifeYears : '') : '',
    depreciationMethod: asset ? asset.depreciationMethod || '' : '',
    depreciationRate: asset ? (asset.depreciationRate != null ? asset.depreciationRate : '') : '',
    salvageValue: asset ? (asset.salvageValue != null ? asset.salvageValue : '') : '',
    location: asset ? asset.location || '' : '',
    assignedEmployee: asset ? asset.assignedEmployee || '' : '',
    paymentType: asset ? asset.paymentType || '' : '',
    paymentMode: asset ? asset.paymentMode || '' : '',
    status: asset ? asset.status || '' : '',
    branch: asset ? asset.branch || '' : '',
    notes: asset ? asset.notes || '' : '',
    attachments: asset ? asset.attachments || [] : []
  }));
  const [saving, setSaving] = useState(false);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const annualDepreciation =
    values.depreciationMethod === 'Straight Line'
      ? Math.max(0, (toNum(values.purchaseCost) - toNum(values.salvageValue)) / Math.max(1, toNum(values.usefulLifeYears)))
      : toNum(values.purchaseCost) * (toNum(values.depreciationRate) / 100);

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    if (!values.assetName.trim()) {
      toast('Asset name is required', { icon: 'x' });
      return;
    }
    if (!values.category) {
      toast('Asset category is required', { icon: 'x' });
      return;
    }
    if (!values.purchaseDate) {
      toast('Purchase date is required', { icon: 'x' });
      return;
    }
    const payload = {
      assetName: values.assetName.trim(),
      category: values.category,
      quantity: Math.max(1, toNum(values.quantity)),
      purchaseDate: values.purchaseDate,
      purchaseCost: toNum(values.purchaseCost),
      usefulLifeYears: toNum(values.usefulLifeYears),
      depreciationMethod: values.depreciationMethod,
      depreciationRate: toNum(values.depreciationRate),
      salvageValue: toNum(values.salvageValue),
      location: values.location.trim(),
      assignedEmployee: values.assignedEmployee.trim(),
      paymentType: values.paymentType,
      paymentMode: values.paymentMode,
      status: values.status,
      branch: values.branch.trim() || 'All Branches',
      notes: values.notes.trim(),
      attachments: values.attachments || []
    };
    if (!editing && values.assetId.trim()) payload.assetId = values.assetId.trim();
    setSaving(true);
    const url = editing ? `/api/accounts/assets/${asset._id}` : '/api/accounts/assets';
    const res = await apiFetch(url, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Asset saved', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not save the asset', { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: editing ? `Edit ${asset.assetName}` : 'Add asset',
    sub: editing ? asset.assetId : 'Register a fixed asset and its depreciation schedule.',
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-asset-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Saving…' : editing ? 'Save asset' : 'Add asset'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-asset-form',
      noValidate: true,
      onSubmit: submit,
      children: jsxs('div', {
        className: 'acct-stack',
        children: [
          jsxs('div', {
            className: 'form-grid',
            children: [
              jsx(AcctField, { label: 'Asset ID', children: jsx('input', {
                className: 'input',
                value: values.assetId,
                disabled: editing,
                placeholder: 'Auto-generated if left blank',
                onChange: (ev) => setValue('assetId', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Asset name', required: true, children: jsx('input', {
                className: 'input',
                value: values.assetName,
                placeholder: 'Treadmill — ProLine',
                onChange: (ev) => setValue('assetName', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Category', required: true, children: jsx(
                'select', withChildren(
                { className: 'select', value: values.category, onChange: (ev) => setValue('category', ev.target.value) }, 
                categories.length
                  ? categories.map((c) => jsx('option', { value: c.name, key: c._id, children: c.name }))
                  : [jsx('option', { value: '', key: '__none', children: 'No categories yet' })]
              )) }),
              jsx(AcctField, { label: 'Quantity', children: jsx('input', {
                className: 'input',
                type: 'number',
                min: '1',
                step: 'any',
                value: values.quantity,
                onChange: (ev) => setValue('quantity', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Purchase date', required: true, children: jsx('input', {
                className: 'input',
                type: 'date',
                value: values.purchaseDate,
                onChange: (ev) => setValue('purchaseDate', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Purchase cost', required: true, children: jsx('input', {
                className: 'input',
                type: 'number',
                min: '0',
                step: 'any',
                value: values.purchaseCost,
                onChange: (ev) => setValue('purchaseCost', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Location', children: jsx('input', {
                className: 'input',
                value: values.location,
                placeholder: 'Cardio floor',
                onChange: (ev) => setValue('location', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Assigned to', children: jsx('input', {
                className: 'input',
                value: values.assignedEmployee,
                placeholder: 'Staff name',
                onChange: (ev) => setValue('assignedEmployee', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Payment type', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.paymentType, onChange: (ev) => setValue('paymentType', ev.target.value) }, 
                ASSET_PAYMENT_TYPES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Payment mode', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.paymentMode, onChange: (ev) => setValue('paymentMode', ev.target.value) }, 
                SALES_PAYMENT_MODES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Status', children: jsx(
                'select', withChildren(
                { className: 'select', value: values.status, onChange: (ev) => setValue('status', ev.target.value) }, 
                ASSET_STATUSES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Branch', children: jsx(BranchSelect, { value: values.branch, onChange: (v) => setValue('branch', v) }) })
            ]
          }),
          jsxs('div', {
            className: 'form-grid',
            children: [
              jsx(AcctField, { label: 'Depreciation method', children: jsx(
                'select', withChildren(
                {
                  className: 'select',
                  value: values.depreciationMethod,
                  onChange: (ev) => setValue('depreciationMethod', ev.target.value)
                }, 
                DEPRECIATION_METHODS.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
              )) }),
              jsx(AcctField, { label: 'Useful life (years)', children: jsx('input', {
                className: 'input',
                type: 'number',
                min: '0',
                step: 'any',
                value: values.usefulLifeYears,
                onChange: (ev) => setValue('usefulLifeYears', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Depreciation rate (%)', children: jsx('input', {
                className: 'input',
                type: 'number',
                min: '0',
                step: 'any',
                value: values.depreciationRate,
                onChange: (ev) => setValue('depreciationRate', ev.target.value)
              }) }),
              jsx(AcctField, { label: 'Salvage value', children: jsx('input', {
                className: 'input',
                type: 'number',
                min: '0',
                step: 'any',
                value: values.salvageValue,
                onChange: (ev) => setValue('salvageValue', ev.target.value)
              }) })
            ]
          }),
          jsx(AcctField, { label: 'Notes', children: jsx('textarea', {
            className: 'textarea',
            rows: 2,
            value: values.notes,
            placeholder: 'Serial number, warranty, condition…',
            onChange: (ev) => setValue('notes', ev.target.value)
          }) }),
          jsx(AcctAttachmentsField, {
            attachments: values.attachments,
            onChange: (att) => setValue('attachments', att),
            label: 'Asset Documents & Invoices (Images & PDFs)'
          }),
          jsx(PreviewBox, {
            title: 'Depreciation preview',
            children: jsxs('div', {
              children: [
                jsx(PreviewRow, { label: 'Annual depreciation', value: fmtINR(annualDepreciation) }),
                jsx(PreviewRow, {
                  label: 'Book value at purchase',
                  value: fmtINR(Math.max(toNum(values.salvageValue), toNum(values.purchaseCost))),
                  tone: 'total'
                })
              ]
            })
          })
        ]
      })
    })
  });
}

function DepreciationDrawer({ asset, onDone }) {
  const [period, setPeriod] = useState(todayISO().slice(0, 7));
  const [saving, setSaving] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    setSaving(true);
    const res = await apiFetch(`/api/accounts/assets/${asset._id}/depreciate`, {
      method: 'POST',
      body: JSON.stringify({ period })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Depreciation recorded', { icon: 'check' });
      closeDrawer();
      onDone();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not record the depreciation', { icon: 'x' });
    }
  };

  return jsxs(ModalDrawer, {
    title: `Depreciate ${asset.assetId}`,
    sub: `${asset.assetName} — book value ${fmtINR(asset.currentValue)}`,
    foot: jsxs(Fragment, {
      children: [
        jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
        jsx('button', {
          type: 'submit',
          form: 'acct-dep-form',
          className: 'btn btn--primary',
          disabled: saving,
          children: saving ? 'Recording…' : 'Record depreciation'
        })
      ]
    }),
    children: jsx('form', {
      id: 'acct-dep-form',
      noValidate: true,
      onSubmit: submit,
      children: jsxs('div', {
        className: 'acct-stack',
        children: [
          jsx(AcctField, { label: 'Period (YYYY-MM)', required: true, children: jsx('input', {
            className: 'input',
            type: 'month',
            value: period,
            onChange: (ev) => setPeriod(ev.target.value)
          }) }),
          jsx(PreviewBox, {
            title: 'Asset',
            children: jsxs('div', {
              children: [
                jsx(PreviewRow, { label: 'Method', value: asText(asset.depreciationMethod) }),
                jsx(PreviewRow, { label: 'Purchase cost', value: fmtINR(asset.purchaseCost) }),
                jsx(PreviewRow, { label: 'Accumulated depreciation', value: fmtINR(asset.accumulatedDepreciation) }),
                jsx(PreviewRow, { label: 'Salvage value', value: fmtINR(asset.salvageValue) })
              ]
            })
          })
        ]
      })
    })
  });
}

function AssetsPage() {
  const categories = useApi('/api/accounts/asset-categories');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const paged = usePaged('/api/accounts/assets', { q: query.trim(), category: category === 'All' ? '' : category, status: status === 'All' ? '' : status });
  const { rows, kpis, loading, error, reload } = paged;
  const total = paged.pagination ? paged.pagination.total : 0;

  const kpiData = kpis || {};
  const categoryNames = useMemo(
    () => Array.from(new Set(categories.rows.map((c) => c.name).filter(Boolean))).sort(),
    [categories.rows]
  );

  const visible = rows;

  const openDrawerForm = (asset) => {
    openDrawer(jsx(AssetDrawer, { asset, categories: categories.rows, onDone: reload }));
  };
  const openDepreciation = (asset) => {
    openDrawer(jsx(DepreciationDrawer, { asset, onDone: reload }));
  };

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Fixed assets', value: fmtINR(kpiData.totalFixedAssets), tone: 'cobalt', icon: 'building' },
          { label: 'Net book value', value: fmtINR(kpiData.netBookValue), tone: 'teal', icon: 'finance' },
          { label: 'Units', value: fmtCount(kpiData.totalUnits), tone: 'slate', icon: 'tag' },
          { label: 'Depreciation recorded', value: fmtINR(kpiData.depreciationRecorded), tone: 'amber', icon: 'clock' }
        ]
      }),
      error ? jsx(AcctBanner, { children: error }) : null,
      jsx(Card, {
        title: 'Fixed asset register',
        sub: `${total} asset${total === 1 ? '' : 's'}`,
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(AcctToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search asset, location…' }),
                jsx(
                  'select', withChildren(
                  {
                    className: 'select acct-filter',
                    value: category,
                    'aria-label': 'Filter by category',
                    onChange: (ev) => setCategory(ev.target.value)
                  }, 
                  ['All', ...categoryNames].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                )),
                jsx(
                  'select', withChildren(
                  {
                    className: 'select acct-filter',
                    value: status,
                    'aria-label': 'Filter by status',
                    onChange: (ev) => setStatus(ev.target.value)
                  }, 
                  ['All', ...ASSET_STATUSES].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                )),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openDrawerForm(null),
                  children: [jsx(Icon, { name: 'plus' }), 'Add asset']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the asset register.' })
              : jsx(AcctTable, {
                  head: ['Asset ID', 'Name', 'Category', 'Qty', 'Payment mode', 'Purchase date', 'Purchase cost', 'Book value', 'Location', 'Status', 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'building',
                  emptyTitle: query || category !== 'All' ? 'No matching assets' : 'No assets yet',
                  emptyText: 'Register the first fixed asset to start the depreciation schedule.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', { children: jsx('b', { children: asText(row.assetId) }) }),
                        jsx('td', {
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [jsx('b', { children: asText(row.assetName) }), jsx('small', { children: asText(row.assignedEmployee) })]
                          })
                        }),
                        jsx('td', { children: asText(row.category) }),
                        jsx('td', { children: fmtCount(row.quantity) }),
                        jsx('td', { children: asText(row.paymentMode) }),
                        jsx('td', { children: shortDate(row.purchaseDate) }),
                        jsx('td', { children: fmtINR(row.purchaseCost) }),
                        jsx('td', { children: jsx('b', { children: fmtINR(row.currentValue) }) }),
                        jsx('td', { children: asText(row.location) }),
                        jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                        jsx(ActionCell, {
                          children: jsx(RowActions, {
                            children: [
                              jsx(ActionButton, {
                                icon: 'edit',
                                label: 'Edit asset',
                                variant: 'edit',
                                onClick: () => openDrawerForm(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'clock',
                                label: 'Depreciate asset',
                                variant: 'depreciate',
                                disabled: row.status === 'Disposed' || row.status === 'Sold',
                                onClick: () => openDepreciation(row)
                              }),
                              jsx(ActionButton, {
                                icon: 'trash',
                                label: 'Delete asset',
                                variant: 'delete',
                                danger: true,
                                onClick: (ev) =>
                                  runDelete({
                                    url: `/api/accounts/assets/${row._id}`,
                                    entity: 'asset',
                                    label: row.assetName,
                                    anchor: ev.currentTarget,
                                    onDone: reload
                                  })
                              })
                            ]
                          })
                        })
                      ]
                    })
                })
          ]
        })
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Adjustment entry (journal vouchers)
 * ------------------------------------------------------------------ */

function AdjustmentEntryPage() {
  const accounts = useApi('/api/accounts/chart-of-accounts');
  const [values, setValues] = useState({
    date: '',
    entryType: '',
    referenceNumber: '',
    narration: '',
    debitAccount: '',
    creditAccount: '',
    amount: '',
    status: '',
    branch: '',
    attachments: []
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const paged = usePaged('/api/accounts/adjustment-entry', { q: query.trim() });
  const { rows, kpis, loading, error, reload } = paged;
  const total = paged.pagination ? paged.pagination.total : 0;

  const kpiData = kpis || {};
  const coaRows = accounts.rows;
  const accountOptions = useMemo(
    () => coaRows.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` })),
    [coaRows]
  );

  const visible = rows;

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const debitTotal = toNum(values.amount);
  const creditTotal = toNum(values.amount);
  const sameAccount = Boolean(values.debitAccount && values.creditAccount && values.debitAccount === values.creditAccount);
  const amountInvalid = debitTotal <= 0;
  const balanced = !sameAccount && !amountInvalid && Boolean(values.debitAccount) && Boolean(values.creditAccount);
  const balanceError = sameAccount
    ? 'The debit and credit accounts must be different'
    : amountInvalid
      ? 'Amount must be greater than zero'
      : '';

  const resetForm = () => {
    setValues({
      date: todayISO(),
      entryType: 'Journal Voucher',
      referenceNumber: '',
      narration: '',
      debitAccount: '',
      creditAccount: '',
      amount: 0,
      status: 'Draft',
      branch: 'All Branches',
      attachments: []
    });
    setEditingId(null);
  };

  const startEdit = (row) => {
    setValues({
      date: row.date || todayISO(),
      entryType: row.entryType || 'Journal Voucher',
      referenceNumber: row.referenceNumber || '',
      narration: row.narration || '',
      debitAccount: row.debitAccount || '',
      creditAccount: row.creditAccount || '',
      amount: Number(row.amount || 0),
      status: row.status || 'Draft',
      branch: row.branch || 'All Branches',
      attachments: row.attachments || []
    });
    setEditingId(row._id);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    if (!values.narration.trim()) {
      toast('Narration is required', { icon: 'x' });
      return;
    }
    if (!values.debitAccount || !values.creditAccount) {
      toast('Both a debit and a credit account are required', { icon: 'x' });
      return;
    }
    if (sameAccount) {
      toast('The debit and credit accounts must be different', { icon: 'x' });
      return;
    }
    if (amountInvalid) {
      toast('Amount must be greater than zero', { icon: 'x' });
      return;
    }
    setSaving(true);
    const url = editingId ? `/api/accounts/adjustment-entry/${editingId}` : '/api/accounts/adjustment-entry';
    const res = await apiFetch(url, {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify({
        date: values.date,
        entryType: values.entryType,
        referenceNumber: values.referenceNumber.trim(),
        narration: values.narration.trim(),
        debitAccount: values.debitAccount,
        creditAccount: values.creditAccount,
        amount: toNum(values.amount),
        status: values.status,
        branch: values.branch.trim() || 'All Branches',
        attachments: values.attachments || []
      })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Journal voucher saved', { icon: 'check' });
      resetForm();
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not save the journal voucher', { icon: 'x' });
    }
  };

  const postVoucher = async (row) => {
    const res = await apiFetch(`/api/accounts/adjustment-entry/${row._id}/post`, { method: 'POST' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Voucher posted', { icon: 'check' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not post the voucher', { icon: 'x' });
    }
  };

  const reverseVoucher = async (row) => {
    const res = await apiFetch(`/api/accounts/adjustment-entry/${row._id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Reversal requested' })
    });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Voucher reversed', { icon: 'check' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not reverse the voucher', { icon: 'x' });
    }
  };

  const accountSelect = (name, label) =>
    jsx(
      AcctField, withChildren(
      { label, required: true }, 
      jsx(
        'select', withChildren(
        { className: 'select', value: values[name], onChange: (ev) => setValue(name, ev.target.value) }, 
        [
          jsx('option', { value: '', key: '__none', children: accounts.loading ? 'Loading accounts…' : 'Select an account' }),
          ...accountOptions.map((opt) => jsx('option', { value: opt.value, key: opt.value, children: opt.label }))
        ]
      ))
    ));

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Vouchers', value: fmtCount(kpiData.totalJVs), tone: 'cobalt', icon: 'note' },
          { label: 'Posted', value: fmtCount(kpiData.postedEntries), tone: 'teal', icon: 'check' },
          { label: 'Draft & pending', value: fmtCount(kpiData.draftEntries), tone: 'amber', icon: 'clock' },
          { label: 'Value adjusted', value: fmtINR(kpiData.totalValueAdjusted), tone: 'slate', icon: 'finance' }
        ]
      }),
      error ? jsx(AcctBanner, { children: error }) : null,
      jsxs('div', {
        className: 'acct-grid',
        children: [
          jsx(Card, {
            title: editingId ? 'Edit journal voucher' : 'New journal voucher',
            sub: 'Entry numbers are assigned by the server when the voucher is created.',
            tools: editingId
              ? jsx('button', {
                  type: 'button',
                  className: 'btn btn--sm btn--ghost',
                  onClick: resetForm,
                  children: 'Cancel edit'
                })
              : null,
            children: jsxs('form', {
              noValidate: true,
              onSubmit: handleSubmit,
              children: [
                jsx('div', {
                  className: 'acct-entry-no',
                  children: [
                    jsx('span', { children: 'Entry number' }),
                    jsx('b', { children: editingId ? 'Assigned on create' : 'Auto' })
                  ]
                }),
                jsxs('div', {
                  className: 'form-grid',
                  children: [
                    jsx(AcctField, { label: 'Date', required: true, children: jsx('input', {
                      className: 'input',
                      type: 'date',
                      value: values.date,
                      onChange: (ev) => setValue('date', ev.target.value)
                    }) }),
                    jsx(AcctField, { label: 'Entry type', children: jsx(
                      'select', withChildren(
                      { className: 'select', value: values.entryType, onChange: (ev) => setValue('entryType', ev.target.value) }, 
                      JV_ENTRY_TYPES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                    )) }),
                    jsx(AcctField, { label: 'Reference number', children: jsx('input', {
                      className: 'input',
                      value: values.referenceNumber,
                      placeholder: 'External reference',
                      onChange: (ev) => setValue('referenceNumber', ev.target.value)
                    }) }),
                    jsx(AcctField, { label: 'Status', children: jsx(
                      'select', withChildren(
                      { className: 'select', value: values.status, onChange: (ev) => setValue('status', ev.target.value) }, 
                      JV_STATUSES.filter((s) => s !== 'Posted' && s !== 'Reversed').map((opt) =>
                        jsx('option', { value: opt, key: opt, children: opt })
                      )
                    )) }),
                    jsx(AcctField, { className: 'span-2', label: 'Narration', required: true, children: jsx('textarea', {
                      className: 'textarea',
                      rows: 2,
                      value: values.narration,
                      placeholder: 'What is this entry for?',
                      onChange: (ev) => setValue('narration', ev.target.value)
                    }) }),
                    accountSelect('debitAccount', 'Debit account'),
                    accountSelect('creditAccount', 'Credit account'),
                    jsx(AcctField, { label: 'Amount', required: true, children: jsx('input', {
                      className: 'input',
                      type: 'number',
                      min: '0',
                      step: 'any',
                      value: values.amount,
                      onChange: (ev) => setValue('amount', ev.target.value)
                    }) }),
                    jsx(AcctField, { label: 'Branch', children: jsx(BranchSelect, { value: values.branch, onChange: (v) => setValue('branch', v) }) })
                  ]
                }),
                jsx(AcctAttachmentsField, {
                  attachments: values.attachments,
                  onChange: (att) => setValue('attachments', att),
                  label: 'Supporting Vouchers & Documents (Images & PDFs)'
                }),
                jsx(PreviewBox, {
                  title: 'Entry balance',
                  children: jsxs('div', {
                    children: [
                      jsx(PreviewRow, { label: 'Total debit', value: fmtINR(debitTotal) }),
                      jsx(PreviewRow, { label: 'Total credit', value: fmtINR(creditTotal) }),
                      jsx('div', {
                        className: `acct-balance ${balanced ? 'is-balanced' : 'is-unbalanced'}`,
                        children: [
                          jsx(Icon, { name: balanced ? 'check' : 'x' }),
                          jsx('span', {
                            children: balanced
                              ? 'Balanced — debit equals credit'
                              : balanceError || 'Choose a debit account, a credit account and an amount'
                          })
                        ]
                      })
                    ]
                  })
                }),
                jsxs('div', {
                  className: 'acct-actions',
                  children: [
                    editingId
                      ? jsx('button', {
                          type: 'button',
                          className: 'btn btn--ghost',
                          onClick: resetForm,
                          children: 'Discard'
                        })
                      : null,
                    jsx('button', {
                      type: 'submit',
                      className: 'btn btn--primary',
                      disabled: saving,
                      children: saving ? 'Saving…' : editingId ? 'Save voucher' : 'Create voucher'
                    })
                  ]
                })
              ]
            })
          }),
          jsx(Card, {
            title: 'Journal vouchers',
            sub: `${total} voucher${total === 1 ? '' : 's'}`,
            flush: true,
            children: jsxs('div', {
              children: [
                jsx(AcctToolbar, {
                  children: [
                    jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search entry, narration…' })
                  ]
                }),
                loading
                  ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the voucher register.' })
                  : jsx(AcctTable, {
                      head: ['Entry #', 'Date', 'Type', 'Reference', 'Narration', 'Debit', 'Credit', 'Amount', 'Status', 'Actions'],
                      rows: visible,
                  paged,
                      emptyIcon: 'note',
                      emptyTitle: query ? 'No matching vouchers' : 'No vouchers yet',
                      emptyText: 'Create the first manual journal voucher to get started.',
                      renderRow: (row) => {
                        const posted = row.status === 'Posted';
                        const reversed = row.status === 'Reversed';
                        return jsx('tr', {
                          'data-row': '',
                          key: row._id,
                          children: [
                            jsx('td', { children: jsx('b', { children: asText(row.entryNumber) }) }),
                            jsx('td', { children: shortDate(row.date) }),
                            jsx('td', { children: asText(row.entryType) }),
                            jsx('td', { children: asText(row.referenceNumber) }),
                            jsx('td', { children: asText(row.narration) }),
                            jsx('td', { children: asText(row.debitAccount) }),
                            jsx('td', { children: asText(row.creditAccount) }),
                            jsx('td', { children: jsx('b', { children: fmtINR(row.amount) }) }),
                            jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                            jsx(ActionCell, {
                              children: jsx(RowActions, {
                                children: [
                                  jsx(ActionButton, {
                                    icon: 'edit',
                                    label: 'Edit voucher',
                                    variant: 'edit',
                                    disabled: posted || reversed,
                                    onClick: () => startEdit(row)
                                  }),
                                  jsx(ActionButton, {
                                    icon: 'check',
                                    label: 'Post voucher',
                                    variant: 'post',
                                    disabled: posted || reversed,
                                    onClick: () => postVoucher(row)
                                  }),
                                  jsx(ActionButton, {
                                    icon: 'undo',
                                    label: 'Reverse voucher',
                                    variant: 'reverse',
                                    disabled: !posted,
                                    onClick: () => reverseVoucher(row)
                                  }),
                                  jsx(ActionButton, {
                                    icon: 'trash',
                                    label: 'Delete voucher',
                                    variant: 'delete',
                                    danger: true,
                                    disabled: posted,
                                    onClick: (ev) =>
                                      runDelete({
                                        url: `/api/accounts/adjustment-entry/${row._id}`,
                                        entity: 'journal voucher',
                                        label: row.entryNumber,
                                        anchor: ev.currentTarget,
                                        onDone: reload
                                      })
                                  })
                                ]
                              })
                            })
                          ]
                        });
                      }
                    })
              ]
            })
          })
        ]
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Financial reports
 * ------------------------------------------------------------------ */

function ReportRow({ label, value, tone, strong }) {
  return jsxs('div', {
    className: `acct-report__row${tone ? ` is-${tone}` : ''}${strong ? ' is-strong' : ''}`,
    children: [jsx('span', { children: label }), jsx('b', { children: value })]
  });
}

function BalanceSheetReport() {
  const { data, loading, error } = useApi('/api/accounts/reports/balance-sheet');
  const r = data || {};
  const assets = r.assets || {};
  const current = assets.current || {};
  const fixed = assets.fixed || {};
  const liabilities = r.liabilities || {};
  const equity = r.equity || {};
  const totals = r.totals || {};

  if (loading) return jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Building the balance sheet.' });
  if (error) return jsx(AcctBanner, { children: error });

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx('div', {
        className: `acct-verify ${totals.balanced ? 'is-good' : 'is-bad'}`,
        children: [
          jsx(Icon, { name: totals.balanced ? 'check' : 'x' }),
          jsx('span', {
            children: totals.balanced
              ? 'Balance sheet is in balance'
              : 'Balance sheet does not balance yet'
          })
        ]
      }),
      jsxs('div', {
        className: 'acct-grid acct-grid--2',
        children: [
          jsx(Card, {
            title: 'Assets',
            sub: 'What the business owns.',
            children: jsx('div', {
              className: 'acct-report',
              children: [
                jsx(ReportRow, { label: 'Cash on hand', value: fmtINR(current.cashOnHand) }),
                jsx(ReportRow, { label: 'Bank balance', value: fmtINR(current.bankBalance) }),
                jsx(ReportRow, { label: 'Accounts receivable', value: fmtINR(current.receivables) }),
                jsx(ReportRow, { label: 'Inventory', value: fmtINR(current.inventory) }),
                jsx(ReportRow, { label: 'Total current assets', value: fmtINR(current.total), strong: true }),
                jsx(ReportRow, { label: 'Fixed assets (gross)', value: fmtINR(fixed.gross) }),
                jsx(ReportRow, { label: 'Accumulated depreciation', value: `− ${fmtINR(fixed.accumulatedDepreciation)}` }),
                jsx(ReportRow, { label: 'Net fixed assets', value: fmtINR(fixed.net) }),
                jsx(ReportRow, { label: 'Total assets', value: fmtINR(assets.total), tone: 'total', strong: true })
              ]
            })
          }),
          jsx(Card, {
            title: 'Liabilities & equity',
            sub: 'What the business owes and owns.',
            children: jsx('div', {
              className: 'acct-report',
              children: [
                jsx(ReportRow, { label: 'Accounts payable', value: fmtINR(liabilities.payables) }),
                jsx(ReportRow, { label: 'Unearned revenue', value: fmtINR(liabilities.unearned) }),
                jsx(ReportRow, { label: 'Tax payable', value: fmtINR(liabilities.taxPayable) }),
                jsx(ReportRow, { label: 'Total liabilities', value: fmtINR(liabilities.total), strong: true }),
                jsx(ReportRow, { label: 'Capital', value: fmtINR(equity.capital) }),
                jsx(ReportRow, { label: 'Current period profit', value: fmtINR(equity.currentPeriodProfit) }),
                jsx(ReportRow, { label: 'Total equity', value: fmtINR(equity.total), strong: true }),
                jsx(ReportRow, { label: 'Liabilities & equity', value: fmtINR(totals.liabilitiesEquity), tone: 'total', strong: true })
              ]
            })
          })
        ]
      })
    ]
  });
}

function ProfitLossReport() {
  const { data, loading, error } = useApi('/api/accounts/reports/profit-loss');
  const r = data || {};
  const revenue = r.revenue || {};
  const opex = r.opex || {};

  if (loading) return jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Building the profit and loss statement.' });
  if (error) return jsx(AcctBanner, { children: error });

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsxs('div', {
        className: 'acct-grid acct-grid--2',
        children: [
          jsx(Card, {
            title: 'Revenue',
            sub: 'Income earned in the period.',
            children: jsx('div', {
              className: 'acct-report',
              children: [
                jsx(ReportRow, { label: 'Membership revenue', value: fmtINR(revenue.membership) }),
                jsx(ReportRow, { label: 'Personal training revenue', value: fmtINR(revenue.personalTraining) }),
                jsx(ReportRow, { label: 'Retail POS revenue', value: fmtINR(revenue.pos) }),
                jsx(ReportRow, { label: 'Inward returns & credit notes', value: `− ${fmtINR(revenue.returns)}` }),
                jsx(ReportRow, { label: 'Gross revenue', value: fmtINR(revenue.gross), strong: true }),
                jsx(ReportRow, { label: 'Net revenue', value: fmtINR(revenue.net), tone: 'total', strong: true })
              ]
            })
          }),
          jsx(Card, {
            title: 'Costs & profit',
            sub: 'What it cost to run the business.',
            children: jsx('div', {
              className: 'acct-report',
              children: [
                jsx(ReportRow, { label: 'Cost of goods sold', value: `− ${fmtINR(r.cogs)}` }),
                jsx(ReportRow, { label: 'Gross profit', value: fmtINR(r.grossProfit), strong: true }),
                jsx(ReportRow, { label: 'Operating expenses', value: `− ${fmtINR(opex.total)}` }),
                jsx(ReportRow, { label: 'Net profit', value: fmtINR(r.netProfit), tone: 'total', strong: true })
              ]
            })
          })
        ]
      }),
      jsx(Card, {
        title: 'Operating expenses by account',
        sub: 'Every expense account that carried a debit in the period.',
        flush: true,
        children: (opex.byCategory || []).length
          ? jsx(AcctTable, {
              head: ['Code', 'Account', 'Amount'],
              rows: opex.byCategory,
              emptyIcon: 'card',
              emptyTitle: 'No operating expenses',
              emptyText: 'Nothing was posted to an expense account in this period.',
              renderRow: (row) =>
                jsx('tr', {
                  'data-row': '',
                  key: row.code,
                  children: [
                    jsx('td', { children: asText(row.code) }),
                    jsx('td', { children: asText(row.name) }),
                    jsx('td', { children: jsx('b', { children: fmtINR(row.amount) }) })
                  ]
                })
            })
          : jsx(EmptyState, { icon: 'card', title: 'No operating expenses', text: 'Nothing was posted to an expense account in this period.' })
      })
    ]
  });
}

function TrialBalanceReport() {
  const { data, loading, error } = useApi('/api/accounts/reports/trial-balance');
  const rows = (data && data.rows) || [];
  const totals = (data && data.totals) || {};

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx('div', {
        className: `acct-verify ${totals.balanced ? 'is-good' : 'is-bad'}`,
        children: [
          jsx(Icon, { name: totals.balanced ? 'check' : 'x' }),
          jsx('span', {
            children: totals.balanced
              ? `Books are in balance — total debit ${fmtINR(totals.debit)} equals total credit ${fmtINR(totals.credit)}`
              : `Books are out of balance — debit ${fmtINR(totals.debit)} against credit ${fmtINR(totals.credit)}`
          })
        ]
      }),
      jsx(Card, {
        title: 'Trial balance',
        sub: `${rows.length} ledger account${rows.length === 1 ? '' : 's'}`,
        flush: true,
        children: loading
          ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Building the trial balance.' })
          : error
            ? jsx(AcctBanner, { children: error })
            : jsx(AcctTable, {
                head: ['Code', 'Account', 'Type', 'Debit', 'Credit'],
                rows,
                emptyIcon: 'reports',
                emptyTitle: 'No ledger activity',
                emptyText: 'Post an entry to see the trial balance.',
                renderRow: (row) =>
                  jsx('tr', {
                    'data-row': '',
                    key: row.code,
                    children: [
                      jsx('td', { children: jsx('b', { children: asText(row.code) }) }),
                      jsx('td', { children: asText(row.name) }),
                      jsx('td', { children: asText(row.type) }),
                      jsx('td', { children: fmtINR(row.debit) }),
                      jsx('td', { children: fmtINR(row.credit) })
                    ]
                  })
              })
      }),
      jsxs('div', {
        className: 'acct-report',
        children: [
          jsx(ReportRow, { label: 'Total debit', value: fmtINR(totals.debit), strong: true }),
          jsx(ReportRow, { label: 'Total credit', value: fmtINR(totals.credit), strong: true }),
          jsx(ReportRow, {
            label: 'Difference',
            value: fmtINR(Math.abs(Number(totals.debit || 0) - Number(totals.credit || 0))),
            tone: totals.balanced ? 'good' : 'bad'
          })
        ]
      })
    ]
  });
}

function GeneralLedgerReport() {
  const accounts = useApi('/api/accounts/chart-of-accounts');
  const [account, setAccount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const globalRange = useDateRange();
  useEffect(() => {
    setFrom(globalRange.from);
    setTo(globalRange.to);
  }, [globalRange.from, globalRange.to]);


  const url = useMemo(() => {
    const params = [];
    if (account) params.push(`account=${encodeURIComponent(account)}`);
    if (from) params.push(`from=${encodeURIComponent(from)}`);
    if (to) params.push(`to=${encodeURIComponent(to)}`);
    return `/api/accounts/reports/general-ledger${params.length ? `?${params.join('&')}` : ''}`;
  }, [account, from, to]);

  const { data, loading, error } = useApi(url);
  const rows = (data && data.rows) || [];
  const totals = (data && data.totals) || {};

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(Card, {
        title: 'General ledger book',
        sub: `${rows.length} ledger line${rows.length === 1 ? '' : 's'}`,
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(AcctToolbar, {
              children: [
                jsx(
                  'select', withChildren(
                  {
                    className: 'select acct-filter',
                    value: account,
                    'aria-label': 'Filter by account',
                    onChange: (ev) => setAccount(ev.target.value)
                  }, 
                  [
                    jsx('option', { value: '', key: '__all', children: 'All accounts' }),
                    ...accounts.rows.map((a) =>
                      jsx('option', { value: a.code, key: a.code, children: `${a.code} · ${a.name}` })
                    )
                  ]
                )),
                jsx('input', {
                  className: 'input acct-date',
                  type: 'date',
                  value: from,
                  'aria-label': 'From date',
                  onChange: (ev) => setFrom(ev.target.value)
                }),
                jsx('input', {
                  className: 'input acct-date',
                  type: 'date',
                  value: to,
                  'aria-label': 'To date',
                  onChange: (ev) => setTo(ev.target.value)
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Building the ledger book.' })
              : error
                ? jsx(AcctBanner, { children: error })
                : jsx(AcctTable, {
                    head: ['Date', 'Entry #', 'Account', 'Source', 'Reference', 'Description', 'Debit', 'Credit', 'Branch'],
                    rows,
                    emptyIcon: 'reports',
                    emptyTitle: 'No ledger lines',
                    emptyText: 'Nothing has been posted for this filter yet.',
                    renderRow: (row, i) =>
                      jsx('tr', {
                        'data-row': '',
                        key: `${row.entryNumber || 'gl'}-${i}`,
                        children: [
                          jsx('td', { children: shortDate(row.date) }),
                          jsx('td', { children: asText(row.entryNumber) }),
                          jsx('td', {
                            children: jsxs('span', {
                              className: 'li__main',
                              children: [
                                jsx('b', { children: asText(row.accountCode) }),
                                jsx('small', { children: asText(row.accountName) })
                              ]
                            })
                          }),
                          jsx('td', { children: asText(row.sourceModule) }),
                          jsx('td', { children: asText(row.reference) }),
                          jsx('td', { children: asText(row.description) }),
                          jsx('td', { children: fmtINR(row.debit) }),
                          jsx('td', { children: fmtINR(row.credit) }),
                          jsx('td', { children: asText(row.branch) })
                        ]
                      })
                  })
          ]
        })
      }),
      jsxs('div', {
        className: 'acct-report',
        children: [
          jsx(ReportRow, { label: 'Total debit', value: fmtINR(totals.debit), strong: true }),
          jsx(ReportRow, { label: 'Total credit', value: fmtINR(totals.credit), strong: true })
        ]
      })
    ]
  });
}

function ReportsPage() {
  const [tab, setTab] = useState('balance-sheet');

  const tabs = [
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'profit-loss', label: 'Profit & Loss' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'general-ledger', label: 'General Ledger' }
  ];

  let content = null;
  if (tab === 'profit-loss') content = jsx(ProfitLossReport, {});
  else if (tab === 'trial-balance') content = jsx(TrialBalanceReport, {});
  else if (tab === 'general-ledger') content = jsx(GeneralLedgerReport, {});
  else content = jsx(BalanceSheetReport, {});

  return jsxs('div', {
    className: 'acct-stack',
    children: [
      jsx(SubTabs, { items: tabs, active: tab, onChange: setTab }),
      content
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Page shell
 * ------------------------------------------------------------------ */

function AccountsPage({ route }) {
  const rawSub = route && route.sub ? String(route.sub) : '';
  const sub = ACCOUNT_PAGES[rawSub] ? rawSub : DEFAULT_SUB;
  const meta = ACCOUNT_PAGES[sub];

  let content = null;
  if (sub === 'sales') content = jsx(SalesPage, {});
  else if (sub === 'expenses') content = jsx(ExpensesPage, {});
  else if (sub === 'expense-categories') content = jsx(GenericMasterModule, { config: EXPENSE_CATEGORY_CONFIG });
  else if (sub === 'inward-expenses') content = jsx(InwardExpensesPage, {});
  else if (sub === 'emi') content = jsx(EmiPage, {});
  else if (sub === 'credit-notes') content = jsx(CreditNotesPage, {});
  else if (sub === 'assets') content = jsx(AssetsPage, {});
  else if (sub === 'asset-categories') content = jsx(GenericMasterModule, { config: ASSET_CATEGORY_CONFIG });
  else if (sub === 'adjustment-entry') content = jsx(AdjustmentEntryPage, {});
  else if (sub === 'reports') content = jsx(ReportsPage, {});
  else content = jsx(DashboardPage, {});

  const isOverview = !sub || sub === 'dashboard' || sub === 'overview';

  return jsxs('div', {
    className: 'page accounts',
    children: [
      jsx(PageHeader, {
        crumbs: [
          { label: 'Workspace' },
          { label: 'Accounts & Finance', href: '/accounts/dashboard' },
          { label: meta.title }
        ],
        title: meta.title,
        sub: meta.sub
      }),
      jsx('div', { className: 'acct-stack', children: content })
    ]
  });
}

export default AccountsPage;
