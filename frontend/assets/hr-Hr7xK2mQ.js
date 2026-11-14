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

const { useState, useEffect, useMemo } = ReactHooks();

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
  { id: 'branches', label: 'Branches', href: '/hr/branches', icon: 'building' },
  { id: 'attendance', label: 'Attendance', href: '/hr/attendance', icon: 'clock' },
  { id: 'leave', label: 'Leave', href: '/hr/leave', icon: 'calendar' },
  { id: 'leave-types', label: 'Leave Types', href: '/hr/leave-types', icon: 'tag' },
  { id: 'shifts', label: 'Shifts', href: '/hr/shifts', icon: 'sun' },
  { id: 'salary', label: 'Salary', href: '/hr/salary', icon: 'card' },
  { id: 'advances', label: 'Advances', href: '/hr/advances', icon: 'receipt' },
  { id: 'adjustments', label: 'Adjustments', href: '/hr/adjustments', icon: 'layers' },
  { id: 'payroll', label: 'Payroll', href: '/hr/payroll', icon: 'finance' }
];

const HR_PAGES = {
  staff: {
    title: 'Employees',
    sub: 'Directory, payroll profile and portal access for everyone on the roster.'
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
      if (res.ok && payload.success && Array.isArray(payload.data)) setBranches(payload.data);
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

function RowActions({ onEdit, onDelete, editLabel = 'Edit', deleteLabel = 'Delete' }) {
  return jsxs('div', {
    className: 'hr-row-actions',
    children: [
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
    ]
  });
}

function HrTable({ head, headNode, rows, renderRow, emptyTitle, emptyText, emptyIcon, paged }) {
  const offset = paged && paged.pagination ? paged.pagination.from - 1 : 0;
  const hasHead = Array.isArray(head) && head.length > 0;
  const hasSno = (hasHead && (head[0] === 'S No' || head[0] === 'S NO' || head[0] === '#')) ||
                 (headNode && headNode.props && Array.isArray(headNode.props.children) && headNode.props.children[0]?.key === 'sno');

  let theadElement = headNode;
  if (!headNode && hasHead) {
    const theadChildren = hasSno
      ? head.map((h) => jsx('th', { key: h, style: { textAlign: 'center' }, children: h }))
      : [
          jsx('th', { key: 'sno', style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center', paddingLeft: 8, paddingRight: 8 }, children: 'S No' }),
          ...head.map((h) => jsx('th', { key: h, style: { textAlign: 'center' }, children: h }))
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
  const colCount = hasHead ? (hasSno ? head.length : head.length + 1) : (headNode ? 99 : 1);

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
    initial: () => ({ name: '', code: '', city: '', address: '', phone: '', email: '', manager: '', status: 'Active' }),
    fields: [
      textField('name', 'Branch name', { required: true, placeholder: 'Bandra' }),
      textField('code', 'Code', { placeholder: 'BA' }),
      textField('city', 'City', { placeholder: 'Mumbai' }),
      textField('manager', 'Branch manager', { placeholder: 'Full name' }),
      { name: 'phone', label: 'Phone', type: 'text', placeholder: '+91 98765 43210' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'branch@company.com' },
      { name: 'address', label: 'Address', type: 'textarea', span: 'span-2', placeholder: 'Street, area' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
    ],
    payload: (values) => ({
      name: values.name.trim(),
      code: (values.code || '').trim(),
      city: (values.city || '').trim(),
      manager: (values.manager || '').trim(),
      phone: (values.phone || '').trim(),
      email: (values.email || '').trim(),
      address: (values.address || '').trim(),
      status: values.status || 'Active'
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
            children: [jsx('b', { children: r.name }), jsx('small', { children: r.code || '—' })]
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
      return jsx(CheckboxToggle, {
        on: Boolean(value),
        label: field.label,
        onChange: () => setValue(field.name, !value)
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
      return jsx(
        'select',
        {
          className: 'select',
          value: value || 'All Branches',
          onChange: (ev) => setValue(field.name, ev.target.value)
        },
        branchOptions(branchList, value, true).map((opt) => jsx('option', { value: opt, key: opt, children: opt }))
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
    fields: ['salutation', 'firstName', 'middleName', 'lastName', 'dob', 'gender', 'maritalStatus', 'bloodGroup', 'nationality']
  },
  {
    label: 'Employment',
    fields: ['department', 'role', 'branch', 'shift', 'employmentType', 'joiningDate', 'status', 'biometricId']
  },
  { label: 'Salary elements', fields: STAFF_NUMERIC },
  { label: 'Bank settlement', fields: ['bankName', 'accountNumber', 'ifscCode', 'iban'] },
  { label: 'Portal access', fields: ['accessLevel', 'username', 'createLogin', 'password'] }
];

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
  'Personal': ['user', 'Name, date of birth and personal details.'],
  'Employment': ['team', 'Role, branch, shift and joining details.'],
  'Salary elements': ['card', 'Monthly salary components that feed payroll.'],
  'Bank settlement': ['finance', 'Where the salary is paid.'],
  'Portal access': ['lock', 'Optional login for the staff portal.']
};

function renderStaffField(key, ctx) {
  const { staff, isEdit, shiftOptions, branchList } = ctx;
  {
              if (key === 'createLogin') {
                return jsx(
                  HrField,
                  { key, label: 'Create portal login' },
                  jsx('input', {
                    type: 'checkbox',
                    name: 'createLogin',
                    defaultChecked: Boolean(staff && staff.createLogin)
                  })
                );
              }
              if (key === 'password') {
                return jsx(
                  HrField,
                  { key, label: isEdit ? 'New password (optional)' : 'Login password' },
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
                const current = staff && staff.branch ? staff.branch : '';
                return jsx(
                  HrField,
                  { key, label: 'Branch', required: true },
                  jsx(
                    'select',
                    { className: 'select', name: 'branch', defaultValue: current },
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
                return staffSelect(
                  'accessLevel',
                  'Access level',
                  ['Staff', 'Manager', 'Admin'],
                  staff && staff.accessLevel ? staff.accessLevel : 'Staff'
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
  const [staff, setStaff] = useState(null);
  const [loaded, setLoaded] = useState(!editId);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useFormMode();
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState({});

  useEffect(() => {
    if (!editId) return;
    apiFetch(`/api/staff/${editId}`).then((res) => {
      if (res.ok && res.data && res.data.data) setStaff(res.data.data);
      else toast('Employee not found', { icon: 'x' });
      setLoaded(true);
    });
  }, [editId]);

  const shiftOptions = shifts.rows.map((s) => ({ value: s._id, label: s.name }));
  const ctx = { staff, isEdit, shiftOptions, branchList };

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
      if (!v.username) return 'A username is needed to create a login account';
      if (!isEdit && !v.password) return 'A password is needed to create a login account';
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
      if (!payload.username) {
        toast('A username is needed to create a login account', { icon: 'x' });
        return;
      }
      if (!isEdit && !payload.password) {
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

  };

  const sectionFields = (g) => {
    // portal access: password confirmation sits right under the password
    if (g.label !== 'Portal access') return g.fields;
    return ['accessLevel', 'username', 'createLogin', 'password', 'confirmPassword'];
  };

  const ICONS = { 'Personal': 'user', 'Employment': 'team', 'Salary elements': 'card', 'Bank settlement': 'finance', 'Portal access': 'lock' };
  const steps = STAFF_GROUPS.map((g) => ({
    id: g.label,
    label: g.label,
    title: g.label,
    icon: ICONS[g.label] || 'note',
    desc: STAFF_SECTION_INFO[g.label] ? STAFF_SECTION_INFO[g.label][1] : '',
    badge: isEdit ? 'Editing' : 'New employee',
    content: jsx(Panel, { children: jsx('div', { className: 'form-grid form-grid--3', children: sectionFields(g).map((key) => renderStaffField(key, ctx)) }) })
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
      { label: 'Portal', rows: [['Access level', snap.accessLevel], ['Username', snap.username], ['Login', snap.createLogin ? 'Enabled' : 'Not created']] }
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
                  head: ['Date', 'Staff', 'Role', 'Check in', 'Check out', 'Working hours', 'Status'],
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
                  head: ['Employee', 'Type', 'From', 'To', 'Days', 'Paid', 'LOP', 'Status'],
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
              head: ['Period', 'Branch', 'Status', 'Employees', 'Gross', 'Deductions', 'Net'],
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
                  head: ['Payslip no', 'Employee', 'Role', 'Gross', 'Earnings', 'Deductions', 'Net'],
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
 * Page shell
 * ------------------------------------------------------------------ */

function HrPage({ route }) {
  const rawSub = route && route.sub ? String(route.sub) : '';
  const sub = HR_PAGES[rawSub] ? rawSub : DEFAULT_SUB;
  const meta = HR_PAGES[sub];

  if (sub === 'staff' && route && route.param) {
    return jsx(StaffFormPage, { editId: route.param === 'new' ? null : route.param }, `sf-${route.param}`);
  }

  let content = null;
  if (sub === 'staff') content = jsx(StaffEmployeesPage, {});
  else if (sub === 'attendance') content = jsx(AttendancePage, {});
  else if (sub === 'leave') content = jsx(LeavePage, {});
  else if (sub === 'payroll') content = jsx(PayrollPage, {});
  else content = jsx(GenericHrModule, { config: HR_MODULE_CONFIG[sub] });

  return jsxs('div', {
    className: 'page hr',
    children: [
      jsx(PageHeader, {
        crumbs: [
          { label: 'Workspace' },
          { label: 'Human Resources', href: '/hr/staff' },
          { label: meta.title }
        ],
        title: meta.title,
        sub: meta.sub
      }),
      jsx('div', { className: 'hr-stack', children: content })
    ]
  });
}

export default HrPage;
