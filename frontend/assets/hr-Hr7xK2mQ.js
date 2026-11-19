/**
 * Tessly CRM — Human Resources & Payroll module.
 *
 * One ES module that renders the HR page that matches `route.sub`.
 * Every page shares the same shell: the shared `PageHeader` immediately
 * followed by the shared `Tabs` section bar, so the global
 * `.phead + .tabs` / `.phead:has(+ .tabs)` rules merge the header and the
 * section navigation into a single card (same DOM order as the Settings
 * page in `assets/settings-BaNs64Bm.js`).
 *
 * House style follows `assets/settings-BaNs64Bm.js` and
 * `assets/clients-BBlHr9Zo.js`:
 *   `.kpis` / `.kpi` stat cards, `.table-wrap` + `.table table--stack`
 *   tables, `.form-grid` + `.field` + `.input` / `.select` forms,
 *   `.st-actions` button rows, `toast(...)` notifications and a local
 *   `apiFetch` helper that degrades to an empty state when the HR API is
 *   offline.
 *
 * All money and computed payroll values come from the server. The client
 * only ever *previews* a value (monthly advance recovery, net take-home),
 * exactly as allowed by the API contract.
 */

import {
  D as toast,
  Ft as ReactHooks,
  S as confirmModal,
  b as closeDrawer,
  c as EmptyState,
  ct as formatDateFull,
  g as SearchInput,
  h as StatusPill,
  i as CheckboxToggle,
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
import { usePaged } from './pager.js';
import { FormWizard, Panel, PreviewCard, useFormMode } from './wizard.js';

const { useState, useEffect, useMemo, useRef, useLayoutEffect } = ReactHooks();

// The shared bundle exposes React's *automatic* runtime, where the third
// argument of jsx()/jsxs() is a KEY. This module is authored in the classic
// convention, where the third argument is the children. Every call site in
// this file passes children that way (verified: no call site uses the third
// argument as a key), so the two helpers below move children into
// props.children before delegating to the automatic runtime.
const __hrRuntime = jsxRuntime();
const Fragment = __hrRuntime.Fragment;
const __hrChildren = (props, children) => (
  children.length ? { ...props, children: children.length === 1 ? children[0] : children } : props
);
const jsx = (type, props, ...children) => __hrRuntime.jsx(type, __hrChildren(props, children));
const jsxs = (type, props, ...children) => __hrRuntime.jsxs(type, __hrChildren(props, children));

/* ------------------------------------------------------------------ *
 * Module registry
 * ------------------------------------------------------------------ */

const HR_MODULES = [
  { id: 'staff', label: 'Employees', href: '/hr/staff', icon: 'team' },
  { id: 'offer-letters', label: 'Offer Letters', href: '/hr/offer-letters', icon: 'receipt' },
  { id: 'branches', label: 'Branches', href: '/hr/branches', icon: 'building' },
  { id: 'attendance', label: 'Attendance', href: '/hr/attendance', icon: 'clock' },
  { id: 'leave', label: 'Leave', href: '/hr/leave', icon: 'calendar' },
  { id: 'leave-types', label: 'Leave Types', href: '/hr/leave-types', icon: 'tag' },
  { id: 'shifts', label: 'Shifts', href: '/hr/shifts', icon: 'sun' },
  { id: 'salary', label: 'Salary', href: '/hr/salary', icon: 'card' },
  { id: 'advances', label: 'Advances', href: '/hr/advances', icon: 'receipt' },
  { id: 'adjustments', label: 'Adjustments', href: '/hr/adjustments', icon: 'layers' },
  { id: 'payroll', label: 'Payroll', href: '/hr/payroll', icon: 'finance' },
  { id: 'roles', label: 'Roles & Access', href: '/hr/roles', icon: 'lock' },
  { id: 'offer-letter-templates', label: 'Offer Letter Templates', href: '/hr/offer-letter-templates', icon: 'library' }
];

const HR_PAGES = {
  staff: {
    title: 'Employees',
    sub: 'Directory, payroll profile and portal access for everyone on the roster.'
  },
  'offer-letters': {
    title: 'Offer Letters',
    sub: 'Generate, preview and issue formal employment offer letters with automated compensation schedules.'
  },
  branches: {
    title: 'Branches',
    sub: 'Every branch of the business — the single source for all branch dropdowns.'
  },
  attendance: {
    title: 'Biometric Attendance',
    sub: 'Daily punch ledger with late marks, working hours and absences.'
  },
  leave: {
    title: 'Leave Requests',
    sub: 'Apply, approve and track leave together with its pay impact.'
  },
  'leave-types': {
    title: 'Leave Types',
    sub: 'Quota, paid status and branch scope for every leave type.'
  },
  shifts: {
    title: 'Shifts',
    sub: 'Roster templates with late marks, fines and shift allowance.'
  },
  salary: {
    title: 'Salary Structures',
    sub: 'Earnings and deductions per employee — gross and net are computed by the server.'
  },
  advances: {
    title: 'Salary Advances',
    sub: 'Issued advances with instalment recovery and outstanding balance.'
  },
  adjustments: {
    title: 'Payroll Adjustments',
    sub: 'One-off credits and deductions applied to a payroll period.'
  },
  payroll: {
    title: 'Payroll & Payslips',
    sub: 'Run, finalise and pay the monthly payroll.'
  },
  roles: {
    title: 'Roles & Access',
    sub: 'Create custom roles, configure page-level permissions, and control workspace access across your team.'
  },
  'offer-letter-templates': {
    title: 'Offer Letter Templates',
    sub: 'Customize employment offer templates, compensation breakdowns and contractual terms.'
  }
};

const DEFAULT_SUB = 'staff';

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
const fmtCount = (val) => formatNumber(Number(val || 0));
const asText = (val) => (val === undefined || val === null || val === '' ? '—' : String(val));
const fullDate = (val) => (val ? formatDateFull(String(val).slice(0, 10)) : '—');
const shortDate = (val) => (val ? formatLongDate(String(val).slice(0, 10)) : '—');
const toNum = (val) => (val === '' || val === undefined || val === null ? 0 : Number(val));

const TONE_BY_STATUS = {
  Active: 'good',
  Present: 'good',
  Approved: 'good',
  Paid: 'good',
  credit: 'good',
  Closed: 'info',
  Inactive: 'slate',
  Finalized: 'cobalt',
  Draft: 'warn',
  Pending: 'warn',
  Late: 'warn',
  'Half Day': 'warn',
  'On Leave': 'warn',
  Open: 'warn',
  Rejected: 'bad',
  Absent: 'bad',
  deduction: 'bad',
  Terminated: 'bad'
};

const toneFor = (value) => TONE_BY_STATUS[value] || 'slate';

/* ------------------------------------------------------------------ *
 * Data hooks
 * ------------------------------------------------------------------ */

function useCollection(url) {
  const [rows, setRows] = useState([]);
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
        setRows(Array.isArray(payload.data) ? payload.data : []);
        setKpis(payload.kpis || null);
        setError('');
      } else {
        setRows([]);
        setKpis(null);
        setError(payload.message || res.error || 'The HR service is not reachable right now.');
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [url, tick]);

  const reload = () => setTick((n) => n + 1);
  return { rows, kpis, loading, error, reload };
}

function useStaffOptions(active) {
  const state = useCollection(active ? '/api/staff' : null);
  const options = useMemo(
    () =>
      state.rows.map((s) => ({
        value: s._id,
        label: s.name || s.staffCode || 'Unnamed employee'
      })),
    [state.rows]
  );
  return { options, loading: state.loading };
}

function useBranches(active = true) {
  const [branches, setBranches] = useState([]);
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    apiFetch('/api/hr/branches/options').then((res) => {
      if (!alive) return;
      const payload = res.data || {};
      if (res.ok && payload.success && Array.isArray(payload.data)) {
        const arr = [...payload.data];
        arr.defaultBranch = payload.defaultBranch || (arr.length > 0 ? arr[0] : '');
        setBranches(arr);
      }
    });
    return () => {
      alive = false;
    };
  }, [active]);
  return branches;
}

/** Branch dropdown options, always including the record's current value. */
function branchOptions(list, current, withAll) {
  const out = withAll ? ['All Branches', ...list] : ['', ...list];
  if (current && out.indexOf(current) < 0) out.push(current);
  return out;
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

function HrField({ label, required, error, className, children }) {
  return jsxs('label', {
    className: `field${error ? ' is-bad' : ''}${className ? ` ${className}` : ''}`,
    children: [
      jsxs('span', {
        className: 'field__label-row',
        children: [jsx('span', { className: 'field__label', children: required ? [label, jsx('b', { className: 'req', children: ' *' })] : label })]
      }),
      children,
      error ? jsx('small', { className: 'field__err', children: error }) : null
    ]
  });
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

function RowActions({ onEdit, onDelete, editLabel = 'Edit', deleteLabel = 'Delete', extra = null }) {
  return jsxs('div', {
    className: 'hr-row-actions',
    children: [
      extra,
      jsx(ActionButton, {
        icon: 'edit',
        label: editLabel,
        variant: 'edit',
        onClick: onEdit
      }),
      jsx(ActionButton, {
        icon: 'trash',
        label: deleteLabel,
        variant: 'delete',
        danger: true,
        onClick: onDelete
      })
    ].filter(Boolean)
  });
}

function HrTable({ head, headNode, rows, renderRow, emptyTitle, emptyText, emptyIcon, paged }) {
  const offset = paged && paged.pagination ? paged.pagination.from - 1 : 0;
  let tableHead = Array.isArray(head) ? [...head] : head;
  const hasHead = Array.isArray(tableHead) && tableHead.length > 0;
  const hasSno = (hasHead && (tableHead[0] === 'S No' || tableHead[0] === 'S NO' || tableHead[0] === '#')) ||
                 (headNode && headNode.props && Array.isArray(headNode.props.children) && headNode.props.children[0]?.key === 'sno');

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

  let theadElement = headNode;
  if (!headNode && hasHead) {
    const theadChildren = hasSno
      ? tableHead.map((h) => jsx('th', { key: h, style: { textAlign: 'center' }, children: h }))
      : [
          jsx('th', { key: 'sno', style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center', paddingLeft: 8, paddingRight: 8 }, children: 'S No' }),
          ...tableHead.map((h) => jsx('th', { key: h, style: { textAlign: 'center' }, children: h }))
        ];
    theadElement = jsx('tr', { children: theadChildren });
  } else if (headNode && !hasSno && headNode.props && Array.isArray(headNode.props.children)) {
    const snoTh = jsx('th', { key: 'sno', style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center', paddingLeft: 8, paddingRight: 8 }, children: 'S No' });
    theadElement = {
      ...headNode,
      props: {
        ...headNode.props,
        children: [snoTh, ...headNode.props.children]
      }
    };
  }
  const colCount = hasHead ? (hasSno ? tableHead.length : tableHead.length + 1) : (headNode ? 99 : 1);

  const tableEl = jsx('div', {
    className: 'table-wrap',
    children: jsxs('table', {
      className: 'table table--stack',
      children: [
        jsx('thead', { children: theadElement }),
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

function HrToolbar({ children }) {
  return jsx('div', { className: 'toolbar hr-toolbar', children });
}

function PreviewBox({ title, children }) {
  return jsxs('div', {
    className: 'hr-preview',
    children: [
      jsx('span', { className: 'hr-preview__title', children: title }),
      jsx('div', { className: 'hr-preview__body', children })
    ]
  });
}

function ImpactChips({ impact }) {
  if (!impact) return null;
  return jsxs('div', {
    className: 'hr-impact',
    children: [
      jsxs('span', {
        className: 'hr-impact__chip',
        children: [jsx('small', { children: 'Days' }), jsx('b', { children: fmtCount(impact.days) })]
      }),
      jsxs('span', {
        className: 'hr-impact__chip hr-impact__chip--good',
        children: [jsx('small', { children: 'Paid days' }), jsx('b', { children: fmtCount(impact.paidDays) })]
      }),
      jsxs('span', {
        className: 'hr-impact__chip hr-impact__chip--bad',
        children: [jsx('small', { children: 'LOP days' }), jsx('b', { children: fmtCount(impact.lopDays) })]
      })
    ]
  });
}

function StatusCell({ value }) {
  if (!value) return jsx('span', { className: 'muted', children: '—' });
  return jsx(StatusPill, { kind: toneFor(value), children: value });
}

function SortHead({ label, field, sort, onSort, className }) {
  const on = sort.field === field;
  return jsx('th', {
    className: className || '',
    children: jsx('button', {
      type: 'button',
      className: `hr-sort${on ? ' is-on' : ''}`,
      onClick: () => onSort(field),
      children: [label, on ? jsx(Icon, { name: sort.dir === 'asc' ? 'up' : 'down' }) : null]
    })
  });
}

function sortRows(rows, sort, accessors) {
  const get = accessors[sort.field];
  if (!get) return rows;
  const factor = sort.dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av ?? '').localeCompare(String(bv ?? '')) * factor;
  });
}

function matchesQuery(row, query, fields) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => String(row[f] ?? '').toLowerCase().includes(q));
}

/* ------------------------------------------------------------------ *
 * Generic configuration-driven module
 * (Leave Types, Shifts, Salary Structures, Advances, Adjustments)
 * ------------------------------------------------------------------ */

const GROUP_LABELS = {
  earnings: 'Earnings',
  deductions: 'Deductions'
};

const EARNING_KEYS = [
  'basic',
  'hra',
  'transportAllowance',
  'telephoneAllowance',
  'foodAllowance',
  'specialAllowance',
  'otherEarnings'
];
const DEDUCTION_KEYS = ['pf', 'esi', 'tds', 'otherDeductions'];

const numberField = (name, label, group) => ({
  name,
  label,
  type: 'number',
  group,
  placeholder: '0'
});
const textField = (name, label, extra) =>
  Object.assign({ name, label, type: 'text' }, extra || {});

const HR_MODULE_CONFIG = {
  branches: {
    endpoint: '/api/hr/branches',
    entity: 'branch',
    cardTitle: 'Branch directory',
    cardSub: 'Active branches appear in every branch dropdown across the CRM.',
    formTitle: 'Add branch',
    formSub: 'Renaming a branch updates the employees and leave types that use it.',
    needsStaff: false,
    initial: () => ({ name: '', code: '', city: '', address: '', phone: '', email: '', manager: '', status: 'Active', isDefault: false }),
    fields: [
      textField('name', 'Branch name', { required: true, placeholder: 'Bandra' }),
      textField('code', 'Code', { placeholder: 'BA' }),
      textField('city', 'City', { placeholder: 'Mumbai' }),
      textField('manager', 'Branch manager', { placeholder: 'Full name' }),
      { name: 'phone', label: 'Phone', type: 'text', placeholder: '+91 98765 43210' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'branch@company.com' },
      { name: 'address', label: 'Address', type: 'textarea', span: 'span-2', placeholder: 'Street, area' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      { name: 'isDefault', label: 'Default option', type: 'toggle', span: 'span-2', description: 'Set this branch as default across the CRM' }
    ],
    payload: (values) => ({
      name: values.name.trim(),
      code: (values.code || '').trim(),
      city: (values.city || '').trim(),
      manager: (values.manager || '').trim(),
      phone: (values.phone || '').trim(),
      email: (values.email || '').trim(),
      address: (values.address || '').trim(),
      status: values.status || 'Active',
      isDefault: Boolean(values.isDefault)
    }),
    kpis: (k) => [
      { label: 'Total branches', value: fmtCount(k.total), tone: 'cobalt', icon: 'building' },
      { label: 'Active branches', value: fmtCount(k.active), tone: 'teal', icon: 'check' },
      { label: 'Inactive branches', value: fmtCount(k.inactive), tone: 'amber', icon: 'clock' }
    ],
    columns: [
      {
        head: 'Branch',
        cell: (r) =>
          jsxs('span', {
            className: 'li__main',
            children: [
              jsxs('span', {
                style: { display: 'inline-flex', alignItems: 'center', gap: 6 },
                children: [
                  jsx('b', { children: r.name }),
                  r.isDefault
                    ? jsx('span', {
                        className: 'status-pill status-pill--good branch-default-badge',
                        style: {
                          fontSize: '10.5px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'var(--primary, #7627c4)',
                          color: 'var(--on-primary, #ffffff)'
                        },
                        children: 'Default'
                      })
                    : null
                ]
              }),
              jsx('small', { children: r.code || '—' })
            ]
          })
      },
      { head: 'City', cell: (r) => asText(r.city) },
      { head: 'Manager', cell: (r) => asText(r.manager) },
      { head: 'Contact', cell: (r) => asText(r.phone || r.email) },
      { head: 'Employees', cell: (r) => fmtCount(r.staffCount) },
      { head: 'Status', cell: (r) => jsx(StatusCell, { value: r.status }) }
    ],
    label: (r) => r.name
  },

  'leave-types': {
    endpoint: '/api/hr/leave-types',
    entity: 'leave type',
    cardTitle: 'Leave type catalogue',
    cardSub: 'Quotas, paid status and branch scope for every leave type.',
    formTitle: 'Add leave type',
    formSub: 'Paid types draw from the monthly and annual quota.',
    needsStaff: false,
    initial: () => ({
      name: '',
      code: '',
      monthlyQuota: '',
      annualQuota: '',
      paid: true,
      branch: 'All Branches',
      status: ''
    }),
    fields: [
      textField('name', 'Leave type name', { required: true, placeholder: 'Casual Leave' }),
      textField('code', 'Code', { placeholder: 'CL' }),
      numberField('monthlyQuota', 'Monthly quota', 'main'),
      numberField('annualQuota', 'Annual quota', 'main'),
      { name: 'paid', label: 'Paid leave', type: 'toggle' },
      { name: 'branch', label: 'Branch scope', type: 'branch' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
    ],
    payload: (values) => ({
      name: values.name.trim(),
      code: values.code.trim(),
      monthlyQuota: toNum(values.monthlyQuota),
      annualQuota: toNum(values.annualQuota),
      paid: Boolean(values.paid),
      branch: (values.branch || '').trim() || 'All Branches',
      status: values.status
    }),
    kpis: (k) => [
      { label: 'Total types', value: fmtCount(k.total), tone: 'cobalt', icon: 'tag' },
      { label: 'Paid types', value: fmtCount(k.paid), tone: 'teal', icon: 'check' },
      { label: 'Unpaid types', value: fmtCount(k.unpaid), tone: 'amber', icon: 'clock' }
    ],
    columns: [
      {
        head: 'Type',
        cell: (r) =>
          jsxs('span', {
            className: 'li__main',
            children: [jsx('b', { children: r.name }), jsx('small', { children: r.code || '—' })]
          })
      },
      { head: 'Monthly', cell: (r) => `${fmtCount(r.monthlyQuota)} days` },
      { head: 'Annual', cell: (r) => `${fmtCount(r.annualQuota)} days` },
      {
        head: 'Paid',
        cell: (r) => jsx(StatusPill, { kind: r.paid ? 'good' : 'warn', children: r.paid ? 'Paid' : 'Unpaid' })
      },
      { head: 'Branch', cell: (r) => asText(r.branch) },
      { head: 'Status', cell: (r) => jsx(StatusCell, { value: r.status }) }
    ],
    label: (r) => r.name
  },

  shifts: {
    endpoint: '/api/hr/shifts',
    entity: 'shift',
    cardTitle: 'Shift roster',
    cardSub: 'Every shift template with its late-mark rule and allowance.',
    formTitle: 'Add shift',
    formSub: 'Late marks are fined from the start time, flat or per minute.',
    needsStaff: false,
    initial: () => ({
      name: '',
      startTime: '',
      endTime: '',
      lateAfter: '',
      lateDeduction: '',
      lateDeductionPerMin: '',
      shiftAllowance: '',
      status: ''
    }),
    fields: [
      textField('name', 'Shift name', { required: true, placeholder: 'General Shift' }),
      { name: 'startTime', label: 'Start time', type: 'time' },
      { name: 'endTime', label: 'End time', type: 'time' },
      { name: 'lateAfter', label: 'Late after', type: 'time' },
      numberField('lateDeduction', 'Flat late fine', 'main'),
      numberField('lateDeductionPerMin', 'Late fine per minute', 'main'),
      numberField('shiftAllowance', 'Shift allowance', 'main'),
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
    ],
    payload: (values) => ({
      name: values.name.trim(),
      startTime: values.startTime,
      endTime: values.endTime,
      lateAfter: values.lateAfter,
      lateDeduction: toNum(values.lateDeduction),
      lateDeductionPerMin: toNum(values.lateDeductionPerMin),
      shiftAllowance: toNum(values.shiftAllowance),
      status: values.status
    }),
    kpis: (k) => [
      { label: 'Total shifts', value: fmtCount(k.total), tone: 'cobalt', icon: 'sun' },
      { label: 'Active shifts', value: fmtCount(k.active), tone: 'teal', icon: 'check' },
      { label: 'With allowance', value: fmtCount(k.withAllowance), tone: 'amber', icon: 'card' }
    ],
    columns: [
      { head: 'Shift', cell: (r) => jsx('b', { children: r.name }) },
      { head: 'Timings', cell: (r) => `${asText(r.startTime)} – ${asText(r.endTime)}` },
      { head: 'Late after', cell: (r) => asText(r.lateAfter) },
      {
        head: 'Late fine',
        cell: (r) =>
          `${fmtINR(r.lateDeduction)}${Number(r.lateDeductionPerMin) ? ` + ${fmtINR(r.lateDeductionPerMin)}/min` : ''}`
      },
      { head: 'Allowance', cell: (r) => fmtINR(r.shiftAllowance) },
      { head: 'Status', cell: (r) => jsx(StatusCell, { value: r.status }) }
    ],
    label: (r) => r.name
  },

  salary: {
    endpoint: '/api/salary-structures',
    entity: 'salary structure',
    cardTitle: 'Salary structures',
    cardSub: 'Gross, deductions and net are computed by the server on every save.',
    formTitle: 'Add salary structure',
    formSub: 'Earnings and deductions for one employee, effective from a date.',
    needsStaff: true,
    initial: () => ({
      staffRef: '',
      effectiveFrom: '',
      status: '',
      basic: '',
      hra: '',
      transportAllowance: '',
      telephoneAllowance: '',
      foodAllowance: '',
      specialAllowance: '',
      otherEarnings: '',
      pf: '',
      esi: '',
      tds: '',
      otherDeductions: ''
    }),
    fields: [
      { name: 'staffRef', label: 'Employee', type: 'staff', required: true, span: 'span-2' },
      { name: 'effectiveFrom', label: 'Effective from', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      numberField('basic', 'Basic', 'earnings'),
      numberField('hra', 'HRA', 'earnings'),
      numberField('transportAllowance', 'Transport allowance', 'earnings'),
      numberField('telephoneAllowance', 'Telephone allowance', 'earnings'),
      numberField('foodAllowance', 'Food allowance', 'earnings'),
      numberField('specialAllowance', 'Special allowance', 'earnings'),
      numberField('otherEarnings', 'Other earnings', 'earnings'),
      numberField('pf', 'PF', 'deductions'),
      numberField('esi', 'ESI', 'deductions'),
      numberField('tds', 'TDS', 'deductions'),
      numberField('otherDeductions', 'Other deductions', 'deductions')
    ],
    payload: (values) => {
      const out = {
        staffRef: values.staffRef,
        effectiveFrom: values.effectiveFrom,
        status: values.status
      };
      EARNING_KEYS.forEach((k) => {
        out[k] = toNum(values[k]);
      });
      DEDUCTION_KEYS.forEach((k) => {
        out[k] = toNum(values[k]);
      });
      return out;
    },
    preview: (values) => {
      const gross = EARNING_KEYS.reduce((sum, k) => sum + toNum(values[k]), 0);
      const deductions = DEDUCTION_KEYS.reduce((sum, k) => sum + toNum(values[k]), 0);
      return jsxs('div', {
        className: 'hr-preview__row',
        children: [
          jsx('span', { children: 'Gross earnings (preview)' }),
          jsx('b', { children: fmtINR(gross) })
        ]
      });
    },
    kpis: (k) => [
      { label: 'Structures', value: fmtCount(k.total), tone: 'cobalt', icon: 'card' },
      { label: 'Active', value: fmtCount(k.active), tone: 'teal', icon: 'check' },
      { label: 'Total gross', value: fmtINR(k.totalGross), tone: 'slate', icon: 'finance' },
      { label: 'Total net', value: fmtINR(k.totalNet), tone: 'amber', icon: 'receipt' }
    ],
    columns: [
      {
        head: 'Employee',
        cell: (r) =>
          jsxs('span', {
            className: 'li__main',
            children: [jsx('b', { children: r.staffName || '—' }), jsx('small', { children: r.staffId || '' })]
          })
      },
      { head: 'Effective from', cell: (r) => shortDate(r.effectiveFrom) },
      { head: 'Gross', cell: (r) => fmtINR(r.gross) },
      { head: 'Deductions', cell: (r) => fmtINR(r.totalDeductions) },
      { head: 'Net', cell: (r) => jsx('b', { children: fmtINR(r.netSalary) }) },
      { head: 'Status', cell: (r) => jsx(StatusCell, { value: r.status }) }
    ],
    label: (r) => r.staffName
  },

  advances: {
    endpoint: '/api/hr/advances',
    entity: 'salary advance',
    cardTitle: 'Advance ledger',
    cardSub: 'Issued advances, instalment recovery and the outstanding balance.',
    formTitle: 'Issue salary advance',
    formSub: 'The server rounds the monthly recovery up to the next rupee.',
    needsStaff: true,
    initial: () => ({
      staffRef: '',
      amount: '',
      installments: '',
      issuedDate: '',
      reason: '',
      status: ''
    }),
    fields: [
      { name: 'staffRef', label: 'Employee', type: 'staff', required: true, span: 'span-2' },
      numberField('amount', 'Amount', 'main'),
      numberField('installments', 'Instalments', 'main'),
      { name: 'issuedDate', label: 'Issued date', type: 'date' },
      textField('reason', 'Reason', { placeholder: 'Festival advance' }),
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Closed'] }
    ],
    payload: (values) => ({
      staffRef: values.staffRef,
      amount: toNum(values.amount),
      installments: Math.max(1, toNum(values.installments)),
      issuedDate: values.issuedDate,
      reason: values.reason.trim(),
      status: values.status
    }),
    preview: (values) => {
      const amount = toNum(values.amount);
      const installments = Math.max(1, toNum(values.installments));
      return jsxs('div', {
        className: 'hr-preview__row',
        children: [
          jsx('span', { children: 'Monthly recovery (preview)' }),
          jsx('b', { children: fmtINR(Math.ceil(amount / installments)) })
        ]
      });
    },
    kpis: (k) => [
      { label: 'Active advances', value: fmtCount(k.active), tone: 'cobalt', icon: 'receipt' },
      { label: 'Outstanding', value: fmtINR(k.outstanding), tone: 'amber', icon: 'clock' },
      { label: 'Disbursed', value: fmtINR(k.disbursed), tone: 'teal', icon: 'check' }
    ],
    columns: [
      { head: 'Employee', cell: (r) => jsx('b', { children: r.staffName || '—' }) },
      { head: 'Amount', cell: (r) => fmtINR(r.amount) },
      { head: 'Instalments', cell: (r) => `${fmtCount(r.installments)} × ${fmtINR(r.perInstallment)}` },
      { head: 'Recovered', cell: (r) => fmtINR(r.recovered) },
      { head: 'Balance', cell: (r) => jsx('b', { children: fmtINR(r.balance) }) },
      { head: 'Issued', cell: (r) => shortDate(r.issuedDate) },
      { head: 'Status', cell: (r) => jsx(StatusCell, { value: r.status }) }
    ],
    label: (r) => r.staffName
  },

  adjustments: {
    endpoint: '/api/hr/adjustments',
    entity: 'payroll adjustment',
    cardTitle: 'Adjustment registry',
    cardSub: 'One-off credits and deductions that land in a single payroll period.',
    formTitle: 'Add adjustment',
    formSub: 'Credits add to the payout, deductions are taken out of it.',
    needsStaff: true,
    initial: () => ({
      staffRef: '',
      period: '',
      type: '',
      label: '',
      amount: ''
    }),
    fields: [
      { name: 'staffRef', label: 'Employee', type: 'staff', required: true, span: 'span-2' },
      { name: 'period', label: 'Period (YYYY-MM)', type: 'month', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['credit', 'deduction'] },
      textField('label', 'Label', { placeholder: 'Festival bonus', span: 'span-2' }),
      numberField('amount', 'Amount', 'main')
    ],
    payload: (values) => ({
      staffRef: values.staffRef,
      period: values.period,
      type: values.type,
      label: values.label.trim(),
      amount: toNum(values.amount)
    }),
    kpis: (k) => [
      { label: 'Adjustments', value: fmtCount(k.total), tone: 'cobalt', icon: 'layers' },
      { label: 'Credits', value: fmtINR(k.credits), tone: 'teal', icon: 'up' },
      { label: 'Deductions', value: fmtINR(k.deductions), tone: 'amber', icon: 'down' }
    ],
    columns: [
      { head: 'Employee', cell: (r) => jsx('b', { children: r.staffName || '—' }) },
      { head: 'Period', cell: (r) => asText(r.period) },
      { head: 'Type', cell: (r) => jsx(StatusPill, { kind: toneFor(r.type), children: r.type }) },
      { head: 'Label', cell: (r) => asText(r.label) },
      { head: 'Amount', cell: (r) => fmtINR(r.amount) }
    ],
    label: (r) => r.label || r.staffName
  }
};

function GenericHrModule({ config }) {
  const staff = useStaffOptions(config.needsStaff);
  const branchList = useBranches(config.fields.some((f) => f.type === 'branch'));
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
      const value = values[f.name];
      return value === '' || value === undefined || value === null;
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

  const handleDelete = async (row, anchor) => {
    const ok = await confirmModal(
      {
        title: `Delete this ${config.entity}?`,
        text: `${config.label(row) || 'This record'} will be permanently removed.`,
        ok: 'Delete',
        danger: true
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`${config.endpoint}/${row._id}`, { method: 'DELETE' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || `${config.entity} deleted`, { icon: 'trash' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || `Could not delete the ${config.entity}`, { icon: 'x' });
    }
  };

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

  const renderControl = (field) => {
    const value = values[field.name];
    if (field.type === 'toggle') {
      return jsxs('label', {
        className: 'toggle-control',
        style: { display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', minHeight: 38, marginTop: 4 },
        children: [
          jsx(CheckboxToggle, {
            on: Boolean(value),
            label: field.label,
            onChange: () => setValue(field.name, !value)
          }),
          jsx('span', {
            style: { fontSize: 13, fontWeight: 500, color: 'var(--ink)' },
            children: field.description || (value ? 'Default option active' : 'Set as default option')
          })
        ]
      });
    }
    if (field.type === 'select') {
      return jsx(
        'select',
        {
          className: 'select',
          value: value === undefined ? '' : value,
          onChange: (ev) => setValue(field.name, ev.target.value)
        },
        [
          jsx('option', { value: '', key: '__none', children: field.placeholder || 'Select…' }),
          ...(field.options || []).map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
        ]
      );
    }
    if (field.type === 'branch') {
      const effBranch = value !== undefined && value !== '' ? value : (branchList.defaultBranch || 'All Branches');
      return jsx(
        'select',
        {
          className: 'select',
          value: effBranch,
          onChange: (ev) => setValue(field.name, ev.target.value)
        },
        branchOptions(branchList, effBranch, true).map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
      );
    }
    if (field.type === 'staff') {
      return jsx(
        'select',
        {
          className: 'select',
          value: value || '',
          onChange: (ev) => setValue(field.name, ev.target.value)
        },
        [
          jsx('option', {
            value: '',
            key: '__none',
            children: staff.loading ? 'Loading employees…' : 'Select an employee'
          }),
          ...staff.options.map((opt) => jsx('option', { value: opt.value, key: opt.value, children: opt.label }))
        ]
      );
    }
    if (field.type === 'textarea') {
      return jsx('textarea', {
        className: 'textarea',
        rows: 3,
        value: value === undefined ? '' : value,
        placeholder: field.placeholder || '',
        onChange: (ev) => setValue(field.name, ev.target.value)
      });
    }
    return jsx('input', {
      className: 'input',
      type: field.type === 'number' ? 'number' : field.type,
      step: field.type === 'number' ? 'any' : undefined,
      value: value === undefined || value === null ? '' : value,
      placeholder: field.placeholder || '',
      onChange: (ev) => setValue(field.name, ev.target.value)
    });
  };

  return jsxs('div', {
    className: 'hr-stack',
    children: [
      jsx(KpiRow, { items: config.kpis(kpiData) }),
      error
        ? jsx('div', {
            className: 'hr-banner hr-banner--bad',
            children: [jsx(Icon, { name: 'x' }), jsx('span', { children: error })]
          })
        : null,
      jsxs('div', {
        className: 'st-grid hr-split',
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
                ...groups.map((group) =>
                  jsxs('section', {
                    className: 'hr-group',
                    key: group.name,
                    children: [
                      group.label ? jsx('h4', { className: 'hr-group__title', children: group.label }) : null,
                      jsxs('div', {
                        className: 'form-grid',
                        children: group.fields.map((field) =>
                          jsx(HrField, {
                            key: field.name,
                            label: field.label,
                            required: field.required,
                            className: field.span || '',
                            children: renderControl(field)
                          })
                        )
                      })
                    ]
                  })
                ),
                config.preview
                  ? jsx(PreviewBox, { title: 'Preview', children: config.preview(values) })
                  : null,
                jsxs('div', {
                  className: 'st-actions',
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
          jsx(Card, {
            title: config.cardTitle,
            sub: `${total} record${total === 1 ? '' : 's'}`,
            flush: true,
            children: jsxs('div', { children: [
              jsx(HrToolbar, {
                children: jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search…' })
              }),
              loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the latest records.' })
              : jsx(HrTable, {
                  head: [...config.columns.map((c) => c.head), 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'search',
                  emptyTitle: query ? 'No matching records' : 'No records yet',
                  emptyText: query ? 'Try a different search term.' : `Create the first ${config.entity} to get started.`,
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        ...config.columns.map((c) => jsx('td', { key: c.head, children: c.cell(row) })),
                        jsx('td', {
                          className: 'hr-actions-cell',
                          children: jsx(RowActions, {
                            extra: config.entity === 'branch' && !row.isDefault
                              ? jsx(ActionButton, {
                                  icon: 'star',
                                  label: 'Set as default branch',
                                  variant: 'default',
                                  onClick: async () => {
                                    const res = await apiFetch(`/api/hr/branches/${row._id}/default`, { method: 'PUT' });
                                    if (res.ok && res.data && res.data.success) {
                                      toast(`${row.name} is now the default branch`, { icon: 'check' });
                                      reload();
                                    } else {
                                      toast((res.data && res.data.message) || res.error || 'Could not set default branch', { icon: 'x' });
                                    }
                                  }
                                })
                              : null,
                            onEdit: () => startEdit(row),
                            onDelete: (ev) => handleDelete(row, ev.currentTarget)
                          })
                        })
                      ]
                    })
                })
            ] })
          })
        ]
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Employees
 * ------------------------------------------------------------------ */

const STAFF_STATUSES = ['Active', 'Inactive', 'On Leave', 'Terminated'];
const STAFF_REQUIRED = ['firstName', 'branch', 'joiningDate'];
const STAFF_NUMERIC = [
  'basic',
  'hra',
  'transportAllowance',
  'telephoneAllowance',
  'foodAllowance',
  'specialAllowance',
  'otherEarnings',
  'otherDeductions'
];
const STAFF_GROUPS = [
  {
    label: 'Personal',
    fields: ['salutation', 'firstName', 'middleName', 'lastName', 'email', 'phone', 'dob', 'gender', 'maritalStatus', 'bloodGroup', 'nationality']
  },
  {
    label: 'Employment',
    fields: ['department', 'role', 'branch', 'shift', 'employmentType', 'joiningDate', 'status', 'biometricId']
  },
  { label: 'Salary elements', fields: STAFF_NUMERIC },
  { label: 'Bank settlement', fields: ['bankName', 'accountNumber', 'ifscCode', 'iban'] },
  { label: 'Portal access', fields: ['createLogin', 'accessLevel', 'username', 'password'] }
];

const ROLE_ACCESS_SUMMARY = {
  Admin: 'Full CRM access: Dashboard, Clients, Deals, Reach, Invoices & Tax Settings, Accounts, HR & Payroll, Masters, Team, and Settings.',
  Manager: 'Operational access: Dashboard, Clients, Deals, Reach, Invoices, Accounts, HR (Employees, Offer Letters, Attendance, Leave), and Team. Restricted from Settings, Masters, and Payroll.',
  Staff: 'Workspace access only: Dashboard, Clients, Projects, Deals, Inbox, Calendar, Outreach, and Playbooks. Restricted from Invoices, Accounts, HR, Masters, Team, and Settings.'
};

const staffSelect = (name, label, options, value) =>
  jsx(
    HrField,
    { label },
    jsx(
      'select',
      { className: 'select', name, defaultValue: value || '' },
      options.map((opt) => jsx('option', { value: opt, key: opt || '__none', children: opt || 'Select' }))
    )
  );


const goStaff = (p) => {
  if (window.__navigate) window.__navigate(p);
  else { history.pushState(null, '', p); window.dispatchEvent(new Event('popstate')); }
};

const STAFF_SECTION_INFO = {
  'Personal': ['user', 'Name, contact details, date of birth and personal info.'],
  'Employment': ['team', 'Designation, branch, shift and joining details.'],
  'Salary elements': ['card', 'Monthly salary components that feed payroll.'],
  'Bank settlement': ['finance', 'Where the salary is paid.'],
  'Portal access': ['lock', 'Assign login role (page access), username and password for CRM sign-in.']
};

function renderStaffField(key, ctx) {
  const { staff, isEdit, shiftOptions, branchList, snap, setSnap } = ctx;
  {
              if (key === 'createLogin') {
                return jsx(
                  HrField,
                  { key, label: 'Enable CRM login' },
                  jsx('input', {
                    type: 'checkbox',
                    name: 'createLogin',
                    defaultChecked: Boolean(staff && staff.createLogin)
                  })
                );
              }
              if (key === 'username') {
                return jsx(
                  HrField,
                  { key, label: 'Login username' },
                  jsx('input', {
                    className: 'input',
                    type: 'text',
                    name: 'username',
                    placeholder: 'e.g. john.doe (no spaces)',
                    autoComplete: 'username',
                    defaultValue: staff && staff.username ? staff.username : ''
                  })
                );
              }
              if (key === 'password') {
                return jsx(
                  HrField,
                  { key, label: isEdit && staff && staff.createLogin ? 'New password (leave blank to keep)' : 'Login password' },
                  jsx('input', {
                    className: 'input',
                    type: 'password',
                    name: 'password',
                    placeholder: 'Minimum 6 characters',
                    autoComplete: 'new-password'
                  })
                );
              }
              if (key === 'confirmPassword') {
                return jsx(
                  HrField,
                  { key, label: 'Confirm password' },
                  jsx('input', {
                    className: 'input',
                    type: 'password',
                    name: 'confirmPassword',
                    placeholder: 'Re-enter the password',
                    autoComplete: 'new-password'
                  })
                );
              }
              if (key === 'shift') {
                return jsx(
                  HrField,
                  { key, label: 'Shift' },
                  jsx(
                    'select',
                    {
                      className: 'select',
                      name: 'shift',
                      defaultValue: staff && staff.shift ? staff.shift : ''
                    },
                    [
                      jsx('option', { value: '', key: '__none', children: 'No shift' }),
                      ...shiftOptions.map((opt) =>
                        jsx('option', { value: opt.value, key: opt.value, children: opt.label })
                      )
                    ]
                  )
                );
              }
              if (key === 'branch') {
                const defaultBranch = branchList.defaultBranch || (branchList.length > 0 ? branchList[0] : '');
                const current = staff && staff.branch ? staff.branch : (snap && snap.branch !== undefined ? snap.branch : defaultBranch);
                return jsx(
                  HrField,
                  { key, label: 'Branch', required: true },
                  jsx(
                    'select',
                    {
                      className: 'select',
                      name: 'branch',
                      value: current,
                      onChange: (ev) => {
                        const val = ev.target.value;
                        if (setSnap) setSnap((prev) => ({ ...prev, branch: val }));
                      }
                    },
                    branchOptions(branchList, current, false).map((opt) =>
                      jsx('option', { value: opt, key: opt || '__none', children: opt || 'Select branch' })
                    )
                  )
                );
              }
              if (key === 'status') {
                return staffSelect('status', 'Status', STAFF_STATUSES, staff && staff.status ? staff.status : 'Active');
              }
              if (key === 'gender') {
                return staffSelect('gender', 'Gender', ['', 'Male', 'Female', 'Other'], staff && staff.gender);
              }
              if (key === 'maritalStatus') {
                return staffSelect(
                  'maritalStatus',
                  'Marital status',
                  ['', 'Single', 'Married', 'Divorced', 'Widowed'],
                  staff && staff.maritalStatus
                );
              }
              if (key === 'employmentType') {
                return staffSelect(
                  'employmentType',
                  'Employment type',
                  ['Full-time', 'Part-time', 'Contract', 'Intern'],
                  staff && staff.employmentType ? staff.employmentType : 'Full-time'
                );
              }
              if (key === 'bloodGroup') {
                return staffSelect(
                  'bloodGroup',
                  'Blood group',
                  ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
                  staff && staff.bloodGroup
                );
              }
              if (key === 'accessLevel') {
                const roleOpts = Array.isArray(ctx.roleOptions) && ctx.roleOptions.length
                  ? ctx.roleOptions.map((r) => r.name)
                  : ['Staff', 'Manager', 'Admin'];
                const curVal = staff && staff.accessLevel ? staff.accessLevel : 'Staff';
                const list = roleOpts.includes(curVal) ? roleOpts : [curVal, ...roleOpts];
                return staffSelect(
                  'accessLevel',
                  'Login role (page access)',
                  list,
                  curVal
                );
              }
              if (key === 'salutation') {
                return staffSelect('salutation', 'Salutation', ['', 'Mr', 'Mrs', 'Ms', 'Dr'], staff && staff.salutation);
              }
              const numeric = STAFF_NUMERIC.indexOf(key) >= 0;
              const LABELS = { dob: 'Date of birth', ifscCode: 'IFSC code', iban: 'IBAN', biometricId: 'Biometric ID', hra: 'HRA' };
              const label = LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
              const value = staff && staff[key] !== undefined && staff[key] !== null ? staff[key] : '';
              return jsx(
                HrField,
                { key, label, required: STAFF_REQUIRED.indexOf(key) >= 0 },
                jsx('input', {
                  className: 'input',
                  type: numeric ? 'number' : (key === 'dob' || key === 'joiningDate' ? 'date' : 'text'),
                  step: numeric ? 'any' : undefined,
                  min: numeric ? '0' : undefined,
                  name: key,
                  defaultValue: value
                })
              );

  }
}

function StaffFormPage({ editId }) {
  const isEdit = !!editId;
  const shifts = useCollection('/api/hr/shifts');
  const branchList = useBranches();
  const [roleOptions, setRoleOptions] = useState([]);
  const [staff, setStaff] = useState(null);
  const [loaded, setLoaded] = useState(!editId);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useFormMode();
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState({});

  useEffect(() => {
    apiFetch('/api/roles/options').then((res) => {
      if (res.ok && res.data && Array.isArray(res.data.data)) setRoleOptions(res.data.data);
    });
  }, []);

  useEffect(() => {
    if (!editId) return;
    apiFetch(`/api/staff/${editId}`).then((res) => {
      if (res.ok && res.data && res.data.data) setStaff(res.data.data);
      else toast('Employee not found', { icon: 'x' });
      setLoaded(true);
    });
  }, [editId]);

  useEffect(() => {
    if (!isEdit && branchList.defaultBranch && !snap.branch) {
      setSnap((prev) => ({ ...prev, branch: branchList.defaultBranch }));
    }
  }, [isEdit, branchList.defaultBranch]);

  const shiftOptions = shifts.rows.map((s) => ({ value: s._id, label: s.name }));
  const ctx = { staff, isEdit, shiftOptions, branchList, roleOptions, snap, setSnap };

  const readForm = () => {
    const el = document.getElementById('hr-staff-form');
    const out = {};
    if (el) new FormData(el).forEach((v, k) => { out[k] = v; });
    return out;
  };
  const stepProblem = (i) => {
    const v = readForm();
    if (i === 0 && !String(v.firstName || '').trim()) return 'First name is required';
    if (i === 1 && !String(v.branch || '').trim()) return 'Branch is required';
    if (i === 1 && !v.joiningDate) return 'Joining date is required';
    if (i === 4 && v.createLogin) {
      const uname = String(v.username || '').trim();
      if (!uname || uname.length < 3 || /\s/.test(uname)) return 'Username must be at least 3 characters without spaces';
      const needsPassword = !isEdit || !(staff && staff.createLogin);
      if (needsPassword && !v.password) return 'A password is needed to create a login account';
      if (v.password && String(v.password).length < 6) return 'Password must be at least 6 characters';
      if (v.password && v.confirmPassword !== undefined && v.password !== v.confirmPassword) return 'Password and confirm password do not match';
    }
    return '';
  };
  const goNext = (target) => {
    for (let i = step; i < target; i += 1) {
      const p = stepProblem(i);
      if (p) { toast(p, { icon: 'x' }); if (i !== step) setStep(i); return; }
    }
    setStep(target);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    const form = ev.currentTarget;
    if (mode === 'wizard' && step < STAFF_GROUPS.length - 1) { goNext(step + 1); return; }
    const data = new FormData(form);
    const payload = {};
    data.forEach((value, key) => {
      payload[key] = value;
    });
    STAFF_NUMERIC.forEach((key) => {
      payload[key] = toNum(payload[key]);
    });
    payload.createLogin = Boolean(payload.createLogin);
    if (!payload.firstName || !String(payload.firstName).trim()) {
      toast('First name is required', { icon: 'x' });
      return;
    }
    if (!payload.branch || !String(payload.branch).trim()) {
      toast('Branch is required', { icon: 'x' });
      return;
    }
    if (!payload.joiningDate) {
      toast('Joining date is required', { icon: 'x' });
      return;
    }
    if (payload.createLogin) {
      const uname = String(payload.username || '').trim();
      if (!uname || uname.length < 3 || /\s/.test(uname)) {
        toast('Username must be at least 3 characters without spaces', { icon: 'x' });
        return;
      }
      payload.username = uname.toLowerCase();
      const needsPassword = !isEdit || !(staff && staff.createLogin);
      if (needsPassword && !payload.password) {
        toast('A password is needed to create a login account', { icon: 'x' });
        return;
      }
      if (payload.password && String(payload.password).length < 6) {
        toast('Password must be at least 6 characters', { icon: 'x' });
        return;
      }
    }
    if (!payload.password) delete payload.password;
    if (!payload.shift) { if (isEdit) payload.shift = null; else delete payload.shift; }
    if (payload.createLogin && payload.confirmPassword !== undefined && payload.password && payload.password !== payload.confirmPassword) {
      toast('Password and confirm password do not match', { icon: 'x' });
      return;
    }
    delete payload.confirmPassword;
    if (isEdit) {
      delete payload.staffCode;
      delete payload.employeeCode;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/staff/${staff._id}` : '/api/staff';
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok && res.data && res.data.success) {
        toast(res.data.message || 'Employee saved', { icon: 'check' });
        goStaff('/hr/staff');
      } else {
        toast((res.data && res.data.message) || res.error || 'Could not save the employee', { icon: 'x' });
      }
    } finally {
      setSaving(false);
    }

  };

  const sectionFields = (g) => {
    // portal access: enable toggle, login role, username, password, confirm password
    if (g.label !== 'Portal access') return g.fields;
    return ['createLogin', 'accessLevel', 'username', 'password', 'confirmPassword'];
  };

  const selectedAccessRole = snap.accessLevel || (staff && staff.accessLevel) || 'Staff';
  const selectedRoleObj = roleOptions.find((r) => r.name === selectedAccessRole);
  const selectedRoleSummary = (selectedRoleObj && (selectedRoleObj.description || `${(selectedRoleObj.allowedPages || []).length} pages enabled: ${(selectedRoleObj.allowedPages || []).slice(0, 6).join(', ')}`)) || ROLE_ACCESS_SUMMARY[selectedAccessRole] || ROLE_ACCESS_SUMMARY.Staff;
  const ICONS = { 'Personal': 'user', 'Employment': 'team', 'Salary elements': 'card', 'Bank settlement': 'finance', 'Portal access': 'lock' };
  const steps = STAFF_GROUPS.map((g) => ({
    id: g.label,
    label: g.label,
    title: g.label,
    icon: ICONS[g.label] || 'note',
    desc: STAFF_SECTION_INFO[g.label] ? STAFF_SECTION_INFO[g.label][1] : '',
    badge: isEdit ? 'Editing' : 'New employee',
    content: jsx(Panel, {
      children: jsxs('div', {
        children: [
          jsx('div', { className: 'form-grid form-grid--3', children: sectionFields(g).map((key) => renderStaffField(key, ctx)) }),
          g.label === 'Portal access'
            ? jsxs('div', {
                'data-testid': 'role-access-summary',
                style: {
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--surface, rgba(118,39,196,0.06))',
                  border: '1px solid var(--line, rgba(118,39,196,0.18))',
                  fontSize: 'var(--fs-sm)',
                  lineHeight: 1.5
                },
                children: [
                  jsx('b', { style: { display: 'block', marginBottom: 4 }, children: `${selectedAccessRole} Role — Page Access Scope` }),
                  jsx('span', { style: { color: 'var(--muted)' }, children: selectedRoleSummary })
                ]
              })
            : null
        ]
      })
    })
  }));

  const num = (v) => Number(v) || 0;
  const fullName = [snap.salutation, snap.firstName, snap.middleName, snap.lastName].filter(Boolean).join(' ');
  const initials = [snap.firstName, snap.lastName].filter(Boolean).map((w) => String(w)[0].toUpperCase()).join('') || 'NE';
  const earnings = ['basic', 'hra', 'transportAllowance', 'telephoneAllowance', 'foodAllowance', 'specialAllowance', 'otherEarnings'].reduce((t, k) => t + num(snap[k]), 0);
  const gross = earnings - num(snap.otherDeductions);
  const preview = jsx(PreviewCard, {
    initials,
    title: fullName || (staff && staff.name) || 'New Employee',
    subtitle: [snap.role, snap.department].filter(Boolean).join(' · ') || 'Role not set',
    tabs: [
      { label: 'Employment', rows: [['Branch', snap.branch], ['Type', snap.employmentType], ['Joining date', snap.joiningDate], ['Status', snap.status], ['Biometric ID', snap.biometricId]] },
      { label: 'Salary', rows: [['Basic', snap.basic ? fmtINR(num(snap.basic)) : ''], ['Total earnings', earnings ? fmtINR(earnings) : ''], ['Deductions', snap.otherDeductions ? fmtINR(num(snap.otherDeductions)) : ''], ['Net monthly', earnings ? fmtINR(gross) : ''], ['Bank', snap.bankName]] },
      { label: 'Portal', rows: [['Login role', selectedAccessRole], ['Username', snap.username || (staff && staff.username) || ''], ['Login', (snap.createLogin !== undefined ? snap.createLogin : (staff && staff.createLogin)) ? 'Enabled' : 'Not created']] }
    ]
  });

  return jsx('div', {
    className: 'page hr',
    children: !loaded
      ? jsx('div', { style: { padding: 24, color: 'var(--muted)' }, children: 'Loading employee…' })
      : jsx('form', {
          id: 'hr-staff-form',
          noValidate: true,
          onSubmit: submit,
          key: staff ? staff._id : 'new',
          onInput: () => setSnap(readForm()),
          onChange: () => setSnap(readForm()),
          children: jsx(FormWizard, {
            icon: 'team',
            title: isEdit ? `Edit ${staff ? staff.name || 'employee' : 'employee'}` : 'Add employee',
            subtitle: isEdit && staff ? staff.staffCode : 'Register a new person on the roster — step by step, with a live preview.',
            steps, step, setStep, mode, setMode, preview,
            backLabel: 'Back',
            onBack: () => goStaff('/hr/staff'),
            onCancel: () => goStaff('/hr/staff'),
            onNext: goNext,
            submitLabel: isEdit ? 'Save changes' : 'Create employee',
            saving
          })
        })
  });
}

function StaffEmployeesPage() {
  const shifts = useCollection('/api/hr/shifts');
  const everyone = useCollection('/api/staff'); // full roster only to list the department filter options
  const branchList = useBranches();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [department, setDepartment] = useState('All');
  const [branch, setBranch] = useState('All Branches');
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });
  // Server-side filtering, ordering and pagination (10 per page)
  const paged = usePaged('/api/staff', {
    q: query.trim(),
    status: status === 'All' ? '' : status,
    department: department === 'All' ? '' : department,
    branch: branch === 'All Branches' ? '' : branch,
    sort: sort.field,
    dir: sort.dir
  }, { noun: 'employees' });
  const { rows, kpis, loading, error } = paged;
  const reload = () => { paged.reload(); everyone.reload(); };

  const kpiData = kpis || {};
  const departments = useMemo(
    () => Array.from(new Set(everyone.rows.map((r) => r.department).filter(Boolean))).sort(),
    [everyone.rows]
  );
  const visible = rows;

  const onSort = (field) =>
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }
    );

  const openStaffDrawer = (mode, staff) => goStaff(mode === 'edit' ? `/hr/staff/${staff._id}` : '/hr/staff/new');

  const handleDelete = async (row, anchor) => {
    const ok = await confirmModal(
      {
        title: 'Delete this employee?',
        text: `${row.name || row.staffCode} and the linked payroll records will be removed.`,
        ok: 'Delete',
        danger: true
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`/api/staff/${row._id}`, { method: 'DELETE' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Employee deleted', { icon: 'trash' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not delete the employee', { icon: 'x' });
    }
  };

  const staffHead = jsx('tr', {
    children: [
      jsx('th', { key: 'id', children: 'Staff ID' }),
      jsx(SortHead, { key: 'name', label: 'Name', field: 'name', sort, onSort }),
      jsx(SortHead, { key: 'role', label: 'Role', field: 'role', sort, onSort }),
      jsx(SortHead, { key: 'department', label: 'Department', field: 'department', sort, onSort }),
      jsx(SortHead, { key: 'branch', label: 'Branch', field: 'branch', sort, onSort }),
      jsx('th', { key: 'login', children: 'Login Access' }),
      jsx('th', { key: 'status', children: 'Status' }),
      jsx(SortHead, { key: 'salary', label: 'Salary', field: 'salary', sort, onSort, className: 'num' }),
      jsx('th', { key: 'actions', children: 'Actions' })
    ]
  });

  return jsxs('div', {
    className: 'hr-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Total staff', value: fmtCount(kpiData.totalStaff), tone: 'cobalt', icon: 'team' },
          { label: 'Active', value: fmtCount(kpiData.activeStaff), tone: 'teal', icon: 'check' },
          { label: 'On leave', value: fmtCount(kpiData.onLeave), tone: 'amber', icon: 'calendar' },
          { label: 'Trainers', value: fmtCount(kpiData.trainers), tone: 'slate', icon: 'trophy' }
        ]
      }),
      error
        ? jsx('div', {
            className: 'hr-banner hr-banner--bad',
            children: [jsx(Icon, { name: 'x' }), jsx('span', { children: error })]
          })
        : null,
      jsx(Card, {
        title: 'Employee directory',
        sub: `${paged.pagination ? paged.pagination.total : 0} people`,
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(HrToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search name, code, role…' }),
                jsx(
                  'select',
                  {
                    className: 'select hr-filter',
                    value: status,
                    onChange: (ev) => setStatus(ev.target.value),
                    'aria-label': 'Filter by status'
                  },
                  ['All', ...STAFF_STATUSES].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                ),
                jsx(
                  'select',
                  {
                    className: 'select hr-filter',
                    value: department,
                    onChange: (ev) => setDepartment(ev.target.value),
                    'aria-label': 'Filter by department'
                  },
                  ['All', ...departments].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                ),
                jsx(
                  'select',
                  {
                    className: 'select hr-filter',
                    value: branch,
                    onChange: (ev) => setBranch(ev.target.value),
                    'aria-label': 'Filter by branch'
                  },
                  ['All Branches', ...branchList].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                ),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openStaffDrawer('create', null),
                  children: [jsx(Icon, { name: 'plus' }), 'Add employee']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching the roster.' })
              : jsx(HrTable, {
                  head: [],
                  headNode: staffHead,
                  rows: visible,
                  paged,
                  emptyIcon: 'team',
                  emptyTitle: query || status !== 'All' ? 'No matching employees' : 'No employees yet',
                  emptyText: 'Add the first employee to start the roster.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', { children: jsx('b', { children: asText(row.staffCode) }) }),
                        jsx('td', {
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [
                              jsx('b', { children: asText(row.name) }),
                              jsx('small', { children: asText(row.employeeCode || row.biometricId) })
                            ]
                          })
                        }),
                        jsx('td', { children: asText(row.role) }),
                        jsx('td', { children: asText(row.department) }),
                        jsx('td', { children: asText(row.branch) }),
                        jsx('td', {
                          children: row.createLogin && row.username
                            ? jsxs('span', {
                                className: 'li__main',
                                children: [
                                  jsx(StatusPill, {
                                    kind: row.accessLevel === 'Admin' ? 'info' : (row.accessLevel === 'Manager' ? 'warn' : 'good'),
                                    children: row.accessLevel || 'Staff'
                                  }),
                                  jsx('small', { style: { fontFamily: 'monospace' }, children: row.username })
                                ]
                              })
                            : jsx('span', { style: { color: 'var(--muted)', fontSize: 'var(--fs-xs)' }, children: 'No login' })
                        }),
                        jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                        jsx('td', {
                          className: 'num',
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [
                              jsx('b', { children: fmtINR(row.salary) }),
                              jsx('small', { children: `Net ${fmtINR(row.netSalary)}` })
                            ]
                          })
                        }),
                        jsx('td', {
                          className: 'hr-actions-cell',
                          children: jsxs('div', {
                            className: 'hr-row-actions',
                            children: [
                              jsx(ActionButton, {
                                icon: 'edit',
                                label: 'Edit employee',
                                variant: 'edit',
                                onClick: () => openStaffDrawer('edit', row)
                              }),
                              jsx(ActionButton, {
                                icon: 'trash',
                                label: 'Delete employee',
                                variant: 'delete',
                                danger: true,
                                onClick: (ev) => handleDelete(row, ev.currentTarget)
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
 * Biometric attendance
 * ------------------------------------------------------------------ */

const ATTENDANCE_STATUSES = ['Present', 'Late', 'Absent', 'Half Day', 'On Leave'];

function AttendancePage() {
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('All');
  const [query, setQuery] = useState('');

  const paged = usePaged('/api/hr/staff-attendance', { month, status: status === 'All' ? '' : status, q: query.trim() }, { noun: 'records' });
  const { rows, kpis, loading, error, reload } = paged;
  const staff = useStaffOptions(true);
  const kpiData = kpis || {};
  const visible = rows;

  const openAttendanceDrawer = (mode, record) => {
    const isEdit = mode === 'edit';
    const submit = async (ev) => {
      ev.preventDefault();
      const data = new FormData(ev.currentTarget);
      const payload = {
        staffRef: data.get('staffRef') || '',
        date: data.get('date') || '',
        status: data.get('status') || 'Present',
        checkIn: data.get('checkIn') || '',
        checkOut: data.get('checkOut') || '',
        remarks: data.get('remarks') || ''
      };
      if (!payload.staffRef || !payload.date) {
        toast('Employee and date are required', { icon: 'x' });
        return;
      }
      const target = isEdit ? `/api/hr/staff-attendance/${record._id}` : '/api/hr/staff-attendance';
      const res = await apiFetch(target, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok && res.data && res.data.success) {
        toast(res.data.message || 'Attendance saved', { icon: 'check' });
        closeDrawer();
        reload();
      } else {
        toast((res.data && res.data.message) || res.error || 'Could not save the attendance record', { icon: 'x' });
      }
    };

    openDrawer(
      jsxs(ModalDrawer, {
        title: isEdit ? 'Edit attendance record' : 'Log attendance',
        sub: 'Working hours and late fines are calculated by the server.',
        foot: jsxs(Fragment, {
          children: [
            jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
            jsx('button', {
              type: 'submit',
              form: 'hr-attendance-form',
              className: 'btn btn--primary',
              children: isEdit ? 'Save changes' : 'Log attendance'
            })
          ]
        }),
        children: jsxs('form', {
          id: 'hr-attendance-form',
          noValidate: true,
          onSubmit: submit,
          children: jsx('div', {
            className: 'form-grid',
            children: [
              jsx(
                HrField,
                { label: 'Employee', required: true, className: 'span-2' },
                jsx(
                  'select',
                  { className: 'select', name: 'staffRef', defaultValue: record && record.staffRef ? record.staffRef : '' },
                  [
                    jsx('option', {
                      value: '',
                      key: '__none',
                      children: staff.loading ? 'Loading employees…' : 'Select an employee'
                    }),
                    ...staff.options.map((opt) =>
                      jsx('option', { value: opt.value, key: opt.value, children: opt.label })
                    )
                  ]
                )
              ),
              jsx(
                HrField,
                { label: 'Date', required: true },
                jsx('input', {
                  className: 'input',
                  type: 'date',
                  name: 'date',
                  defaultValue: record && record.date ? record.date : ''
                })
              ),
              jsx(
                HrField,
                { label: 'Status' },
                jsx(
                  'select',
                  { className: 'select', name: 'status', defaultValue: record && record.status ? record.status : '' },
                  ATTENDANCE_STATUSES.map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                )
              ),
              jsx(
                HrField,
                { label: 'Check in' },
                jsx('input', {
                  className: 'input',
                  type: 'time',
                  name: 'checkIn',
                  defaultValue: record && record.checkIn && record.checkIn !== '—' ? record.checkIn : ''
                })
              ),
              jsx(
                HrField,
                { label: 'Check out' },
                jsx('input', {
                  className: 'input',
                  type: 'time',
                  name: 'checkOut',
                  defaultValue: record && record.checkOut && record.checkOut !== '—' ? record.checkOut : ''
                })
              ),
              jsx(
                HrField,
                { label: 'Remarks', className: 'span-2' },
                jsx('textarea', {
                  className: 'textarea',
                  name: 'remarks',
                  rows: 2,
                  defaultValue: record && record.remarks ? record.remarks : ''
                })
              )
            ]
          })
        })
      })
    );
  };

  const handleDelete = async (row, anchor) => {
    const ok = await confirmModal(
      {
        title: 'Delete this attendance record?',
        text: `${row.staffName || 'This record'} on ${row.date} will be removed.`,
        ok: 'Delete',
        danger: true
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`/api/hr/staff-attendance/${row._id}`, { method: 'DELETE' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Attendance record deleted', { icon: 'trash' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not delete the record', { icon: 'x' });
    }
  };

  return jsxs('div', {
    className: 'hr-stack',
    children: [
      jsx(KpiRow, {
        className: 'hr-kpis-5',
        items: [
          { label: 'Total logs', value: fmtCount(kpiData.totalLogs), tone: 'cobalt', icon: 'clock' },
          { label: 'Present', value: fmtCount(kpiData.present), tone: 'teal', icon: 'check' },
          { label: 'Late', value: fmtCount(kpiData.late), tone: 'amber', icon: 'clock' },
          { label: 'Absent', value: fmtCount(kpiData.absent), tone: 'slate', icon: 'x' },
          { label: 'On leave', value: fmtCount(kpiData.onLeave), tone: 'citron', icon: 'calendar' }
        ]
      }),
      error
        ? jsx('div', {
            className: 'hr-banner hr-banner--bad',
            children: [jsx(Icon, { name: 'x' }), jsx('span', { children: error })]
          })
        : null,
      jsx(Card, {
        title: 'Attendance ledger',
        sub: kpiData.workingHours ? `${kpiData.workingHours} logged in the current view` : 'Daily punch records',
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(HrToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search staff or date…' }),
                jsx('input', {
                  className: 'input hr-filter',
                  type: 'month',
                  value: month,
                  onChange: (ev) => setMonth(ev.target.value),
                  'aria-label': 'Filter by month'
                }),
                jsx(
                  'select',
                  {
                    className: 'select hr-filter',
                    value: status,
                    onChange: (ev) => setStatus(ev.target.value),
                    'aria-label': 'Filter by status'
                  },
                  ['All', ...ATTENDANCE_STATUSES].map((opt) =>
                    jsx('option', { value: opt, key: opt, children: opt })
                  )
                ),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  onClick: () => openAttendanceDrawer('create', null),
                  children: [jsx(Icon, { name: 'plus' }), 'Log attendance']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching attendance records.' })
              : jsx(HrTable, {
                  head: ['Date', 'Staff', 'Role', 'Check in', 'Check out', 'Working hours', 'Status', 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'clock',
                  emptyTitle: 'No attendance records',
                  emptyText: 'Log a record manually or wait for the biometric device.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', { children: fullDate(row.date) }),
                        jsx('td', {
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [
                              jsx('b', { children: asText(row.staffName) }),
                              jsx('small', { children: asText(row.staffId) })
                            ]
                          })
                        }),
                        jsx('td', { children: asText(row.role) }),
                        jsx('td', { children: asText(row.checkIn) }),
                        jsx('td', { children: asText(row.checkOut) }),
                        jsx('td', { children: asText(row.workingHours) }),
                        jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                        jsx('td', {
                          className: 'hr-actions-cell',
                          children: jsx(RowActions, {
                            onEdit: () => openAttendanceDrawer('edit', row),
                            onDelete: (ev) => handleDelete(row, ev.currentTarget)
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
 * Leave requests
 * ------------------------------------------------------------------ */

function LeavePage() {
  const [query, setQuery] = useState('');
  const paged = usePaged('/api/hr/leave', { q: query.trim() }, { noun: 'requests' });
  const { rows, kpis, loading, error, reload } = paged;
  const staff = useStaffOptions(true);
  const leaveTypes = useCollection('/api/hr/leave-types');
  const kpiData = kpis || {};

  const [values, setValues] = useState({
    staffRef: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [impact, setImpact] = useState(null);
  const [saving, setSaving] = useState(false);
  const visible = rows;

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const requestedDays = useMemo(() => {
    if (!values.fromDate || !values.toDate) return 0;
    const from = new Date(`${values.fromDate}T12:00:00`);
    const to = new Date(`${values.toDate}T12:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    const diff = Math.round((to.getTime() - from.getTime()) / 86400000);
    return diff < 0 ? 0 : diff + 1;
  }, [values.fromDate, values.toDate]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    if (!values.staffRef || !values.leaveType || !values.fromDate || !values.toDate) {
      toast('Employee, leave type and both dates are required', { icon: 'x' });
      return;
    }
    setSaving(true);
    const res = await apiFetch('/api/hr/leave', {
      method: 'POST',
      body: JSON.stringify({
        staffRef: values.staffRef,
        leaveType: values.leaveType,
        fromDate: values.fromDate,
        toDate: values.toDate,
        reason: values.reason.trim()
      })
    });
    setSaving(false);
    if (res.ok && res.data && res.data.success) {
      const created = res.data.data || {};
      setImpact({ days: created.days, paidDays: created.paidDays, lopDays: created.lopDays });
      toast(res.data.message || 'Leave request submitted', { icon: 'check' });
      setValues({ staffRef: '', leaveType: '', fromDate: '', toDate: '', reason: '' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not submit the leave request', { icon: 'x' });
    }
  };

  const decide = async (row, action, anchor) => {
    if (action === 'reject') {
      openDrawer(
        jsxs(ModalDrawer, {
          title: 'Reject leave request',
          sub: `${row.staffName || 'Employee'} · ${row.fromDate} → ${row.toDate}`,
          foot: jsxs(Fragment, {
            children: [
              jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: closeDrawer, children: 'Cancel' }),
              jsx('button', {
                type: 'submit',
                form: 'hr-reject-form',
                className: 'btn btn--primary',
                children: 'Reject request'
              })
            ]
          }),
          children: jsx(
            'form',
            {
              id: 'hr-reject-form',
              noValidate: true,
              onSubmit: async (ev) => {
                ev.preventDefault();
                const reason = new FormData(ev.currentTarget).get('reason') || '';
                const res = await apiFetch(`/api/hr/leave/${row._id}/reject`, {
                  method: 'POST',
                  body: JSON.stringify({ reason: String(reason) })
                });
                if (res.ok && res.data && res.data.success) {
                  toast(res.data.message || 'Leave request rejected', { icon: 'check' });
                  closeDrawer();
                  reload();
                } else {
                  toast((res.data && res.data.message) || res.error || 'Could not reject the request', { icon: 'x' });
                }
              }
            },
            jsx(
              HrField,
              { label: 'Reason for rejection' },
              jsx('textarea', {
                className: 'textarea',
                name: 'reason',
                rows: 3,
                placeholder: 'Why is this request rejected?'
              })
            )
          )
        })
      );
      return;
    }
    const ok = await confirmModal(
      {
        title: 'Approve this leave request?',
        text: `${row.staffName || 'Employee'} · ${fmtCount(row.days)} day(s) with ${fmtCount(row.lopDays)} loss-of-pay day(s).`,
        ok: 'Approve'
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`/api/hr/leave/${row._id}/approve`, { method: 'POST' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Leave request approved', { icon: 'check' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not approve the request', { icon: 'x' });
    }
  };

  const handleDelete = async (row, anchor) => {
    const ok = await confirmModal(
      {
        title: 'Delete this leave request?',
        text: `${row.staffName || 'Employee'} · ${row.fromDate} → ${row.toDate}`,
        ok: 'Delete',
        danger: true
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`/api/hr/leave/${row._id}`, { method: 'DELETE' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Leave request deleted', { icon: 'trash' });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not delete the request', { icon: 'x' });
    }
  };

  return jsxs('div', {
    className: 'hr-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Pending', value: fmtCount(kpiData.pending), tone: 'amber', icon: 'clock' },
          { label: 'Approved', value: fmtCount(kpiData.approved), tone: 'teal', icon: 'check' },
          { label: 'Rejected', value: fmtCount(kpiData.rejected), tone: 'slate', icon: 'x' }
        ]
      }),
      error
        ? jsx('div', {
            className: 'hr-banner hr-banner--bad',
            children: [jsx(Icon, { name: 'x' }), jsx('span', { children: error })]
          })
        : null,
      jsxs('div', {
        className: 'st-grid hr-split',
        children: [
          jsx(Card, {
            title: 'Apply for leave',
            sub: 'Pay impact is calculated by the server once the request is submitted.',
            children: jsxs('form', {
              noValidate: true,
              onSubmit: handleSubmit,
              children: [
                jsxs('div', {
                  className: 'form-grid',
                  children: [
                    jsx(
                      HrField,
                      { label: 'Employee', required: true, className: 'span-2' },
                      jsx(
                        'select',
                        {
                          className: 'select',
                          value: values.staffRef,
                          onChange: (ev) => setValue('staffRef', ev.target.value)
                        },
                        [
                          jsx('option', {
                            value: '',
                            key: '__none',
                            children: staff.loading ? 'Loading employees…' : 'Select an employee'
                          }),
                          ...staff.options.map((opt) =>
                            jsx('option', { value: opt.value, key: opt.value, children: opt.label })
                          )
                        ]
                      )
                    ),
                    jsx(
                      HrField,
                      { label: 'Leave type', required: true, className: 'span-2' },
                      jsx(
                        'select',
                        {
                          className: 'select',
                          value: values.leaveType,
                          onChange: (ev) => setValue('leaveType', ev.target.value)
                        },
                        [
                          jsx('option', { value: '', key: '__none', children: 'Select a leave type' }),
                          ...leaveTypes.rows.map((t) =>
                            jsx('option', { value: t._id, key: t._id, children: t.name })
                          )
                        ]
                      )
                    ),
                    jsx(
                      HrField,
                      { label: 'From date', required: true },
                      jsx('input', {
                        className: 'input',
                        type: 'date',
                        value: values.fromDate,
                        onChange: (ev) => setValue('fromDate', ev.target.value)
                      })
                    ),
                    jsx(
                      HrField,
                      { label: 'To date', required: true },
                      jsx('input', {
                        className: 'input',
                        type: 'date',
                        value: values.toDate,
                        onChange: (ev) => setValue('toDate', ev.target.value)
                      })
                    ),
                    jsx(
                      HrField,
                      { label: 'Reason', className: 'span-2' },
                      jsx('textarea', {
                        className: 'textarea',
                        rows: 2,
                        value: values.reason,
                        onChange: (ev) => setValue('reason', ev.target.value),
                        placeholder: 'Why is this leave needed?'
                      })
                    )
                  ]
                }),
                jsx(PreviewBox, {
                  title: 'Pay impact',
                  children: jsxs('div', {
                    className: 'hr-preview__row',
                    children: [
                      jsx('span', { children: 'Requested days (preview)' }),
                      jsx('b', { children: fmtCount(requestedDays) })
                    ]
                  })
                }),
                impact
                  ? jsx(PreviewBox, {
                      title: 'Last submitted impact (from server)',
                      children: jsx(ImpactChips, { impact })
                    })
                  : null,
                jsxs('div', {
                  className: 'st-actions',
                  children: [
                    jsx('button', {
                      type: 'submit',
                      className: 'btn btn--primary',
                      disabled: saving,
                      children: saving ? 'Submitting…' : 'Submit request'
                    })
                  ]
                })
              ]
            })
          }),
          jsx(Card, {
            title: 'Leave history',
            sub: `${paged.pagination ? paged.pagination.total : 0} request${paged.pagination && paged.pagination.total === 1 ? '' : 's'}`,
            tools: jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search requests…' }),
            flush: true,
            children: loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching leave requests.' })
              : jsx(HrTable, {
                  head: ['Employee', 'Type', 'From', 'To', 'Days', 'Paid', 'LOP', 'Status', 'Actions'],
                  rows: visible,
                  paged,
                  emptyIcon: 'calendar',
                  emptyTitle: 'No leave requests',
                  emptyText: 'Use the form to apply for leave.',
                  renderRow: (row) =>
                    jsx('tr', {
                      'data-row': '',
                      key: row._id,
                      children: [
                        jsx('td', {
                          children: jsxs('span', {
                            className: 'li__main',
                            children: [
                              jsx('b', { children: asText(row.staffName) }),
                              jsx('small', { children: asText(row.staffId) })
                            ]
                          })
                        }),
                        jsx('td', { children: asText(row.leaveTypeName || row.leaveType) }),
                        jsx('td', { children: fullDate(row.fromDate) }),
                        jsx('td', { children: fullDate(row.toDate) }),
                        jsx('td', { children: fmtCount(row.days) }),
                        jsx('td', { children: fmtCount(row.paidDays) }),
                        jsx('td', { children: fmtCount(row.lopDays) }),
                        jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                        jsx('td', {
                          className: 'hr-actions-cell',
                          children: jsxs('div', {
                            className: 'hr-row-actions',
                            children: [
                              row.status === 'Pending'
                                ? jsx(ActionButton, {
                                    icon: 'check',
                                    label: 'Approve leave',
                                    variant: 'approve',
                                    onClick: (ev) => decide(row, 'approve', ev.currentTarget)
                                  })
                                : null,
                              row.status === 'Pending'
                                ? jsx(ActionButton, {
                                    icon: 'x',
                                    label: 'Reject leave',
                                    variant: 'reject',
                                    danger: true,
                                    onClick: (ev) => decide(row, 'reject', ev.currentTarget)
                                  })
                                : null,
                              jsx(ActionButton, {
                                icon: 'trash',
                                label: 'Delete leave request',
                                variant: 'delete',
                                danger: true,
                                onClick: (ev) => handleDelete(row, ev.currentTarget)
                              })
                            ]
                          })
                        })
                      ]
                    })
                })
          })
        ]
      })
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Payroll & payslips
 * ------------------------------------------------------------------ */

function PayslipDoc({ run, slip }) {
  const attendance = slip.attendance || {};
  const bank = slip.bank || {};
  const earnings = [
    ['Gross pay', slip.grossPay],
    ['Shift differential', slip.shiftDifferential],
    ['Credits', slip.credits]
  ].filter((row) => Number(row[1]) > 0);
  const deductions = [
    ['Loss of pay', slip.lopDeduction],
    ['Fixed deductions', slip.fixedDeductions],
    ['Advance recovery', slip.advanceRecovery],
    ['Ad-hoc deductions', slip.adHocDeductions],
    ['Late fines', slip.lateFines]
  ].filter((row) => Number(row[1]) > 0);

  return jsx('div', {
    className: 'hr-payslip hr-print-area',
    children: [
      jsxs('div', {
        className: 'hr-payslip__head',
        children: [
          jsxs('div', {
            children: [jsx('b', { children: 'Payslip' }), jsx('small', { children: slip.payslipNo || '—' })]
          }),
          jsxs('div', {
            children: [
              jsx('b', { children: slip.staffName || '—' }),
              jsx('small', { children: `${slip.designation || 'Staff'} · ${slip.branch || '—'}` })
            ]
          }),
          jsxs('div', {
            children: [
              jsx('b', { children: `Period ${run.period}` }),
              jsx('small', { children: `Run ${run.status || 'Draft'}` })
            ]
          })
        ]
      }),
      jsxs('div', {
        className: 'hr-payslip__cols',
        children: [
          jsxs('div', {
            className: 'hr-payslip__col',
            children: [
              jsx('h5', { children: 'Earnings' }),
              ...earnings.map((row) =>
                jsxs('div', {
                  className: 'hr-payslip__line',
                  key: row[0],
                  children: [jsx('span', { children: row[0] }), jsx('b', { children: fmtINR(row[1]) })]
                })
              ),
              jsxs('div', {
                className: 'hr-payslip__line hr-payslip__line--total',
                children: [
                  jsx('span', { children: 'Total earnings' }),
                  jsx('b', { children: fmtINR(slip.totalEarnings) })
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'hr-payslip__col',
            children: [
              jsx('h5', { children: 'Deductions' }),
              ...deductions.map((row) =>
                jsxs('div', {
                  className: 'hr-payslip__line',
                  key: row[0],
                  children: [jsx('span', { children: row[0] }), jsx('b', { children: fmtINR(row[1]) })]
                })
              ),
              jsxs('div', {
                className: 'hr-payslip__line hr-payslip__line--total',
                children: [
                  jsx('span', { children: 'Total deductions' }),
                  jsx('b', { children: fmtINR(slip.totalDeductions) })
                ]
              })
            ]
          })
        ]
      }),
      jsxs('div', {
        className: 'hr-payslip__cols',
        children: [
          jsxs('div', {
            className: 'hr-payslip__col',
            children: [
              jsx('h5', { children: 'Attendance' }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'Present' }), jsx('b', { children: fmtCount(attendance.present) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'Late' }), jsx('b', { children: fmtCount(attendance.late) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'Absent' }), jsx('b', { children: fmtCount(attendance.absent) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'Half days' }), jsx('b', { children: fmtCount(attendance.halfDay) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'On leave' }), jsx('b', { children: fmtCount(attendance.onLeave) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'LOP days' }), jsx('b', { children: fmtCount(slip.lopDays) })]
              })
            ]
          }),
          jsxs('div', {
            className: 'hr-payslip__col',
            children: [
              jsx('h5', { children: 'Bank details' }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'Bank' }), jsx('b', { children: asText(bank.bankName) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'Account' }), jsx('b', { children: asText(bank.accountNumber) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line',
                children: [jsx('span', { children: 'IFSC' }), jsx('b', { children: asText(bank.ifscCode) })]
              }),
              jsxs('div', {
                className: 'hr-payslip__line hr-payslip__line--total',
                children: [jsx('span', { children: 'Net payout' }), jsx('b', { children: fmtINR(slip.netPayout) })]
              })
            ]
          })
        ]
      })
    ]
  });
}

function PayrollPage() {
  const { rows, kpis, loading, error, reload } = useCollection('/api/hr/payroll');
  const branches = useBranches();
  const kpiData = kpis || {};

  const [period, setPeriod] = useState('');
  const [branch, setBranch] = useState('All Branches');
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openRun = async (id) => {
    setSelected(id);
    setDetail(null);
    setDetailLoading(true);
    const res = await apiFetch(`/api/hr/payroll/${id}`);
    setDetailLoading(false);
    if (res.ok && res.data && res.data.success) {
      setDetail(res.data.data);
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not load the payroll run', { icon: 'x' });
    }
  };

  const runPayroll = async () => {
    if (running) return;
    if (!period) {
      toast('Choose a payroll period first', { icon: 'x' });
      return;
    }
    setRunning(true);
    const res = await apiFetch('/api/hr/payroll/run', {
      method: 'POST',
      body: JSON.stringify({ period, branch, autoReconcile })
    });
    setRunning(false);
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Payroll processed', { icon: 'check' });
      reload();
      if (res.data.data && res.data.data._id) openRun(res.data.data._id);
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not run payroll', { icon: 'x' });
    }
  };

  const advanceRun = async (run, action, anchor) => {
    const ok = await confirmModal(
      {
        title: action === 'pay' ? 'Mark this run as paid?' : 'Finalize this payroll run?',
        text: `${run.period} · ${run.branch || 'All Branches'} · ${fmtCount(run.employeeCount)} employee(s).`,
        ok: action === 'pay' ? 'Mark paid' : 'Finalize'
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`/api/hr/payroll/${run._id}/${action}`, { method: 'POST' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Payroll run updated', { icon: 'check' });
      reload();
      if (selected === run._id) openRun(run._id);
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not update the run', { icon: 'x' });
    }
  };

  const handleDelete = async (run, anchor) => {
    const ok = await confirmModal(
      {
        title: 'Delete this payroll run?',
        text: `${run.period} · ${run.branch || 'All Branches'}. Advance recoveries will be reversed.`,
        ok: 'Delete',
        danger: true
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`/api/hr/payroll/${run._id}`, { method: 'DELETE' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Payroll run deleted', { icon: 'trash' });
      if (selected === run._id) {
        setSelected(null);
        setDetail(null);
      }
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not delete the run', { icon: 'x' });
    }
  };

  const openPayslip = (slip) => {
    const run = detail || {};
    openDrawer(
      jsxs(ModalDrawer, {
        title: `Payslip · ${slip.payslipNo || ''}`,
        sub: `${slip.staffName || '—'} · ${slip.designation || 'Staff'}`,
        foot: jsxs(Fragment, {
          children: [
            jsx('button', {
              type: 'button',
              className: 'btn btn--primary',
              onClick: () => {
                document.body.classList.add('hr-printing');
                window.print();
                document.body.classList.remove('hr-printing');
              },
              children: [jsx(Icon, { name: 'download' }), 'Print']
            })
          ]
        }),
        children: jsx(PayslipDoc, { run, slip })
      })
    );
  };

  const payslips = (detail && detail.payslips) || [];

  return jsxs('div', {
    className: 'hr-stack',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Total runs', value: fmtCount(kpiData.totalRuns), tone: 'cobalt', icon: 'finance' },
          { label: 'Finalized', value: fmtCount(kpiData.finalized), tone: 'teal', icon: 'check' },
          { label: 'Paid', value: fmtCount(kpiData.paid), tone: 'slate', icon: 'card' }
        ]
      }),
      Number(kpiData.pendingLeaves) > 0
        ? jsx('div', {
            className: 'hr-banner hr-banner--warn',
            children: [
              jsx(Icon, { name: 'clock' }),
              jsx('span', {
                children: `${fmtCount(kpiData.pendingLeaves)} leave request(s) are still pending and will not be reflected in this payroll.`
              }),
              jsx('a', { className: 'hr-banner__link', href: '/hr/leave', children: 'Review pending leave' })
            ]
          })
        : null,
      error
        ? jsx('div', {
            className: 'hr-banner hr-banner--bad',
            children: [jsx(Icon, { name: 'x' }), jsx('span', { children: error })]
          })
        : null,
      jsx(Card, {
        title: 'Execution control',
        sub: 'Pick a period, run the payroll and finalise it before payment.',
        children: jsxs('div', {
          className: 'hr-controls',
          children: [
            jsx(
              HrField,
              { label: 'Period' },
              jsx('input', {
                className: 'input',
                type: 'month',
                value: period,
                onChange: (ev) => setPeriod(ev.target.value)
              })
            ),
            jsx(
              HrField,
              { label: 'Branch' },
              jsx(
                'select',
                { className: 'select', value: branch, onChange: (ev) => setBranch(ev.target.value) },
                ['All Branches', ...branches].map((opt) =>
                  jsx('option', { value: opt, key: opt, children: opt })
                )
              )
            ),
            jsx(
              HrField,
              { label: 'Reconciliation' },
              jsx(CheckboxToggle, {
                on: autoReconcile,
                label: 'Auto-reconcile advances',
                onChange: () => setAutoReconcile((v) => !v)
              })
            ),
            jsx('button', {
              type: 'button',
              className: 'btn btn--primary',
              onClick: runPayroll,
              disabled: running,
              children: [jsx(Icon, { name: 'play' }), running ? 'Running…' : 'Run payroll']
            })
          ]
        })
      }),
      jsx(Card, {
        title: 'Payroll runs',
        sub: `${rows.length} run${rows.length === 1 ? '' : 's'}`,
        flush: true,
        children: loading
          ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching payroll runs.' })
          : jsx(HrTable, {
              head: ['Period', 'Branch', 'Status', 'Employees', 'Gross', 'Deductions', 'Net', 'Actions'],
              rows,
              emptyIcon: 'finance',
              emptyTitle: 'No payroll runs yet',
              emptyText: 'Choose a period above and run the payroll.',
              renderRow: (run) =>
                jsx('tr', {
                  'data-row': '',
                  key: run._id,
                  className: selected === run._id ? 'is-selected' : '',
                  children: [
                    jsx('td', { children: asText(run.period) }),
                    jsx('td', { children: asText(run.branch) }),
                    jsx('td', { children: jsx(StatusCell, { value: run.status }) }),
                    jsx('td', { children: fmtCount(run.employeeCount) }),
                    jsx('td', { children: fmtINR(run.totalGross) }),
                    jsx('td', { children: fmtINR(run.totalDeductions) }),
                    jsx('td', { children: jsx('b', { children: fmtINR(run.totalNet) }) }),
                    jsx('td', {
                      className: 'hr-actions-cell',
                      children: jsxs('div', {
                        className: 'hr-row-actions',
                        children: [
                          jsx(ActionButton, {
                            icon: 'eye',
                            label: 'View payroll run',
                            variant: 'view',
                            onClick: () => openRun(run._id)
                          }),
                          run.status === 'Draft'
                            ? jsx(ActionButton, {
                                icon: 'check',
                                label: 'Finalize payroll run',
                                variant: 'approve',
                                onClick: (ev) => advanceRun(run, 'finalize', ev.currentTarget)
                              })
                            : null,
                          run.status === 'Finalized'
                            ? jsx(ActionButton, {
                                icon: 'card',
                                label: 'Mark payroll as paid',
                                variant: 'collect',
                                onClick: (ev) => advanceRun(run, 'pay', ev.currentTarget)
                              })
                            : null,
                          jsx(ActionButton, {
                            icon: 'trash',
                            label: 'Delete payroll run',
                            variant: 'delete',
                            danger: true,
                            onClick: (ev) => handleDelete(run, ev.currentTarget)
                          })
                        ]
                      })
                    })
                  ]
                })
            })
      }),
      selected
        ? jsx(Card, {
            title: `Payslips · ${detail ? detail.period : ''}`,
            sub: detailLoading ? 'Loading payslips…' : `${payslips.length} payslip${payslips.length === 1 ? '' : 's'}`,
            flush: true,
            children: detailLoading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading…', text: 'Fetching payslips.' })
              : jsx(HrTable, {
                  head: ['Payslip no', 'Employee', 'Role', 'Gross', 'Earnings', 'Deductions', 'Net', 'Actions'],
                  rows: payslips,
                  emptyIcon: 'receipt',
                  emptyTitle: 'No payslips',
                  emptyText: 'This run has no employee payslips.',
                  renderRow: (slip) =>
                    jsx('tr', {
                      'data-row': '',
                      key: slip.payslipNo || slip.staffRef,
                      children: [
                        jsx('td', { children: asText(slip.payslipNo) }),
                        jsx('td', { children: asText(slip.staffName) }),
                        jsx('td', { children: asText(slip.designation) }),
                        jsx('td', { children: fmtINR(slip.grossPay) }),
                        jsx('td', { children: fmtINR(slip.totalEarnings) }),
                        jsx('td', { children: fmtINR(slip.totalDeductions) }),
                        jsx('td', { children: jsx('b', { children: fmtINR(slip.netPayout) }) }),
                        jsx('td', {
                          className: 'hr-actions-cell',
                          children: jsx(ActionButton, {
                            icon: 'printer',
                            label: 'View & Print Payslip',
                            variant: 'print',
                            onClick: () => openPayslip(slip)
                          })
                        })
                      ]
                    })
                })
          })
        : null
    ]
  });
}

/* ------------------------------------------------------------------ *
 * Offer Letter Components & Full Flow
 * ------------------------------------------------------------------ */

function OfferLetterDoc({ offer, template, accentColor }) {
  const o = offer || {};
  const tpl = template || {};
  const savedColors = typeof readOlColors === "function" ? readOlColors() : {};
  const inferredCode = tpl.code || (
    /executive/i.test(o.templateName || tpl.name || "") ? "OLT-EXEC"
      : /tech|engineer/i.test(o.templateName || tpl.name || "") ? "OLT-TECH"
      : "OLT-CORP"
  );
  const color = accentColor
    || savedColors[tpl._id]
    || savedColors[inferredCode]
    || (inferredCode === "OLT-EXEC" ? "#1e293b" : inferredCode === "OLT-TECH" ? "#0891b2" : "#4d33b6");

  const basicPct = tpl?.salaryStructure?.basicPercent ?? 50;
  const hraPct = tpl?.salaryStructure?.hraPercent ?? 20;
  const splPct = tpl?.salaryStructure?.specialAllowancePercent ?? 30;

  const salary = o.salaryBreakdown || {};
  const annualCtc = Number(o.ctc || 0) || (salary.monthlyGross ? salary.monthlyGross * 12 : 960000);
  const monthlyGross = salary.monthlyGross || Math.round(annualCtc / 12);
  const basic = salary.basic || Math.round((monthlyGross * basicPct) / 100);
  const hra = salary.hra || Math.round((monthlyGross * hraPct) / 100);
  const special = salary.specialAllowance || Math.max(0, monthlyGross - basic - hra);
  const actualBasicPct = monthlyGross > 0 ? Math.round((basic / monthlyGross) * 100) : basicPct;
  const actualHraPct = monthlyGross > 0 ? Math.round((hra / monthlyGross) * 100) : hraPct;
  const actualSplPct = Math.max(0, 100 - actualBasicPct - actualHraPct);

  const termsList = Array.isArray(o.terms) && o.terms.length
    ? o.terms
    : (Array.isArray(tpl.terms) && tpl.terms.length ? tpl.terms : [
        "Probation: You will be subject to a three (3) month probation period from your official start date.",
        "Notice Period: 15 calendar days during probation; 30 calendar days post confirmation.",
        "Working Hours: 09:30 to 18:30 IST, Monday to Friday.",
        "Confidentiality & IP: Proprietary designs, formulations, and business records remain strictly confidential."
      ]);

  const cleanDate = (val, fallback) => {
    if (!val) return fallback;
    const raw = String(val).includes("T") ? String(val).split("T")[0] : String(val);
    return typeof fmtDate === "function" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? fmtDate(raw) : raw;
  };

  const cand = {
    name: o.candidateName || "Aditya Singhania",
    role: o.position || "Senior Ceramic Designer",
    department: o.department || "Design",
    email: o.candidateEmail || "aditya.singhania@example.com",
    phone: o.candidatePhone || "+91 98210 55432",
    address: o.candidateAddress || "Flat 402, Sea Green Apts, Worli, Mumbai 400018",
    branch: o.branch || "Bandra Branch (Mumbai)",
    joiningDate: cleanDate(o.joiningDate, "01 Dec 2026"),
    expiryDate: cleanDate(o.expiryDate, "25 Nov 2026"),
    offerNumber: o.offerNumber || "OL-2026-0001",
    issueDate: cleanDate(o.issueDate, "15 Nov 2026")
  };

  let body = o.bodyText || (
    "We are pleased to extend an offer of employment for the position of " + cand.role +
    " within the " + cand.department + " Department at Aedentek CRM · Calder & Moss Surfaces (" + cand.branch + ").\n\n" +
    "Your scheduled commencement date is " + cand.joiningDate + ". You will receive a total Cost to Company (CTC) of " +
    fmtINR(annualCtc) + " per annum, structured into standard statutory components and allowances as outlined in Annexure A.\n\n" +
    "Please review the terms of appointment below and signify your acceptance by signing and returning a copy of this letter on or before " + cand.expiryDate + "."
  );
  if (!body.trim().startsWith("Dear")) {
    body = "Dear " + cand.name + ",\n\n" + body;
  }

  const headVariant = inferredCode === "OLT-EXEC"
    ? "ol-doc__head ol-doc__head--exec"
    : inferredCode === "OLT-TECH"
    ? "ol-doc__head ol-doc__head--tech"
    : "ol-doc__head";

  const letterBadge = inferredCode === "OLT-EXEC"
    ? "Executive Appointment"
    : inferredCode === "OLT-TECH"
    ? "Engineering & Technical Offer"
    : "Offer & Appointment Letter";

  const letterHeading = tpl.headerTitle || (
    inferredCode === "OLT-EXEC"
      ? "Executive Employment & Appointment Letter"
      : inferredCode === "OLT-TECH"
      ? "Technical Offer of Employment"
      : "Offer of Employment & Appointment Letter"
  );

  const divisionLine = inferredCode === "OLT-EXEC"
    ? "Calder & Moss Surfaces · Office of the Managing Director"
    : inferredCode === "OLT-TECH"
    ? "Calder & Moss Surfaces · Engineering & People Operations"
    : "Calder & Moss Surfaces · Human Resources";

  const renderClause = (text, idx) => {
    const str = String(text || "");
    const colonIdx = str.indexOf(":");
    if (colonIdx > 0 && colonIdx < 36) {
      return jsxs("li", {
        key: idx,
        children: [
          jsx("strong", { style: { color: "#0f172a" }, children: str.slice(0, colonIdx + 1) }),
          str.slice(colonIdx + 1)
        ]
      });
    }
    return jsx("li", { key: idx, children: str });
  };

  return jsxs("article", {
    className: "spec-sheet ol-paper",
    "data-spec-sheet": "offer-letter",
    "data-template": inferredCode.toLowerCase(),
    style: { "--ol-accent": color },
    children: [
      // 1. Formal Corporate Letterhead (no invoice polygon banner or YOUR LOGO box)
      inferredCode !== "OLT-EXEC" ? jsx("div", { className: "ol-doc__topbar" }) : null,
      jsxs("header", {
        className: headVariant,
        children: [
          jsxs("div", {
            className: "ol-doc__brand",
            children: [
              jsx("div", { className: "ol-doc__monogram", "aria-hidden": "true", children: "A" }),
              jsxs("div", {
                children: [
                  jsx("div", { className: "ol-doc__company", children: "Aedentek CRM · Calder & Moss Surfaces" }),
                  jsx("div", { className: "ol-doc__division", children: divisionLine }),
                  jsx("div", { className: "ol-doc__office", children: `${cand.branch} · hr@aedentek.com` })
                ]
              })
            ]
          }),
          jsxs("div", {
            className: "ol-doc__meta",
            children: [
              jsx("div", { className: "ol-doc__tag", children: letterBadge }),
              jsxs("div", { children: ["Ref No: ", jsx("strong", { style: { color: "#0f172a" }, children: cand.offerNumber })] }),
              jsxs("div", { children: ["Date: ", jsx("strong", { style: { color: "#0f172a" }, children: cand.issueDate })] })
            ]
          })
        ]
      }),

      // 2. Document Title & Confidentiality Classification
      jsxs("div", {
        className: "ol-doc__title-band",
        children: [
          jsx("h2", { className: "ol-doc__title", children: letterHeading }),
          jsx("span", { className: "ol-doc__confidential", children: "Private & Confidential" })
        ]
      }),

      // 3. Formal Recipient Address Block (Business Letter Style)
      jsxs("div", {
        className: "ol-doc__recipient-row",
        children: [
          jsxs("div", {
            className: "ol-doc__to",
            children: [
              jsx("div", { className: "ol-doc__to-label", children: "To" }),
              jsx("div", { className: "ol-doc__to-name", children: cand.name }),
              cand.address ? jsx("div", { children: cand.address }) : null,
              jsxs("div", {
                style: { color: "#64748b", marginTop: "2px" },
                children: [cand.email, cand.phone ? " · " + cand.phone : ""]
              })
            ]
          }),
          jsxs("div", {
            className: "ol-doc__validity",
            children: [
              jsxs("div", { children: ["Joining Date: ", jsx("strong", { style: { color: "#0f172a" }, children: cand.joiningDate })] }),
              jsxs("div", { children: ["Offer Valid Until: ", jsx("strong", { style: { color: "#0f172a" }, children: cand.expiryDate })] })
            ]
          })
        ]
      }),

      // 4. Compact Appointment Summary Strip (HR-specific, replaces Invoice Bill-To/Issued-By cards)
      jsxs("div", {
        className: "ol-doc__summary",
        children: [
          jsxs("div", {
            className: "ol-doc__summary-item",
            children: [jsx("span", { children: "Designation" }), jsx("strong", { children: cand.role })]
          }),
          jsxs("div", {
            className: "ol-doc__summary-item",
            children: [jsx("span", { children: "Department & Location" }), jsx("strong", { children: `${cand.department} · ${cand.branch}` })]
          }),
          jsxs("div", {
            className: "ol-doc__summary-item",
            children: [jsx("span", { children: "Commencement Date" }), jsx("strong", { children: cand.joiningDate })]
          }),
          jsxs("div", {
            className: "ol-doc__summary-item ol-doc__summary-item--ctc",
            children: [jsx("span", { children: "Annual CTC" }), jsx("strong", { children: fmtINR(annualCtc) })]
          })
        ]
      }),

      // 5. Subject & Offer Narrative
      jsxs("div", {
        className: "ol-doc__letter",
        children: [
          jsx("p", {
            className: "ol-doc__subject",
            children: "Subject: " + (o.subject || ("Offer of Employment — " + cand.role + " at Aedentek CRM"))
          }),
          jsx("p", {
            className: "ol-doc__body",
            children: body
          })
        ]
      }),

      // 6. Annexure A — Compensation Structure (Integrated CTC Footer Row, no Invoice Subtotal Card)
      jsxs("section", {
        className: "ol-doc__section",
        children: [
          jsx("h3", { className: "ol-doc__section-title", children: "Annexure A — Compensation Structure (CTC Breakdown)" }),
          jsx("div", {
            className: "ol-doc__table-card",
            children: jsxs("table", {
              className: "ol-doc__table",
              "data-spec-items": "true",
              children: [
                jsx("thead", {
                  children: jsxs("tr", {
                    children: [
                      jsx("th", { style: { textAlign: "left" }, children: "Compensation Component" }),
                      jsx("th", { className: "ol-center", style: { width: "16%" }, children: "Allocation" }),
                      jsx("th", { className: "ol-num", style: { width: "22%" }, children: "Monthly (₹)" }),
                      jsx("th", { className: "ol-num", style: { width: "22%" }, children: "Annual (₹)" })
                    ]
                  })
                }),
                jsxs("tbody", {
                  children: [
                    jsxs("tr", {
                      children: [
                        jsx("td", { style: { fontWeight: "600" }, children: "Basic Salary" }),
                        jsx("td", { className: "ol-center", children: actualBasicPct + "%" }),
                        jsx("td", { className: "ol-num", children: fmtINR(basic) }),
                        jsx("td", { className: "ol-num", children: fmtINR(basic * 12) })
                      ]
                    }),
                    jsxs("tr", {
                      children: [
                        jsx("td", { style: { fontWeight: "600" }, children: "House Rent Allowance (HRA)" }),
                        jsx("td", { className: "ol-center", children: actualHraPct + "%" }),
                        jsx("td", { className: "ol-num", children: fmtINR(hra) }),
                        jsx("td", { className: "ol-num", children: fmtINR(hra * 12) })
                      ]
                    }),
                    jsxs("tr", {
                      children: [
                        jsx("td", { style: { fontWeight: "600" }, children: "Special & Statutory Allowances" }),
                        jsx("td", { className: "ol-center", children: actualSplPct + "%" }),
                        jsx("td", { className: "ol-num", children: fmtINR(special) }),
                        jsx("td", { className: "ol-num", children: fmtINR(special * 12) })
                      ]
                    })
                  ]
                }),
                jsx("tfoot", {
                  children: jsxs("tr", {
                    children: [
                      jsx("td", { children: "Total Cost to Company (CTC)" }),
                      jsx("td", { className: "ol-center", children: "100%" }),
                      jsx("td", { className: "ol-num", children: fmtINR(monthlyGross) }),
                      jsx("td", { className: "ol-num ol-doc__ctc-val", children: fmtINR(annualCtc) })
                    ]
                  })
                })
              ]
            })
          })
        ]
      }),

      // 7. Key Employment Terms & Conditions
      jsxs("section", {
        className: "ol-doc__section",
        children: [
          jsx("h3", { className: "ol-doc__section-title", children: "Key Employment Terms & Conditions" }),
          jsx("ol", {
            className: "ol-doc__terms",
            children: termsList.map(renderClause)
          })
        ]
      }),

      // 8. Formal Bilateral Signatures & Candidate Acceptance
      jsxs("div", {
        className: "ol-doc__signatures",
        children: [
          jsxs("div", {
            className: "ol-doc__sig-col",
            children: [
              jsx("div", { className: "ol-doc__sig-head", children: "For Aedentek CRM · Calder & Moss Surfaces" }),
              jsx("div", { className: "ol-doc__sig-note", children: "Authorized Signatory — Human Resources" }),
              jsx("div", { className: "ol-doc__sig-rule" }),
              jsx("div", { className: "ol-doc__sig-name", children: o.signatoryName || tpl.signatoryName || "Ines Okafor" }),
              jsx("div", { className: "ol-doc__sig-role", children: o.signatoryDesignation || tpl.signatoryDesignation || "Head of Specification & Human Resources" })
            ]
          }),
          jsxs("div", {
            className: "ol-doc__sig-col ol-doc__sig-col--right",
            children: [
              jsx("div", { className: "ol-doc__sig-head", children: "Candidate Acceptance & Acknowledgment" }),
              jsx("div", { className: "ol-doc__sig-note", children: "I have read and accept the offer of employment on the terms stated above." }),
              jsx("div", { className: "ol-doc__sig-rule" }),
              jsx("div", { className: "ol-doc__sig-name", children: cand.name }),
              jsx("div", { className: "ol-doc__sig-date", children: "Signature & Date (Due by " + cand.expiryDate + ")" })
            ]
          })
        ]
      }),

      // 9. Clean HR Document Footer (no GSTIN / Tax Invoice metadata)
      jsxs("footer", {
        className: "ol-doc__footer",
        children: [
          jsx("span", { children: "Private & Confidential · Human Resources · Aedentek CRM — Calder & Moss Surfaces · hr@aedentek.com" }),
          jsxs("span", { children: ["Ref: ", jsx("b", { children: cand.offerNumber })] })
        ]
      })
    ]
  });
}

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const s = String(d).includes("T") ? d.split("T")[0] : String(d);
    const parts = s.split("-");
    if (parts.length === 3) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const yr = parts[0];
      const mo = months[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parts[2];
      return `${day} ${mo} ${yr}`;
    }
    return s;
  } catch {
    return String(d);
  }
};

const getInitials = (name) => {
  if (!name) return "OL";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function OfferLettersPage() {
  const branchList = useBranches();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [branch, setBranch] = useState("All Branches");
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [kpis, setKpis] = useState({ totalOffers: 0, sentCount: 0, acceptedCount: 0, totalCtcCommitted: 0 });
  const [tick, setTick] = useState(0);

  const reload = () => setTick((n) => n + 1);

  // Fetch offer letters
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== "All") params.set("status", status);
    if (branch !== "All Branches") params.set("branch", branch);

    apiFetch("/api/hr/offer-letters?" + params.toString()).then((res) => {
      if (!alive) return;
      if (res.ok && res.data && res.data.success) {
        setOffers(Array.isArray(res.data.data) ? res.data.data : []);
        setKpis(res.data.kpis || { totalOffers: 0, sentCount: 0, acceptedCount: 0, totalCtcCommitted: 0 });
      } else {
        setOffers([]);
      }
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [query, status, branch, tick]);

  // Fetch templates for form dropdown
  useEffect(() => {
    apiFetch("/api/hr/offer-letter-templates").then((res) => {
      if (res.ok && res.data && res.data.success && Array.isArray(res.data.data)) {
        setTemplates(res.data.data);
      }
    });
  }, []);

  const openPreview = (offer) => {
    const stBadge = offer.status === "Accepted"
      ? "paid"
      : offer.status === "Declined"
      ? "overdue"
      : offer.status === "Sent"
      ? "sent"
      : "draft";

    const matchedTpl = (templates || []).find(
      (t) => (offer.templateRef && String(t._id) === String(offer.templateRef)) || (offer.templateName && t.name === offer.templateName)
    ) || null;

    openDrawer(
      jsxs(ModalDrawer, {
        title: offer.offerNumber || "OL-2026-0001",
        sub: `${offer.candidateName} — ${offer.position} (${offer.branch})`,
        tools: jsx("span", {
          className: `fi-badge-pill ${stBadge}`,
          children: offer.status || "Draft"
        }),
        foot: jsxs(Fragment, {
          children: [
            jsxs("button", {
              className: "btn btn--ghost ol-print-btn",
              type: "button",
              onClick: () => {
                document.body.classList.add("hr-printing");
                window.print();
                document.body.classList.remove("hr-printing");
              },
              children: [jsx(Icon, { name: "download" }), "Print / Save PDF"]
            }),
            jsx("button", {
              className: "btn btn--primary",
              type: "button",
              onClick: () => openDrawer(null),
              children: "Close"
            })
          ]
        }),
        children: [
          jsx("div", {
            id: "printable-offer-letter-doc",
            className: "hr-print-area",
            "data-wide-drawer": "true",
            style: { overflowX: "auto", padding: "10px 0" },
            children: jsx(OfferLetterDoc, { offer, template: matchedTpl })
          })
        ]
      })
    );
  };

  const openDrawerForm = (existing = null) => {
    const isEdit = Boolean(existing && existing._id);
    let state = {
      templateId: existing?.templateRef || (templates && templates[0] ? templates[0]._id : ""),
      candidateName: existing?.candidateName || "",
      candidateEmail: existing?.candidateEmail || "",
      candidatePhone: existing?.candidatePhone || "",
      candidateAddress: existing?.candidateAddress || "",
      position: existing?.position || "",
      department: existing?.department || "Operations",
      branch: existing?.branch || (branchList && branchList[0] ? branchList[0] : "Bandra Branch (Mumbai)"),
      joiningDate: existing?.joiningDate ? existing.joiningDate.split("T")[0] : new Date(Date.now() + 14 * 864e5).toISOString().split("T")[0],
      expiryDate: existing?.expiryDate ? existing.expiryDate.split("T")[0] : new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0],
      ctc: existing?.ctc !== undefined ? String(existing.ctc) : "720000",
      status: existing?.status || "Draft",
      notes: existing?.notes || ""
    };

    const update = (k, v) => {
      state[k] = v;
      renderDrawer();
    };

    const submit = async () => {
      if (!state.candidateName || !state.position || !state.ctc) {
        toast("Candidate Name, Position and CTC are required", { icon: "x" });
        return;
      }

      const payload = {
        templateId: state.templateId,
        candidateName: state.candidateName,
        candidateEmail: state.candidateEmail,
        candidatePhone: state.candidatePhone,
        candidateAddress: state.candidateAddress,
        position: state.position,
        department: state.department,
        branch: state.branch,
        joiningDate: state.joiningDate,
        expiryDate: state.expiryDate,
        ctc: Number(state.ctc),
        status: state.status,
        notes: state.notes
      };

      const url = isEdit ? "/api/hr/offer-letters/" + existing._id : "/api/hr/offer-letters";
      const method = isEdit ? "PUT" : "POST";

      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      if (res.ok && res.data && res.data.success) {
        toast(res.data.message || (isEdit ? "Offer letter updated" : "Offer letter created"), { icon: "check" });
        closeDrawer();
        reload();
      } else {
        toast((res.data && res.data.message) || res.error || "Failed to save offer letter", { icon: "x" });
      }
    };

    const renderDrawer = () => {
      const ctcNum = Number(state.ctc) || 0;
      const mGross = Math.round(ctcNum / 12);
      const selTpl = templates.find((t) => t._id === state.templateId) || templates[0];
      const basicPct = selTpl?.salaryStructure?.basicPercent ?? 50;
      const hraPct = selTpl?.salaryStructure?.hraPercent ?? 20;
      const basic = Math.round((mGross * basicPct) / 100);
      const hra = Math.round((mGross * hraPct) / 100);
      const special = mGross - basic - hra;

      openDrawer(
        jsxs(ModalDrawer, {
          title: isEdit ? "Edit Offer Letter · " + existing.offerNumber : "Generate Offer Letter",
          sub: "Fill candidate details, position and annual CTC to generate an appointment letter.",
          foot: jsxs(Fragment, {
            children: [
              jsx("button", { type: "button", className: "btn btn--ghost", onClick: closeDrawer, children: "Cancel" }),
              jsx("button", {
                type: "button",
                className: "btn btn--primary",
                onClick: submit,
                children: [jsx(Icon, { name: isEdit ? "check" : "plus" }), isEdit ? "Save Changes" : "Create Offer Letter"]
              })
            ]
          }),
          children: jsxs("div", {
            className: "form-grid",
            children: [
              // Template Selector
              jsx(
                HrField,
                { label: "Offer Letter Template", required: true },
                jsx(
                  "select",
                  {
                    className: "select",
                    value: state.templateId,
                    onChange: (e) => update("templateId", e.target.value)
                  },
                  templates.map((t) =>
                    jsx("option", { value: t._id, key: t._id, children: t.name + (t.isDefault ? " (Default)" : "") })
                  )
                )
              ),
              // Candidate Name
              jsx(
                HrField,
                { label: "Candidate Full Name", required: true },
                jsx("input", {
                  className: "input",
                  placeholder: "e.g. Aditya Singhania",
                  value: state.candidateName,
                  onChange: (e) => update("candidateName", e.target.value)
                })
              ),
              // Email
              jsx(
                HrField,
                { label: "Candidate Email", required: true },
                jsx("input", {
                  className: "input",
                  type: "email",
                  placeholder: "aditya@example.com",
                  value: state.candidateEmail,
                  onChange: (e) => update("candidateEmail", e.target.value)
                })
              ),
              // Phone
              jsx(
                HrField,
                { label: "Contact Phone Number" },
                jsx("input", {
                  className: "input",
                  placeholder: "+91 98210 55432",
                  value: state.candidatePhone,
                  onChange: (e) => update("candidatePhone", e.target.value)
                })
              ),
              // Position / Designation
              jsx(
                HrField,
                { label: "Position / Designation", required: true },
                jsx("input", {
                  className: "input",
                  placeholder: "e.g. Senior Project Architect",
                  value: state.position,
                  onChange: (e) => update("position", e.target.value)
                })
              ),
              // Department
              jsx(
                HrField,
                { label: "Department", required: true },
                jsx(
                  "select",
                  {
                    className: "select",
                    value: state.department,
                    onChange: (e) => update("department", e.target.value)
                  },
                  ["Operations", "Design", "Sales", "Finance", "Engineering", "Human Resources"].map((d) =>
                    jsx("option", { value: d, key: d, children: d })
                  )
                )
              ),
              // Branch
              jsx(
                HrField,
                { label: "Branch Location", required: true },
                jsx(
                  "select",
                  {
                    className: "select",
                    value: state.branch,
                    onChange: (e) => update("branch", e.target.value)
                  },
                  [...(branchList || [])].map((b) =>
                    jsx("option", { value: b, key: b, children: b })
                  )
                )
              ),
              // Joining Date
              jsx(
                HrField,
                { label: "Anticipated Joining Date", required: true },
                jsx("input", {
                  className: "input",
                  type: "date",
                  value: state.joiningDate,
                  onChange: (e) => update("joiningDate", e.target.value)
                })
              ),
              // Expiry Date
              jsx(
                HrField,
                { label: "Offer Acceptance Deadline" },
                jsx("input", {
                  className: "input",
                  type: "date",
                  value: state.expiryDate,
                  onChange: (e) => update("expiryDate", e.target.value)
                })
              ),
              // Annual CTC
              jsx(
                HrField,
                { label: "Annual Cost to Company (CTC in ₹)", required: true },
                jsx("input", {
                  className: "input",
                  type: "number",
                  placeholder: "720000",
                  value: state.ctc,
                  onChange: (e) => update("ctc", e.target.value)
                })
              ),
              // Status
              jsx(
                HrField,
                { label: "Offer Status" },
                jsx(
                  "select",
                  {
                    className: "select",
                    value: state.status,
                    onChange: (e) => update("status", e.target.value)
                  },
                  ["Draft", "Sent", "Accepted", "Declined"].map((s) =>
                    jsx("option", { value: s, key: s, children: s })
                  )
                )
              ),
              // Live CTC preview banner
              jsxs("div", {
                className: "sd-stat-banner",
                style: { gridColumn: "1 / -1" },
                children: [
                  jsxs("div", {
                    className: "sd-stat-block",
                    children: [
                      jsx("span", { className: "kpi__label", children: "Monthly Gross Package" }),
                      jsx("b", { style: { fontSize: "18px", color: "var(--primary)" }, children: fmtINR(mGross) }),
                      jsx("small", { style: { color: "var(--muted)" }, children: "Basic: " + fmtINR(basic) + " · HRA: " + fmtINR(hra) + " · Special: " + fmtINR(special) })
                    ]
                  }),
                  jsxs("div", {
                    className: "sd-stat-block sd-stat-block--right",
                    children: [
                      jsx("span", { className: "kpi__label", children: "Annual CTC" }),
                      jsx("b", { style: { fontSize: "18px" }, children: fmtINR(ctcNum) })
                    ]
                  })
                ]
              }),
              // Address
              jsx(
                HrField,
                { label: "Candidate Residential Address", className: "field--full" },
                jsx("textarea", {
                  className: "input",
                  rows: 2,
                  placeholder: "Enter candidate address...",
                  value: state.candidateAddress,
                  onChange: (e) => update("candidateAddress", e.target.value)
                })
              ),
              // Notes
              jsx(
                HrField,
                { label: "Internal Notes", className: "field--full" },
                jsx("textarea", {
                  className: "input",
                  rows: 2,
                  placeholder: "Confidential recruitment notes...",
                  value: state.notes,
                  onChange: (e) => update("notes", e.target.value)
                })
              )
            ]
          })
        })
      );
    };

    renderDrawer();
  };

  const removeOffer = async (offer, anchor) => {
    const ok = await confirmModal(
      {
        title: "Delete offer " + offer.offerNumber + "?",
        text: "Candidate: " + offer.candidateName + " (" + offer.position + "). This action cannot be undone.",
        ok: "Delete offer",
        danger: true
      },
      anchor
    );
    if (!ok) return;

    const res = await apiFetch("/api/hr/offer-letters/" + offer._id, { method: "DELETE" });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || "Offer letter removed", { icon: "trash" });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || "Failed to delete offer letter", { icon: "x" });
    }
  };

  return jsxs("div", {
    className: "hr-stack",
    children: [
      // KPI Row
      jsx(KpiRow, {
        items: [
          { label: "Total Offers", value: kpis.totalOffers || 0, tone: "slate", icon: "receipt" },
          { label: "Sent / In Review", value: kpis.sentCount || 0, tone: "sky", icon: "calendar" },
          { label: "Accepted", value: kpis.acceptedCount || 0, tone: "good", icon: "check" },
          { label: "CTC Committed", value: fmtINR(kpis.totalCtcCommitted || 0), tone: "cobalt", icon: "finance" }
        ]
      }),
      // Register Card
      jsx(Card, {
        title: "Employment Offer Letters",
        sub: "Issue, track and print formal candidate offer letters with structured salary schedules.",
        children: jsxs("div", {
          children: [
            // Toolbar
            jsxs("div", {
              className: "ol-toolbar",
              children: [
                jsxs("div", {
                  className: "ol-toolbar__left",
                  children: [
                    jsx(SearchInput, {
                      value: query,
                      placeholder: "Search candidate, position or offer #...",
                      onChange: setQuery
                    }),
                    jsxs("div", {
                      className: "ol-status-tabs",
                      children: ["All", "Draft", "Sent", "Accepted", "Declined"].map((s) =>
                        jsx("button", {
                          type: "button",
                          className: "ol-status-tab" + (status === s ? " is-active" : ""),
                          onClick: () => setStatus(s),
                          key: s,
                          children: s
                        })
                      )
                    }),
                    jsx(
                      "select",
                      {
                        className: "select",
                        style: { width: "auto", minWidth: "150px" },
                        value: branch,
                        onChange: (e) => setBranch(e.target.value)
                      },
                      ["All Branches", ...(branchList || [])].map((b) =>
                        jsx("option", { value: b, key: b, children: b })
                      )
                    )
                  ]
                }),
                jsx("button", {
                  type: "button",
                  className: "btn btn--primary",
                  onClick: () => openDrawerForm(),
                  children: [jsx(Icon, { name: "plus" }), "New Offer Letter"]
                })
              ]
            }),
            // Table
            jsx(HrTable, {
              head: [],
              headNode: jsx("tr", {
                children: [
                  jsx("th", { key: "sno", style: { width: 44, minWidth: 44, maxWidth: 44, textAlign: "center", paddingLeft: 4, paddingRight: 4 }, children: "S No" }),
                  jsx("th", { key: "offerNo", style: { width: 120, minWidth: 120, textAlign: "center" }, children: "Offer No" }),
                  jsx("th", { key: "candidate", className: "ol-candidate-head", style: { minWidth: 180, textAlign: "left", paddingLeft: "14px" }, children: "Candidate" }),
                  jsx("th", { key: "position", style: { minWidth: 145, textAlign: "center" }, children: "Position & Dept" }),
                  jsx("th", { key: "branch", style: { width: 100, textAlign: "center" }, children: "Branch" }),
                  jsx("th", { key: "joiningDate", style: { width: 110, textAlign: "center" }, children: "Joining Date" }),
                  jsx("th", { key: "ctc", style: { width: 115, textAlign: "center" }, children: "Annual CTC" }),
                  jsx("th", { key: "status", style: { width: 100, textAlign: "center" }, children: "Status" }),
                  jsx("th", { key: "actions", style: { width: 115, textAlign: "center" }, children: "Actions" })
                ]
              }),
              rows: offers,
              emptyIcon: "receipt",
              emptyTitle: "No offer letters found",
              emptyText: "Generate your first candidate offer letter using the button above.",
              renderRow: (offer, i) => {
                const mGross = offer.salaryBreakdown?.monthlyGross || Math.round((offer.ctc || 0) / 12);
                return jsx("tr", {
                  "data-row": "",
                  className: "is-click",
                  key: offer._id,
                  style: { cursor: "pointer" },
                  onClick: (e) => {
                    if (e.target.closest("button, a, input, select")) return;
                    openPreview(offer);
                  },
                  children: [
                    jsx("td", {
                      style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: "center", paddingLeft: 8, paddingRight: 8, verticalAlign: "middle" },
                      children: jsx("span", {
                        className: `sno-pill ${i < 3 ? "sno-pill--top" : "sno-pill--normal"}`,
                        children: (i ?? 0) + 1
                      })
                    }),
                    jsx("td", {
                      style: { textAlign: "center" },
                      children: jsx("span", { className: "ol-offer-no-pill", children: offer.offerNumber })
                    }),
                    jsx("td", {
                      className: "ol-candidate-cell",
                      style: { textAlign: "left", paddingLeft: "20px" },
                      children: jsxs("div", {
                        style: { display: "flex", alignItems: "center", gap: "10px", textAlign: "left" },
                        children: [
                          jsx("div", {
                            className: "ol-avatar",
                            children: getInitials(offer.candidateName)
                          }),
                          jsxs("div", {
                            style: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
                            children: [
                              jsx("b", { style: { fontSize: "13.5px", color: "var(--text)", fontWeight: "700" }, children: offer.candidateName }),
                              jsx("span", { style: { fontSize: "12px", color: "var(--muted)" }, children: offer.candidateEmail })
                            ]
                          })
                        ]
                      })
                    }),
                    jsx("td", {
                      style: { textAlign: "center" },
                      children: jsxs("div", {
                        style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
                        children: [
                          jsx("b", { style: { fontSize: "13px", fontWeight: "600", color: "var(--text)" }, children: offer.position }),
                          jsx("span", { className: "ol-dept-pill", children: offer.department })
                        ]
                      })
                    }),
                    jsx("td", {
                      style: { textAlign: "center" },
                      children: jsxs("span", {
                        className: "branch-pill",
                        children: [
                          jsx(Icon, { name: "globe" }),
                          offer.branch
                        ]
                      })
                    }),
                    jsx("td", {
                      style: { textAlign: "center" },
                      children: jsxs("div", {
                        style: { display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: "600", color: "var(--text)" },
                        children: [
                          jsx(Icon, { name: "calendar" }),
                          fmtDate(offer.joiningDate)
                        ]
                      })
                    }),
                    jsx("td", {
                      style: { textAlign: "center" },
                      children: jsxs("div", {
                        style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
                        children: [
                          jsx("b", { style: { fontSize: "13.5px", fontWeight: "800", color: "var(--text)", fontFamily: "monospace" }, children: fmtINR(offer.ctc || 0) }),
                          jsx("span", { style: { fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }, children: fmtINR(mGross) + "/mo" })
                        ]
                      })
                    }),
                    jsx("td", {
                      style: { textAlign: "center" },
                      children: jsx(StatusPill, {
                        kind: offer.status === "Accepted" ? "good" : offer.status === "Declined" ? "bad" : offer.status === "Sent" ? "info" : "slate",
                        children: offer.status || "Draft"
                      })
                    }),
                    jsx("td", {
                      className: "hr-actions-cell",
                      style: { textAlign: "center" },
                      children: jsxs("div", {
                        className: "hr-row-actions",
                        style: { display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" },
                        children: [
                          jsx("button", {
                            type: "button",
                            className: "action-btn action-btn--view action-btn--print",
                            title: "View & Print Offer Letter",
                            "aria-label": "View & Print Offer Letter",
                            onClick: (e) => { e.stopPropagation(); openPreview(offer); },
                            children: jsx(Icon, { name: "receipt" })
                          }),
                          jsx("button", {
                            type: "button",
                            className: "action-btn action-btn--edit",
                            title: "Edit Offer Letter",
                            "aria-label": "Edit Offer Letter",
                            onClick: (e) => { e.stopPropagation(); openDrawerForm(offer); },
                            children: jsx(Icon, { name: "edit" })
                          }),
                          jsx("button", {
                            type: "button",
                            className: "action-btn action-btn--delete",
                            title: "Delete Offer Letter",
                            "aria-label": "Delete Offer Letter",
                            onClick: (e) => { e.stopPropagation(); removeOffer(offer, e.currentTarget); },
                            children: jsx(Icon, { name: "trash" })
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
  });
}

const SAMPLE_OFFER_CANDIDATES = [
  {
    name: "Aditya Singhania",
    role: "Senior Ceramic Designer",
    department: "Design",
    branch: "Bandra Branch (Mumbai)",
    email: "aditya.singhania@example.com",
    phone: "+91 98210 55432",
    address: "Flat 402, Sea Green Apts, Worli, Mumbai - 400018",
    joiningDate: "December 01, 2026",
    expiryDate: "November 25, 2026",
    ctc: 960000,
    offerNumber: "OL-2026-0001"
  },
  {
    name: "Meera Nambiar",
    role: "Lead Solution Architect",
    department: "Engineering",
    branch: "Andheri Branch (Mumbai)",
    email: "meera.nambiar@example.com",
    phone: "+91 98450 12345",
    address: "12th Cross, Indiranagar, Bengaluru - 560038",
    joiningDate: "December 15, 2026",
    expiryDate: "November 28, 2026",
    ctc: 1800000,
    offerNumber: "OL-2026-0002"
  },
  {
    name: "Kunal Deshmukh",
    role: "Accounts Executive",
    department: "Finance",
    branch: "Bandra Branch (Mumbai)",
    email: "kunal.deshmukh@example.com",
    phone: "+91 98700 98765",
    address: "A-203, Palm Grove, Thane West - 400602",
    joiningDate: "January 05, 2027",
    expiryDate: "December 10, 2026",
    ctc: 540000,
    offerNumber: "OL-2026-0003"
  }
];

const OL_COLOR_PRESETS = ["#4d33b6", "#2563eb", "#0891b2", "#059669", "#d97706", "#e5252a", "#db2777", "#0f172a"];

const readOlColors = () => {
  try {
    return JSON.parse(localStorage.getItem("tessly:offerLetterTemplateColors") || "{}") || {};
  } catch (e) {
    return {};
  }
};

const writeOlColor = (id, hex) => {
  try {
    const all = readOlColors();
    if (hex) all[id] = hex;
    else delete all[id];
    localStorage.setItem("tessly:offerLetterTemplateColors", JSON.stringify(all));
  } catch (e) {}
};

function renderOlSwatch(tpl, activeColor) {
  const code = tpl?.code || "";
  const label = code === "OLT-EXEC" ? "EXECUTIVE" : code === "OLT-TECH" ? "TECHNICAL" : "CORPORATE";
  return jsxs("svg", {
    viewBox: "0 0 794 130",
    width: "100%",
    height: "60",
    preserveAspectRatio: "none",
    "aria-hidden": "true",
    children: [
      jsx("rect", { x: 0, y: 0, width: 794, height: 130, fill: "#ffffff" }),
      jsx("rect", { x: 0, y: 0, width: 794, height: 6, fill: activeColor }),
      jsx("rect", { x: 36, y: 32, width: 36, height: 36, rx: 6, fill: activeColor }),
      jsx("text", { x: 54, y: 57, fill: "#ffffff", fontSize: 20, fontWeight: 900, textAnchor: "middle", fontFamily: "sans-serif", children: "A" }),
      jsx("rect", { x: 86, y: 36, width: 140, height: 12, rx: 2, fill: "#1e293b" }),
      jsx("rect", { x: 86, y: 54, width: 90, height: 8, rx: 2, fill: "#94a3b8" }),
      jsx("rect", { x: 620, y: 36, width: 138, height: 26, rx: 13, fill: "color-mix(in srgb, " + activeColor + " 12%, transparent)" }),
      jsx("text", { x: 689, y: 53, fill: activeColor, fontSize: 13, fontWeight: 800, textAnchor: "middle", letterSpacing: "0.08em", fontFamily: "sans-serif", children: label }),
      jsx("line", { x1: 36, y1: 96, x2: 758, y2: 96, stroke: "#e2e8f0", strokeWidth: 1.5 })
    ]
  });
}

function OfferLetterTemplatesStudioPage() {
  const { rows: templates, loading, reload } = useCollection("/api/hr/offer-letter-templates");
  const [selectedId, setSelectedId] = useState("");
  const [colors, setColors] = useState(() => readOlColors());
  const [sampleIdx, setSampleIdx] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (templates && templates.length && !selectedId) {
      const def = templates.find((t) => t.isDefault);
      setSelectedId((def && def._id) || templates[0]._id);
    }
  }, [templates, selectedId]);

  const activeTemplate = (templates && templates.find((t) => t._id === selectedId)) || (templates && templates[0]) || {
    name: "Classic Corporate",
    code: "OLT-CORP",
    description: "Flagship statutory layout: dark header with logo box & diagonal slashes, dual Candidate / Issuer cards, compensation breakdown, and bilateral execution signatures.",
    salaryStructure: { basicPercent: 50, hraPercent: 20, specialAllowancePercent: 30 }
  };

  const activeColor = colors[activeTemplate?._id] || colors[activeTemplate?.code] || (activeTemplate?.code === "OLT-EXEC" ? "#e5252a" : activeTemplate?.code === "OLT-TECH" ? "#0891b2" : "#4d33b6");
  const curSample = SAMPLE_OFFER_CANDIDATES[sampleIdx] || SAMPLE_OFFER_CANDIDATES[0];

  const handleColorChange = (hex) => {
    const next = { ...colors };
    const key = activeTemplate?._id || activeTemplate?.code || "custom";
    if (hex) next[key] = hex;
    else delete next[key];
    setColors(next);
    writeOlColor(key, hex);
  };

  const handleSetDefault = async () => {
    if (!activeTemplate?._id) return;
    const res = await apiFetch("/api/hr/offer-letter-templates/" + activeTemplate._id + "/default", { method: "PUT" });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || "Template set as default", { icon: "check" });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1800);
      reload();
    }
  };

  const openTemplateDrawer = (existing = null) => {
    const isEdit = Boolean(existing && existing._id);
    let state = {
      name: existing?.name || "",
      code: existing?.code || "",
      description: existing?.description || "",
      headerTitle: existing?.headerTitle || "EMPLOYMENT OFFER & APPOINTMENT LETTER",
      subject: existing?.subject || "Offer of Employment: {position} at {companyName}",
      basicPercent: existing?.salaryStructure?.basicPercent !== undefined ? String(existing.salaryStructure.basicPercent) : "50",
      hraPercent: existing?.salaryStructure?.hraPercent !== undefined ? String(existing.salaryStructure.hraPercent) : "20",
      specialAllowancePercent: existing?.salaryStructure?.specialAllowancePercent !== undefined ? String(existing.salaryStructure.specialAllowancePercent) : "30",
      bodyTemplate: existing?.bodyTemplate || "Dear {candidateName},\n\nWe are pleased to offer you the position of {position} in {department} at {companyName} ({branch} branch).\n\nYour joining date is {joiningDate} with an annual CTC of {ctc}.",
      termsText: Array.isArray(existing?.terms) ? existing.terms.join("\n") : "Probation: 3 months from joining date.\nNotice Period: 30 days post-confirmation.\nWorking Hours: 09:30 to 18:30 IST, Monday to Friday.",
      isDefault: existing ? Boolean(existing.isDefault) : false,
      signatoryName: existing?.signatoryName || "Ines Okafor",
      signatoryDesignation: existing?.signatoryDesignation || "Head of Specification & Human Resources"
    };

    const update = (k, v) => {
      state[k] = v;
      render();
    };

    const submit = async () => {
      if (!state.name || !state.code) {
        toast("Template Name and Code are required", { icon: "x" });
        return;
      }

      const terms = state.termsText.split("\n").map((t) => t.trim()).filter(Boolean);
      const payload = {
        name: state.name,
        code: state.code.toUpperCase(),
        description: state.description,
        headerTitle: state.headerTitle,
        subject: state.subject,
        bodyTemplate: state.bodyTemplate,
        terms,
        salaryStructure: {
          basicPercent: Number(state.basicPercent) || 50,
          hraPercent: Number(state.hraPercent) || 20,
          specialAllowancePercent: Number(state.specialAllowancePercent) || 30
        },
        isDefault: state.isDefault,
        signatoryName: state.signatoryName,
        signatoryDesignation: state.signatoryDesignation
      };

      const url = isEdit ? "/api/hr/offer-letter-templates/" + existing._id : "/api/hr/offer-letter-templates";
      const method = isEdit ? "PUT" : "POST";

      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      if (res.ok && res.data && res.data.success) {
        toast(res.data.message || (isEdit ? "Template updated" : "Template created"), { icon: "check" });
        closeDrawer();
        reload();
      } else {
        toast((res.data && res.data.message) || res.error || "Failed to save template", { icon: "x" });
      }
    };

    const render = () => {
      openDrawer(
        jsxs(ModalDrawer, {
          title: isEdit ? "Edit Template · " + existing.name : "New Offer Letter Template",
          sub: "Define default contract clauses, dynamic replacement tokens and salary allocation percentages.",
          foot: jsxs(Fragment, {
            children: [
              jsx("button", { type: "button", className: "btn btn--ghost", onClick: closeDrawer, children: "Cancel" }),
              jsx("button", {
                type: "button",
                className: "btn btn--primary",
                onClick: submit,
                children: [jsx(Icon, { name: isEdit ? "check" : "plus" }), isEdit ? "Save Template" : "Create Template"]
              })
            ]
          }),
          children: jsxs("div", {
            className: "form-grid",
            children: [
              jsx(
                HrField,
                { label: "Template Name", required: true },
                jsx("input", {
                  className: "input",
                  placeholder: "e.g. Standard Corporate Offer",
                  value: state.name,
                  onChange: (e) => update("name", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "Template Code (Uppercase)", required: true },
                jsx("input", {
                  className: "input",
                  placeholder: "e.g. OLT-CORP",
                  value: state.code,
                  onChange: (e) => update("code", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "Description", className: "field--full" },
                jsx("input", {
                  className: "input",
                  placeholder: "Brief purpose or role target for this template...",
                  value: state.description,
                  onChange: (e) => update("description", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "Basic Salary %" },
                jsx("input", {
                  className: "input",
                  type: "number",
                  value: state.basicPercent,
                  onChange: (e) => update("basicPercent", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "HRA %" },
                jsx("input", {
                  className: "input",
                  type: "number",
                  value: state.hraPercent,
                  onChange: (e) => update("hraPercent", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "Special Allowance %" },
                jsx("input", {
                  className: "input",
                  type: "number",
                  value: state.specialAllowancePercent,
                  onChange: (e) => update("specialAllowancePercent", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "Email / Document Subject Line", className: "field--full" },
                jsx("input", {
                  className: "input",
                  value: state.subject,
                  onChange: (e) => update("subject", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "Appointment Letter Body Template", className: "field--full" },
                jsx("textarea", {
                  className: "input",
                  rows: 5,
                  value: state.bodyTemplate,
                  onChange: (e) => update("bodyTemplate", e.target.value)
                })
              ),
              jsx("div", {
                style: { gridColumn: "1 / -1", fontSize: "11px", color: "var(--muted)", background: "var(--well)", padding: "8px 12px", borderRadius: "8px" },
                children: "Available tokens: {candidateName}, {position}, {department}, {branch}, {joiningDate}, {ctc}, {expiryDate}, {companyName}"
              }),
              jsx(
                HrField,
                { label: "Key Contractual Terms (One per line)", className: "field--full" },
                jsx("textarea", {
                  className: "input",
                  rows: 4,
                  value: state.termsText,
                  onChange: (e) => update("termsText", e.target.value)
                })
              ),
              jsx(
                HrField,
                { label: "System Default" },
                jsx(CheckboxToggle, {
                  on: state.isDefault,
                  label: "Set as Default Template",
                  onChange: () => update("isDefault", !state.isDefault)
                })
              )
            ]
          })
        })
      );
    };

    render();
  };

  const removeTemplate = async (tpl, anchor) => {
    const ok = await confirmModal(
      {
        title: "Delete template " + tpl.name + "?",
        text: "This template will be permanently removed. Existing offer letters will preserve their text.",
        ok: "Delete template",
        danger: true
      },
      anchor
    );
    if (!ok) return;

    const res = await apiFetch("/api/hr/offer-letter-templates/" + tpl._id, { method: "DELETE" });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || "Template deleted", { icon: "trash" });
      reload();
    } else {
      toast((res.data && res.data.message) || res.error || "Failed to delete template", { icon: "x" });
    }
  };

  let previewBody = (activeTemplate?.bodyTemplate || "We are pleased to offer you the position of {position} in {department} at {companyName}.")
    .replace(/{candidateName}/g, curSample.name)
    .replace(/{position}/g, curSample.role)
    .replace(/{department}/g, curSample.department)
    .replace(/{branch}/g, curSample.branch)
    .replace(/{joiningDate}/g, curSample.joiningDate)
    .replace(/{expiryDate}/g, curSample.expiryDate)
    .replace(/{ctc}/g, "₹" + Number(curSample.ctc).toLocaleString("en-IN"))
    .replace(/{companyName}/g, "Aedentek CRM · Calder & Moss Surfaces");

  if (!previewBody.trim().startsWith("Dear")) {
    previewBody = "Dear " + curSample.name + ",\n\n" + previewBody;
  }

  return jsxs("div", {
    className: "page hr commissions-page tmpl-studio-wrapper",
    children: [
      jsx(PageHeader, {
        crumbs: [
          { label: "Workspace" },
          { label: "Masters", href: "/clients/service-types" },
          { label: "Offer Letter Templates" }
        ],
        title: "Offer Letter Templates",
        sub: "Spec-faithful A4 layout picker for employment contracts & executive appointment documents.",
        actions: jsxs("div", {
          className: "row",
          style: { gap: "8px", alignItems: "center" },
          children: [
            jsxs("div", {
              style: { display: "flex", alignItems: "center", gap: "6px" },
              children: [
                jsx("span", { style: { fontSize: "12px", fontWeight: "600", color: "var(--muted)" }, children: "Candidate:" }),
                jsx("select", {
                  className: "select",
                  style: { height: "34px", fontSize: "12px", minWidth: "170px" },
                  value: sampleIdx,
                  onChange: (e) => setSampleIdx(Number(e.target.value)),
                  children: SAMPLE_OFFER_CANDIDATES.map((c, i) =>
                    jsx("option", { key: i, value: i, children: c.name + " (" + c.role + ")" })
                  )
                })
              ]
            }),
            jsx("button", {
              type: "button",
              className: "btn btn--outline magnetic",
              onClick: () => openTemplateDrawer(),
              children: [jsx(Icon, { name: "plus" }), "New Template"]
            }),
            jsx("button", {
              type: "button",
              className: "btn btn--primary magnetic",
              onClick: handleSetDefault,
              children: [jsx(Icon, { name: "check" }), isSaved ? "Saved as Default" : "Set as Default"]
            })
          ]
        })
      }),
      jsxs("div", {
        className: "tmpl-page",
        "data-tmpl-layout": "page",
        "data-spec-page": "offer-letter-templates",
        children: [
          jsxs("div", {
            className: "tmpl-grid",
            children: [
              // LEFT: Template Library
              jsxs("div", {
                className: "tmpl-gallery",
                "data-tmpl-gallery": "true",
                children: [
                  jsx("div", {
                    className: "tmpl-gallery__head",
                    children: jsxs("h3", {
                      children: [
                        "Template Library ",
                        jsx("span", {
                          style: { color: "var(--muted)", fontWeight: "500", fontSize: "12px" },
                          children: "(" + templates.length + " templates)"
                        })
                      ]
                    })
                  }),
                  templates.map((tpl) => {
                    const isSel = tpl._id === selectedId;
                    const isDef = Boolean(tpl.isDefault);
                    const tplColor = colors[tpl._id] || colors[tpl.code] || (tpl.code === "OLT-EXEC" ? "#e5252a" : tpl.code === "OLT-TECH" ? "#0891b2" : "#4d33b6");
                    const tag = tpl.code === "OLT-CORP" ? "Corporate - A4" : tpl.code === "OLT-EXEC" ? "Executive - A4" : tpl.code === "OLT-TECH" ? "Engineering - A4" : "Custom - A4";

                    return jsxs("div", {
                      key: tpl._id,
                      className: "tmpl-card ol-tpl-card" + (isSel ? " is-selected" : "") + (isDef ? " is-default" : ""),
                      "data-template-card": tpl.code || tpl._id,
                      "data-default": isDef ? "true" : "false",
                      onClick: () => setSelectedId(tpl._id),
                      children: [
                        jsx("div", {
                          className: "tmpl-card__swatch",
                          children: renderOlSwatch(tpl, tplColor)
                        }),
                        jsxs("div", {
                          className: "tmpl-card__body",
                          children: [
                            jsxs("div", {
                              style: { display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" },
                              children: [
                                jsxs("b", {
                                  style: { fontSize: "14px", letterSpacing: "-0.01em", display: "inline-flex", alignItems: "center", gap: "8px" },
                                  children: [
                                    tpl.name,
                                    isDef ? jsxs("span", { className: "tmpl-default-pill", children: [jsx(Icon, { name: "check" }), "Default"] }) : null
                                  ]
                                }),
                                jsx("span", { className: "tmpl-card__tag", style: { color: tplColor }, children: tag })
                              ]
                            }),
                            jsx("p", {
                              className: "muted",
                              style: { fontSize: "12.5px", lineHeight: 1.5, margin: "6px 0 10px" },
                              children: tpl.description || "Standard appointment letter template."
                            }),
                            jsxs("div", {
                              style: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" },
                              children: [
                                jsx("span", { className: "tmpl-badge", children: "Basic " + (tpl.salaryStructure?.basicPercent ?? 50) + "%" }),
                                jsx("span", { className: "tmpl-badge", children: "HRA " + (tpl.salaryStructure?.hraPercent ?? 20) + "%" }),
                                jsx("span", { className: "tmpl-badge", children: "Special " + (tpl.salaryStructure?.specialAllowancePercent ?? 30) + "%" }),
                                jsx("span", { className: "tmpl-badge", children: "A4 Contract" })
                              ]
                            }),
                            jsxs("div", {
                              style: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--line)" },
                              children: [
                                jsxs("div", {
                                  style: { display: "flex", alignItems: "center", gap: "8px" },
                                  children: [
                                    jsx("button", {
                                      type: "button",
                                      className: "btn btn--xs btn--ghost",
                                      onClick: (e) => { e.stopPropagation(); openTemplateDrawer(tpl); },
                                      children: [jsx(Icon, { name: "edit" }), "Edit Clauses"]
                                    }),
                                    !isDef ? jsx("button", {
                                      type: "button",
                                      className: "btn btn--xs btn--ghost",
                                      style: { color: "var(--bad)" },
                                      onClick: (e) => { e.stopPropagation(); removeTemplate(tpl, e.currentTarget); },
                                      children: [jsx(Icon, { name: "trash" }), "Delete"]
                                    }) : null
                                  ]
                                }),
                                isSel ? jsxs("div", {
                                  className: "tmpl-card__pick",
                                  style: { color: tplColor, fontWeight: 700, fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" },
                                  children: [jsx(Icon, { name: "check" }), "Selected"]
                                }) : null
                              ]
                            })
                          ]
                        })
                      ]
                    });
                  })
                ]
              }),
              // RIGHT: Live Preview Studio
              jsxs("div", {
                className: "tmpl-preview",
                "data-spec-preview": activeTemplate?.code || "custom",
                children: [
                  jsxs("div", {
                    className: "tmpl-preview__bar",
                    children: [
                      jsxs("span", {
                        style: { fontSize: "12px", fontWeight: "700", letterSpacing: "0.03em" },
                        children: [
                          "LIVE PREVIEW ",
                          jsxs("i", {
                            className: "muted",
                            style: { fontWeight: "500" },
                            children: ["· " + (activeTemplate?.name || "Offer Letter") + " · Appointment Letter"]
                          })
                        ]
                      }),
                      jsxs("div", {
                        className: "tmpl-color",
                        children: [
                          jsx("span", { className: "tmpl-color__label", children: "Colour" }),
                          ...OL_COLOR_PRESETS.map((hex) =>
                            jsx("button", {
                              key: hex,
                              type: "button",
                              className: "tmpl-swatch" + (activeColor.toLowerCase() === hex.toLowerCase() ? " is-on" : ""),
                              style: { background: hex },
                              onClick: () => handleColorChange(hex)
                            })
                          ),
                          jsx("input", {
                            type: "color",
                            className: "tmpl-color__input",
                            "aria-label": "Custom colour",
                            value: activeColor,
                            onChange: (e) => handleColorChange(e.target.value)
                          }),
                          jsx("button", {
                            type: "button",
                            className: "btn btn--sm btn--ghost",
                            disabled: !colors[activeTemplate?._id] && !colors[activeTemplate?.code],
                            onClick: () => handleColorChange(""),
                            children: "Reset"
                          })
                        ]
                      }),
                      jsxs("div", {
                        className: "row",
                        style: { gap: "6px" },
                        children: [
                          jsxs("span", { className: "tmpl-kpi", children: ["Sheet ", jsx("b", { children: "794 × 1050" })] }),
                          jsxs("span", { className: "tmpl-kpi", children: ["Page ", jsx("b", { children: "A4" })] })
                        ]
                      })
                    ]
                  }),
                  jsx("div", {
                    className: "tmpl-preview__stage",
                    children: jsx(OfferLetterDoc, {
                      offer: {
                        candidateName: curSample.name,
                        position: curSample.role,
                        department: curSample.department,
                        branch: curSample.branch,
                        candidateEmail: curSample.email,
                        candidatePhone: curSample.phone,
                        candidateAddress: curSample.address,
                        joiningDate: curSample.joiningDate,
                        expiryDate: curSample.expiryDate,
                        offerNumber: curSample.offerNumber,
                        ctc: curSample.ctc,
                        salaryBreakdown: {
                          basic: Math.round(((curSample.ctc / 12) * (activeTemplate?.salaryStructure?.basicPercent ?? 50)) / 100),
                          hra: Math.round(((curSample.ctc / 12) * (activeTemplate?.salaryStructure?.hraPercent ?? 20)) / 100),
                          specialAllowance: Math.round(((curSample.ctc / 12) * (activeTemplate?.salaryStructure?.specialAllowancePercent ?? 30)) / 100),
                          monthlyGross: Math.round(curSample.ctc / 12)
                        },
                        terms: activeTemplate?.terms,
                        bodyText: previewBody
                      },
                      template: activeTemplate,
                      accentColor: activeColor
                    })
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




/* ------------------------------------------------------------------ *
 * Roles & Access Management (Theme-Based Full CRUD + Page Restrictions)
 * ------------------------------------------------------------------ */

const ROLE_COLORS = [
  { id: 'primary', label: 'Primary', hex: 'var(--primary, #7627c4)' },
  { id: 'cobalt', label: 'Cobalt', hex: 'var(--cobalt, #3b6ff5)' },
  { id: 'teal', label: 'Teal', hex: 'var(--teal, #0d9488)' },
  { id: 'amber', label: 'Amber', hex: 'var(--amber, #d97706)' },
  { id: 'good', label: 'Green', hex: 'var(--good, #16a34a)' },
  { id: 'slate', label: 'Slate', hex: 'var(--slate, #64748b)' }
];

const ROLE_PRESETS = {
  Staff: ['/today', '/clients', '/projects', '/deals', '/inbox', '/calendar', '/outreach', '/library', '/profile', '/support'],
  Manager: ['/today', '/clients', '/projects', '/deals', '/inbox', '/calendar', '/outreach', '/finance', '/accounts', '/hr/staff', '/hr/offer-letters', '/hr/attendance', '/hr/leave', '/team', '/library', '/profile', '/support']
};

function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, active: 0, custom: 0, assignedUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | { id, isSystem, name, description, status, color, allowedPages: Set }
  const [saving, setSaving] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (statusFilter !== 'All') params.set('status', statusFilter);
    const qs = params.toString();
    const res = await apiFetch('/api/roles' + (qs ? '?' + qs : ''));
    if (res.ok && res.data && res.data.success) {
      setRoles(res.data.data || []);
      if (Array.isArray(res.data.pageCatalog)) setCatalog(res.data.pageCatalog);
      if (res.data.kpis) setKpis(res.data.kpis);
    } else {
      setError((res.data && res.data.message) || res.error || 'Could not load roles');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRoles();
  }, [query, statusFilter]);

  const allPaths = useMemo(() => catalog.flatMap((g) => g.pages.map((p) => p.path)), [catalog]);
  const labelByPath = useMemo(() => {
    const map = {};
    catalog.forEach((g) => g.pages.forEach((p) => { map[p.path] = p.label; }));
    return map;
  }, [catalog]);

  const openCreate = (seed = null) => {
    setModal({
      id: null,
      isSystem: false,
      name: seed ? `${seed.name} Copy` : '',
      description: seed ? (seed.description || '') : '',
      status: 'Active',
      color: seed ? (seed.color || 'primary') : 'primary',
      allowedPages: new Set(seed ? (seed.allowedPages || []) : ROLE_PRESETS.Staff)
    });
  };

  const openEdit = (row) => {
    setModal({
      id: row._id,
      isSystem: Boolean(row.isSystem),
      slug: row.slug || '',
      name: row.name || '',
      description: row.description || '',
      status: row.status || 'Active',
      color: row.color || 'primary',
      allowedPages: new Set(row.allowedPages || [])
    });
  };

  const togglePage = (path) => {
    setModal((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.allowedPages);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { ...prev, allowedPages: next };
    });
  };

  const toggleGroup = (groupPages, enable) => {
    setModal((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.allowedPages);
      groupPages.forEach((p) => { if (enable) next.add(p.path); else next.delete(p.path); });
      return { ...prev, allowedPages: next };
    });
  };

  const applyPreset = (presetKey) => {
    setModal((prev) => {
      if (!prev) return prev;
      if (presetKey === 'all') return { ...prev, allowedPages: new Set(allPaths) };
      if (presetKey === 'none') return { ...prev, allowedPages: new Set(['/today', '/profile']) };
      return { ...prev, allowedPages: new Set(ROLE_PRESETS[presetKey] || []) };
    });
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!modal || saving) return;
    const name = String(modal.name || '').trim();
    if (!name || name.length < 2) {
      toast('Role name must be at least 2 characters', { icon: 'x' });
      return;
    }
    const pages = [...modal.allowedPages].filter((p) => allPaths.includes(p));
    if (!pages.length) {
      toast('Select at least one allowed page', { icon: 'x' });
      return;
    }
    setSaving(true);
    try {
      const url = modal.id ? `/api/roles/${modal.id}` : '/api/roles';
      const payload = {
        name,
        description: String(modal.description || '').trim(),
        status: modal.status,
        color: modal.color,
        allowedPages: pages
      };
      const res = await apiFetch(url, {
        method: modal.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok && res.data && res.data.success) {
        toast(res.data.message || 'Role saved', { icon: 'check' });
        setModal(null);
        loadRoles();
      } else {
        toast((res.data && res.data.message) || res.error || 'Could not save role', { icon: 'x' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row, anchor) => {
    if (row.isSystem) {
      toast(`Built-in role "${row.name}" cannot be deleted`, { icon: 'x' });
      return;
    }
    const ok = await confirmModal(
      {
        title: `Delete role "${row.name}"?`,
        text: 'This removes the custom role permanently. Roles currently assigned to active users cannot be deleted.',
        confirmLabel: 'Delete role',
        danger: true
      },
      anchor
    );
    if (!ok) return;
    const res = await apiFetch(`/api/roles/${row._id}`, { method: 'DELETE' });
    if (res.ok && res.data && res.data.success) {
      toast(res.data.message || 'Role deleted', { icon: 'check' });
      loadRoles();
    } else {
      toast((res.data && res.data.message) || res.error || 'Could not delete role', { icon: 'x' });
    }
  };

  const selectedCount = modal ? [...modal.allowedPages].filter((p) => allPaths.includes(p)).length : 0;

  return jsxs('div', {
    className: 'hr-stack rl-page',
    children: [
      jsx(KpiRow, {
        items: [
          { label: 'Total roles', value: fmtCount(kpis.total), tone: 'cobalt', icon: 'lock' },
          { label: 'Active roles', value: fmtCount(kpis.active), tone: 'teal', icon: 'check' },
          { label: 'Custom roles', value: fmtCount(kpis.custom), tone: 'amber', icon: 'layers' },
          { label: 'Assigned users', value: fmtCount(kpis.assignedUsers), tone: 'slate', icon: 'team' }
        ]
      }),
      error
        ? jsx('div', {
            className: 'hr-banner hr-banner--bad',
            children: [jsx(Icon, { name: 'x' }), jsx('span', { children: error })]
          })
        : null,
      jsx(Card, {
        title: 'Role directory & page access',
        sub: `${roles.length} role${roles.length === 1 ? '' : 's'} configured · controls sidebar visibility, route guards, and API access`,
        flush: true,
        children: jsxs('div', {
          children: [
            jsx(HrToolbar, {
              children: [
                jsx(SearchInput, { value: query, onChange: setQuery, placeholder: 'Search role name or description…' }),
                jsx(
                  'select',
                  {
                    className: 'select hr-filter',
                    value: statusFilter,
                    onChange: (ev) => setStatusFilter(ev.target.value),
                    'aria-label': 'Filter by role status'
                  },
                  ['All', 'Active', 'Inactive'].map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
                ),
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  'data-testid': 'new-role-btn',
                  onClick: () => openCreate(null),
                  children: [jsx(Icon, { name: 'plus' }), 'New Role']
                })
              ]
            }),
            loading
              ? jsx(EmptyState, { icon: 'clock', title: 'Loading roles…', text: 'Fetching role definitions and page access matrix.' })
              : roles.length === 0
                ? jsx(EmptyState, {
                    icon: 'lock',
                    title: 'No matching roles',
                    text: 'Create a custom role to grant tailored CRM page access.',
                    action: jsx('button', { type: 'button', className: 'btn btn--primary btn--sm', onClick: () => openCreate(null), children: '+ New Role' })
                  })
                : jsx('div', {
                    className: 'table-wrap rl-table-wrap',
                    tabIndex: 0,
                    role: 'region',
                    'aria-label': 'Roles and page permissions table',
                    children: jsxs('table', {
                      className: 'table rl-table',
                      children: [
                        jsx('thead', {
                          children: jsxs('tr', {
                            children: [
                              jsx('th', { className: 'col-sno', children: 'S NO' }),
                              jsx('th', { children: 'Role' }),
                              jsx('th', { children: 'Description' }),
                              jsx('th', { children: 'Allowed Pages' }),
                              jsx('th', { children: 'Users' }),
                              jsx('th', { children: 'Status' }),
                              jsx('th', { style: { textAlign: 'right' }, children: 'Actions' })
                            ]
                          })
                        }),
                        jsx('tbody', {
                          children: roles.map((row, idx) => {
                            const visiblePages = (row.allowedPages || []).filter((p) => labelByPath[p]);
                            const preview = visiblePages.slice(0, 4);
                            const extra = Math.max(0, visiblePages.length - preview.length);
                            return jsxs('tr', {
                              key: row._id,
                              'data-row': '',
                              'data-role-name': row.name,
                              children: [
                                jsx('td', {
                                  className: 'col-sno',
                                  children: jsx('span', { className: `sno-pill ${idx < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: idx + 1 })
                                }),
                                jsx('td', {
                                  children: jsxs('div', {
                                    className: 'rl-name-cell',
                                    children: [
                                      jsx('span', { className: `rl-badge rl-badge--${row.color || 'primary'}`, children: row.name }),
                                      jsx('small', { className: 'rl-kind', children: row.isSystem ? 'System role' : 'Custom role' })
                                    ]
                                  })
                                }),
                                jsx('td', {
                                  children: jsx('span', { className: 'rl-desc', children: row.description || '—' })
                                }),
                                jsx('td', {
                                  children: jsxs('div', {
                                    className: 'rl-chips',
                                    children: [
                                      ...preview.map((p) => jsx('span', { key: p, className: 'rl-chip', children: labelByPath[p] })),
                                      extra > 0 ? jsx('span', { key: '__more', className: 'rl-chip rl-chip--more', children: `+${extra} more` }) : null
                                    ]
                                  })
                                }),
                                jsx('td', {
                                  children: jsx('span', { className: 'rl-users-pill', children: `${row.userCount || 0} user${row.userCount === 1 ? '' : 's'}` })
                                }),
                                jsx('td', { children: jsx(StatusCell, { value: row.status }) }),
                                jsx('td', {
                                  className: 'hr-actions-cell',
                                  style: { textAlign: 'right' },
                                  children: jsxs('div', {
                                    className: 'hr-row-actions',
                                    style: { justifyContent: 'flex-end' },
                                    children: [
                                      jsx(ActionButton, {
                                        icon: 'edit',
                                        label: `Edit ${row.name}`,
                                        variant: 'edit',
                                        onClick: () => openEdit(row)
                                      }),
                                      jsx(ActionButton, {
                                        icon: 'copy',
                                        label: `Duplicate ${row.name}`,
                                        variant: 'view',
                                        onClick: () => openCreate(row)
                                      }),
                                      !row.isSystem
                                        ? jsx(ActionButton, {
                                            icon: 'trash',
                                            label: `Delete ${row.name}`,
                                            variant: 'delete',
                                            danger: true,
                                            onClick: (ev) => handleDelete(row, ev.currentTarget)
                                          })
                                        : null
                                    ].filter(Boolean)
                                  })
                                })
                              ]
                            });
                          })
                        })
                      ]
                    })
                  })
          ]
        })
      }),

      // CREATE / EDIT ROLE MODAL
      modal
        ? jsx('div', {
            className: 'scrim rl-scrim',
            onClick: () => !saving && setModal(null),
            children: jsxs('div', {
              className: 'card rl-modal',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': modal.id ? `Edit Role ${modal.name}` : 'Create Role',
              onClick: (ev) => ev.stopPropagation(),
              children: [
                jsxs('div', {
                  className: 'rl-modal__head',
                  children: [
                    jsxs('div', {
                      children: [
                        jsx('h2', { className: 'rl-modal__title', children: modal.id ? `Edit Role — ${modal.name}` : 'Create New Role' }),
                        jsx('p', { className: 'rl-modal__sub', children: 'Define role details and select exactly which CRM pages users with this role can access.' })
                      ]
                    }),
                    jsx('button', {
                      type: 'button',
                      className: 'ibtn ibtn--sm',
                      'aria-label': 'Close modal',
                      onClick: () => !saving && setModal(null),
                      children: jsx(Icon, { name: 'x' })
                    })
                  ]
                }),
                jsxs('form', {
                  className: 'rl-form',
                  onSubmit: handleSave,
                  children: [
                    jsxs('div', {
                      className: 'rl-modal__body',
                      children: [
                        jsxs('div', {
                          className: 'form-grid form-grid--3 rl-meta-grid',
                          children: [
                            jsxs('label', {
                              className: 'field',
                              children: [
                                jsx('span', { children: 'Role Name *' }),
                                jsx('input', {
                                  className: 'input',
                                  name: 'roleName',
                                  required: true,
                                  disabled: modal.isSystem,
                                  value: modal.name,
                                  placeholder: 'e.g. Accountant, HR Executive',
                                  onChange: (ev) => setModal((p) => ({ ...p, name: ev.target.value }))
                                })
                              ]
                            }),
                            jsxs('label', {
                              className: 'field',
                              children: [
                                jsx('span', { children: 'Status' }),
                                jsxs('select', {
                                  className: 'select',
                                  name: 'roleStatus',
                                  disabled: modal.slug === 'admin',
                                  value: modal.status,
                                  onChange: (ev) => setModal((p) => ({ ...p, status: ev.target.value })),
                                  children: [
                                    jsx('option', { value: 'Active', children: 'Active' }),
                                    jsx('option', { value: 'Inactive', children: 'Inactive' })
                                  ]
                                })
                              ]
                            }),
                            jsxs('div', {
                              className: 'field',
                              children: [
                                jsx('span', { children: 'Badge Color' }),
                                jsx('div', {
                                  className: 'rl-swatches',
                                  role: 'radiogroup',
                                  'aria-label': 'Role badge color',
                                  children: ROLE_COLORS.map((c) =>
                                    jsx('button', {
                                      key: c.id,
                                      type: 'button',
                                      className: `rl-swatch${modal.color === c.id ? ' is-on' : ''}`,
                                      style: { '--sw': c.hex },
                                      title: c.label,
                                      'aria-label': c.label,
                                      'aria-checked': modal.color === c.id,
                                      role: 'radio',
                                      onClick: () => setModal((p) => ({ ...p, color: c.id }))
                                    })
                                  )
                                })
                              ]
                            }),
                            jsxs('label', {
                              className: 'field span-3',
                              children: [
                                jsx('span', { children: 'Description' }),
                                jsx('input', {
                                  className: 'input',
                                  name: 'roleDescription',
                                  value: modal.description,
                                  placeholder: 'Short summary of responsibilities and access scope',
                                  onChange: (ev) => setModal((p) => ({ ...p, description: ev.target.value }))
                                })
                              ]
                            })
                          ]
                        }),
                        jsxs('div', {
                          className: 'rl-presets-bar',
                          children: [
                            jsxs('div', {
                              className: 'rl-presets-bar__title',
                              children: [
                                jsx('b', { children: 'Page Access Permissions' }),
                                jsx('span', { className: 'rl-count-pill', children: `${selectedCount} / ${allPaths.length} pages enabled` })
                              ]
                            }),
                            jsxs('div', {
                              className: 'rl-presets-bar__btns',
                              children: [
                                jsx('button', { type: 'button', className: 'btn btn--ghost btn--sm', onClick: () => applyPreset('all'), children: 'Select All' }),
                                jsx('button', { type: 'button', className: 'btn btn--ghost btn--sm', onClick: () => applyPreset('Manager'), children: 'Manager Preset' }),
                                jsx('button', { type: 'button', className: 'btn btn--ghost btn--sm', onClick: () => applyPreset('Staff'), children: 'Staff Preset' }),
                                jsx('button', { type: 'button', className: 'btn btn--ghost btn--sm', onClick: () => applyPreset('none'), children: 'Minimal' })
                              ]
                            })
                          ]
                        }),
                        jsx('div', {
                          className: 'rl-perm-grid',
                          children: catalog.map((grp) => {
                            const grpSelected = grp.pages.filter((p) => modal.allowedPages.has(p.path)).length;
                            const allOn = grpSelected === grp.pages.length;
                            return jsxs('section', {
                              key: grp.group,
                              className: 'rl-perm-group',
                              children: [
                                jsxs('header', {
                                  className: 'rl-perm-group__head',
                                  children: [
                                    jsxs('span', {
                                      className: 'rl-perm-group__title',
                                      children: [
                                        jsx('b', { children: grp.group }),
                                        jsx('small', { children: `${grpSelected}/${grp.pages.length}` })
                                      ]
                                    }),
                                    jsx('button', {
                                      type: 'button',
                                      className: 'link rl-perm-group__toggle',
                                      onClick: () => toggleGroup(grp.pages, !allOn),
                                      children: allOn ? 'Clear' : 'Select all'
                                    })
                                  ]
                                }),
                                jsx('div', {
                                  className: 'rl-perm-group__list',
                                  children: grp.pages.map((pg) => {
                                    const checked = modal.allowedPages.has(pg.path);
                                    const locked = modal.slug === 'admin' && (pg.path === '/hr/roles' || pg.path === '/settings' || pg.path === '/today');
                                    return jsxs('label', {
                                      key: pg.path,
                                      className: `rl-perm-item${checked ? ' is-on' : ''}`,
                                      children: [
                                        jsx('input', {
                                          type: 'checkbox',
                                          className: 'rl-perm-check',
                                          'data-page-path': pg.path,
                                          checked,
                                          disabled: locked,
                                          onChange: () => !locked && togglePage(pg.path)
                                        }),
                                        jsxs('span', {
                                          className: 'rl-perm-item__txt',
                                          children: [
                                            jsx('b', { children: pg.label }),
                                            jsx('small', { children: pg.desc })
                                          ]
                                        })
                                      ]
                                    });
                                  })
                                })
                              ]
                            });
                          })
                        })
                      ]
                    }),
                    jsxs('div', {
                      className: 'rl-modal__foot',
                      children: [
                        jsx('span', { className: 'muted', style: { fontSize: 'var(--fs-xs)' }, children: 'Changes take effect immediately across sidebar, route guards, and APIs.' }),
                        jsxs('div', {
                          style: { display: 'flex', gap: 10 },
                          children: [
                            jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => !saving && setModal(null), children: 'Cancel' }),
                            jsx('button', { type: 'submit', className: 'btn btn--primary', 'data-testid': 'save-role-btn', disabled: saving, children: saving ? 'Saving…' : (modal.id ? 'Save Role Changes' : 'Create Role') })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          })
        : null
    ]
  });
}

function HrPage({ route }) {
  const rawSub = route && route.sub ? String(route.sub) : "";
  const sub = HR_PAGES[rawSub] ? rawSub : DEFAULT_SUB;
  const meta = HR_PAGES[sub];

  if (sub === "staff" && route && route.param) {
    return jsx(StaffFormPage, { editId: route.param === "new" ? null : route.param }, "sf-" + route.param);
  }

  if (sub === "offer-letter-templates") {
    return jsx(OfferLetterTemplatesStudioPage, {});
  }

  let content = null;
  if (sub === "staff") content = jsx(StaffEmployeesPage, {});
  else if (sub === "roles") content = jsx(RolesPage, {});
  else if (sub === "offer-letters") content = jsx(OfferLettersPage, {});
  else if (sub === "attendance") content = jsx(AttendancePage, {});
  else if (sub === "leave") content = jsx(LeavePage, {});
  else if (sub === "payroll") content = jsx(PayrollPage, {});
  else content = jsx(GenericHrModule, { config: HR_MODULE_CONFIG[sub] });

  return jsxs("div", {
    className: "page hr",
    children: [
      jsx(PageHeader, {
        crumbs: [
          { label: "Workspace" },
          (sub === "branches" || sub === "leave-types" || sub === "shifts" || sub === "roles" || sub === "offer-letter-templates")
            ? { label: "Masters", href: "/clients/service-types" }
            : { label: "Human Resources", href: "/hr/staff" },
          { label: meta.title }
        ],
        title: meta.title,
        sub: meta.sub
      }),
      jsx("div", { className: "hr-stack", children: content })
    ]
  });
}

export default HrPage;