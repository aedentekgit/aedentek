import {
  D as toast,
  Dt as formatDate,
  F as navigateLink,
  Ft as ReactHooks,
  G as getContactById,
  H as companyInitial,
  J as dateHelper,
  Mt as ripple,
  O as useScopeRef,
  Ot as isReducedMotion,
  Pt as gsap,
  Q as dayNames,
  R as mutateState,
  St as scaleDuration,
  X as getUserById,
  Y as useGlobalState,
  Z as companyAvatarTone,
  _ as SelectField,
  _t as formatRelativeDate,
  a as AnimatedNumber,
  at as formatTime,
  b as animationHelper,
  bt as bounceElement,
  c as EmptyState,
  ct as formatDateFull,
  d as ProgressBar,
  ft as formatCurrency,
  g as SearchInput,
  h as StatusPill,
  i as CheckboxToggle,
  k as transitionHook,
  lt as formatLongDate,
  m as PageHeader,
  mt as formatNumber,
  n as formatPhone,
  nt as TODAY_ISO,
  ot as parseDate,
  pt as formatCompactCurrency,
  r as Card,
  rt as addDays,
  s as ModalDrawer,
  t as UserAvatar,
  u as HighlightText,
  ut as getDaysDiff,
  vt as Icon,
  w as openDrawer,
  wt as gsapFlip,
  xt as generateId,
  y as Tabs,
  yt as jsxRuntime,
  z as getCompanyById
} from "./ui-D4_WaMI9.js";
import {
  a as openNewDealModal,
  c as openEditDealModal,
  d as openAddContactModal,
  f as toggleTaskDone,
  i as deleteItemHelper,
  l as openLegacyInvoiceModal,
  r as navigateRoute,
  s as openQuickAddMenu,
  u as openNewTaskModal
} from "./index-DG0_cRQu.js";
import { usePaged } from "./pager.js";
import { FormWizard, Panel, PreviewCard, useFormMode } from "./wizard.js";

const { useState, useEffect, useMemo, useRef, useLayoutEffect } = ReactHooks();
const runtime = jsxRuntime();
const jsx = runtime.jsx;
const jsxs = runtime.jsxs;
const Fragment = runtime.Fragment;

// INR Currency Formatter Helper
const fmtINR = (val) => {
  const n = Number(val || 0);
  return '₹ ' + n.toLocaleString('en-IN');
};

// Safe API caller
const API_BASE = '/api/clients';

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

// Default Seed Clients matching clean non-static specification
const DEFAULT_CLIENTS = [
  {
    clientId: 'client-omni-retail',
    name: 'Rajesh Kothari',
    company: 'Omni Retail Solutions Ltd',
    email: 'r.kothari@omniretail.com',
    phone: '+91 98200 44332',
    category: 'Enterprise',
    status: 'Active',
    industry: 'E-Commerce Logistics & Retail Systems',
    accountManager: 'Rahul Sen',
    gstNumber: '27AAFCO1234F1Z8',
    panNumber: 'AAFCO1234F',
    address: 'B-402, Trade Centre, Bandra Kurla Complex (BKC), Mumbai, Maharashtra - 400051',
    city: 'Mumbai',
    website: 'https://portal.omniretail.com',
    logo: '',
    notes: 'Contracted for annual cloud infrastructure and retail catalog microservices.',
    createdDate: '2026-04-12',
    financialSummary: {
      totalBilled: 826000,
      totalPaid: 672000,
      totalOutstanding: 154000
    },
    contacts: [
      { id: 'c-1', name: 'Rajesh Kothari', role: 'Chief Commercial Officer', email: 'r.kothari@omniretail.com', phone: '+91 98200 44332', isPrimary: true },
      { id: 'c-2', name: 'Sneha Patel', role: 'Chief Technology Officer', email: 'sneha.p@omniretail.com', phone: '+91 98200 99881', isPrimary: false }
    ],
    websites: [
      { id: 'w-1', domain: 'portal.omniretail.com', status: 'Live', hostingProvider: 'AWS Mumbai (ap-south-1)', sslExpiry: '2027-04-10', domainExpiry: '2028-02-15' },
      { id: 'w-2', domain: 'staging.omniretail.com', status: 'Staging', hostingProvider: 'Vercel Enterprise', sslExpiry: '2026-12-31', domainExpiry: '2028-02-15' }
    ],
    credentials: [
      { id: 'cr-1', type: 'AWS Cloud', label: 'AWS Production IAM Admin Console', loginUrl: 'https://omniretail.signin.aws.amazon.com/console', username: 'aedentek-ops', password: 'EncryptedSecretString123!', notes: 'IAM Role with restricted CloudFront and S3 bucket access' },
      { id: 'cr-2', type: 'MySQL', label: 'Aurora DB Cluster Replica Primary', loginUrl: 'mysql://cluster.omni.internal:3306', username: 'app_master_rw', password: 'OmniSecure$Key9921', notes: 'Production read-write instance in private VPC subnet' }
    ],
    projects: [
      { id: 'p-1', title: 'Vendor Mobile App Extension Phase 2', contractValue: 350000, milestonesCompleted: 3, totalMilestones: 4, progress: 75, targetDate: '2026-11-30', leadEngineer: 'Hanna Lindqvist' },
      { id: 'p-2', title: 'Omni Architecture & API Modernization', contractValue: 476000, milestonesCompleted: 5, totalMilestones: 5, progress: 100, targetDate: '2026-08-15', leadEngineer: 'Tomás Reyes' }
    ],
    invoices: [
      { id: 'i-1', invoiceNumber: 'INV-2026-0081', issueDate: '2026-08-15', dueDate: '2026-08-30', totalAmount: 472000, status: 'Paid', taxMode: 'B2B Registered' },
      { id: 'i-2', invoiceNumber: 'INV-2026-0094', issueDate: '2026-09-01', dueDate: '2026-09-15', totalAmount: 354000, status: 'Partially Paid', taxMode: 'B2B Registered' }
    ],
    payments: [
      { id: 'pm-1', receiptId: 'REC-2026-0038', paymentDate: '2026-08-28', amount: 472000, paymentChannel: 'RTGS Inter-Bank', bankReference: 'HDFCR20260828001928' },
      { id: 'pm-2', receiptId: 'REC-2026-0045', paymentDate: '2026-09-12', amount: 200000, paymentChannel: 'NEFT Clearing', bankReference: 'HDFCN20260912008472' }
    ],
    tickets: [
      { id: 'tk-1', ticketId: 'HD-2026-018', subject: 'VPC Peering Gateway Latency in AP-South-1', priority: 'High', status: 'Resolved', assignedEngineer: 'Rahul Sen', createdAt: '2026-09-20' }
    ],
    documents: [
      { id: 'd-1', name: 'Master Services Agreement (MSA) — 2026', type: 'PDF', size: '1.8 MB', uploadedAt: '2026-04-12' },
      { id: 'd-2', name: 'Statement of Work (SOW-04) — Mobile APIs', type: 'PDF', size: '940 KB', uploadedAt: '2026-09-05' }
    ],
    timeline: [
      { id: 't-1', title: 'Partial Payment Reconciled', description: 'Received ₹ 2,00,000 for invoice INV-2026-0094 via NEFT', timestamp: '2026-09-12 14:32', operator: 'Accounting Desk' },
      { id: 't-2', title: 'Tax Invoice INV-2026-0094 Issued', description: 'Statutory GST B2B invoice generated for Sprint Milestone 3', timestamp: '2026-09-01 10:15', operator: 'Rahul Sen' },
      { id: 't-3', title: 'Invoice Settled in Full', description: 'Invoice INV-2026-0081 cleared with ₹ 4,72,000 RTGS transfer', timestamp: '2026-08-28 16:40', operator: 'Accounting Desk' },
      { id: 't-4', title: 'Client Onboarding Complete', description: 'Corporate coordinates and statutory GSTIN 27AAFCO1234F1Z8 verified', timestamp: '2026-04-12 11:00', operator: 'Rahul Sen' }
    ],
    compliance: {
      gstinValid: true,
      stateCode: '27 (Maharashtra)',
      taxRegime: 'CGST + SGST (Intra-State 18%)',
      lutReference: 'N/A (Domestic B2B)',
      tdsRate: '2.0% (Section 194C / 194J)',
      itcEligible: true
    }
  },
  {
    clientId: 'client-kavita-edu',
    name: 'Kavita Krishnamurthy',
    company: 'Kavita Edutech',
    email: 'kavita@edutech.io',
    phone: '+91 99880 11223',
    category: 'Startup',
    status: 'Active',
    industry: 'Educational Technology & Streaming Modules',
    accountManager: 'Ines Okafor',
    gstNumber: '33AAECK5678K1Z3',
    panNumber: 'AAECK5678K',
    address: '42 Sardar Patel Road, Guindy, Chennai, Tamil Nadu - 600032',
    city: 'Chennai',
    website: 'https://app.kavitaedutech.io',
    logo: '',
    notes: 'Contracted for student portal DRM video encryption modules.',
    createdDate: '2026-05-20',
    financialSummary: {
      totalBilled: 177000,
      totalPaid: 0,
      totalOutstanding: 177000
    },
    contacts: [
      { id: 'ck-1', name: 'Kavita Krishnamurthy', role: 'Founder & CEO', email: 'kavita@edutech.io', phone: '+91 99880 11223', isPrimary: true }
    ],
    websites: [
      { id: 'wk-1', domain: 'app.kavitaedutech.io', status: 'Live', hostingProvider: 'DigitalOcean Bangalore', sslExpiry: '2027-06-15', domainExpiry: '2028-05-20' }
    ],
    credentials: [
      { id: 'crk-1', type: 'Vimeo Video', label: 'Vimeo Pro OTT Video API Channel', loginUrl: 'https://vimeo.com/manage', username: 'dev@edutech.io', password: 'VimeoEdutech$2026', notes: 'API tokens with video upload and domain restriction controls' }
    ],
    projects: [
      { id: 'pk-1', title: 'Offline Video Encryption & Mobile DRM Module', contractValue: 180000, milestonesCompleted: 2, totalMilestones: 2, progress: 100, targetDate: '2026-10-15', leadEngineer: 'Tomás Reyes' }
    ],
    invoices: [
      { id: 'ik-1', invoiceNumber: 'INV-2026-0118', issueDate: '2026-10-01', dueDate: '2026-10-16', totalAmount: 177000, status: 'Sent', taxMode: 'B2C Retail' }
    ],
    payments: [],
    tickets: [],
    documents: [
      { id: 'dk-1', name: 'Non-Disclosure Agreement (NDA) Signed', type: 'PDF', size: '520 KB', uploadedAt: '2026-05-20' }
    ],
    timeline: [
      { id: 'tk-1', title: 'Tax Invoice INV-2026-0118 Sent', description: 'Invoice dispatched for Project Kickoff & UI Prototype', timestamp: '2026-10-01 11:20', operator: 'Ines Okafor' }
    ],
    compliance: {
      gstinValid: true,
      stateCode: '33 (Tamil Nadu)',
      taxRegime: 'IGST (Inter-State 18%)',
      lutReference: 'N/A (Domestic)',
      tdsRate: '2.0% (Standard)',
      itcEligible: true
    }
  },
  {
    clientId: 'client-hyperion-media',
    name: 'Alexander Sterling',
    company: 'Hyperion Media Group',
    email: 'sterling@hyperionmedia.co.uk',
    phone: '+44 20 7946 0912',
    category: 'Enterprise',
    status: 'Active',
    industry: 'Broadcasting & Cross-Border Content Distribution',
    accountManager: 'Rahul Sen',
    gstNumber: 'EXEMPT-EXPORT-LUT',
    panNumber: 'AACCH9912E',
    address: '4th Floor, 80 Strand, London, WC2R 0RL, United Kingdom',
    city: 'London',
    website: 'https://hyperionmedia.co.uk',
    logo: '',
    notes: 'Overseas media company billed under Letter of Undertaking (Zero-rated export tax).',
    createdDate: '2026-03-10',
    financialSummary: {
      totalBilled: 750000,
      totalPaid: 750000,
      totalOutstanding: 0
    },
    contacts: [
      { id: 'ch-1', name: 'Alexander Sterling', role: 'Managing Director', email: 'sterling@hyperionmedia.co.uk', phone: '+44 20 7946 0912', isPrimary: true }
    ],
    websites: [
      { id: 'wh-1', domain: 'cdn.hyperionmedia.co.uk', status: 'Live', hostingProvider: 'AWS Ireland (eu-west-1)', sslExpiry: '2027-08-30', domainExpiry: '2029-03-10' }
    ],
    credentials: [
      { id: 'crh-1', type: 'GitHub', label: 'Hyperion Video Ingestion Core Repo', loginUrl: 'https://github.com/hyperion-media', username: 'aedentek-ci', password: 'ghp_HyperionSecureToken99!', notes: 'Deploy keys for automatic video pipeline builds' }
    ],
    projects: [
      { id: 'ph-1', title: 'Global Video Streaming & Transcoding Engine', contractValue: 750000, milestonesCompleted: 4, totalMilestones: 4, progress: 100, targetDate: '2026-09-20', leadEngineer: 'Rahul Sen' }
    ],
    invoices: [
      { id: 'ih-1', invoiceNumber: 'INV-2026-0102', issueDate: '2026-09-10', dueDate: '2026-09-25', totalAmount: 750000, status: 'Paid', taxMode: 'Export LUT' }
    ],
    payments: [
      { id: 'pmh-1', receiptId: 'REC-2026-0048', paymentDate: '2026-09-22', amount: 750000, paymentChannel: 'SWIFT International Wire', bankReference: 'BARCGB22XXXX098234' }
    ],
    tickets: [],
    documents: [
      { id: 'dh-1', name: 'Letter of Undertaking (LUT) Export Bond Reference', type: 'PDF', size: '1.1 MB', uploadedAt: '2026-03-10' }
    ],
    timeline: [
      { id: 'th-1', title: 'Overseas SWIFT Wire Reconciled', description: 'Received ₹ 7,50,000 for invoice INV-2026-0102 via Barclays SWIFT', timestamp: '2026-09-22 17:10', operator: 'Accounting Desk' }
    ],
    compliance: {
      gstinValid: true,
      stateCode: 'Overseas (UK)',
      taxRegime: 'Export LUT (0% Zero-Rated)',
      lutReference: 'ARN-AD270326001928K',
      tdsRate: '0.0% (Foreign Remittance)',
      itcEligible: true
    }
  }
];

// Helper to get initials
function getInitials(name) {
  if (!name) return 'CL';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// -------------------------------------------------------------------------
// COMPONENT: Client Directory Master View (Companies / Clients)
// -------------------------------------------------------------------------
function ClientDirectoryMaster({ openId }) {
  const scopeRef = useScopeRef();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  // Server-side pagination: the API filters, slices (10 / page) and returns the KPI totals
  const paged = usePaged(API_BASE, { category: activeCategory === 'All' ? '' : activeCategory, q: searchQuery.trim() }, { noun: 'clients' });
  const clients = paged.rows;
  const loading = paged.loading;
  const kpiData = paged.kpis || {};
  const pageOffset = paged.pagination ? paged.pagination.from - 1 : 0;

  // New Client Form State (Path A Direct Registration)
  const [formCompany, setFormCompany] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadClients = () => paged.reload();

  // Client Portfolio CSV Export Engine
  const handleExportCSV = async () => {
    // the export always covers EVERY matching client, not just the visible page
    const all = await apiFetch(`${API_BASE}?category=${activeCategory === 'All' ? '' : activeCategory}&q=${encodeURIComponent(searchQuery.trim())}`);
    const exportList = (all.ok && all.data?.data) || clients;
    const headers = [
      'Client ID',
      'Company Legal Name',
      'Primary Contact',
      'Corporate Email',
      'Phone / Hotline',
      'Category Tier',
      'Statutory GSTIN',
      'City / Region',
      'Total Billed (INR)',
      'Total Paid (INR)',
      'Balance Due (INR)',
      'Account Status'
    ];

    const rows = exportList.map((c) => {
      const summary = c.financialSummary || {};
      return [
        `"${c.clientId || c._id || ''}"`,
        `"${(c.company || '').replace(/"/g, '""')}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${c.category || 'Enterprise'}"`,
        `"${c.gstNumber || 'EXEMPT'}"`,
        `"${(c.city || '').replace(/"/g, '""')}"`,
        summary.totalBilled || 0,
        summary.totalPaid || 0,
        summary.totalOutstanding || 0,
        `"${c.status || 'Active'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `Aedentek_Clients_${activeCategory}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`Client portfolio exported (${exportList.length} accounts)`, { icon: 'download' });
  };

  // Handle Create Client (Path A)
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!formCompany.trim()) {
      alert('Company Legal Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      company: formCompany.trim(),
      name: formContact.trim() || 'Primary Contact',
      email: formEmail.trim(),
      phone: formPhone.trim(),
      category: formCategory,
      gstNumber: formGstin.trim(),
      address: formAddress.trim(),
      city: formCity.trim(),
      website: formWebsite.trim(),
      notes: formNotes.trim()
    };

    const res = await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok && res.data?.data) {
      toast(`Client profile created for ${formCompany}`, { icon: 'check' });
      setShowAddModal(false);
      // Reset form
      setFormCompany('');
      setFormContact('');
      setFormEmail('');
      setFormPhone('');
      setFormGstin('');
      setFormAddress('');
      setFormCity('');
      setFormWebsite('');
      setFormNotes('');
      loadClients();
    } else {
      toast('Failed to save client: ' + (res.error || res.data?.message || 'Server error'), { icon: 'warn' });
    }
    setSaving(false);
  };

  // Filter clients locally if needed
  const filtered = clients;

  // Telemetry comes from the server (whole portfolio), not from the visible page
  const totalCount = kpiData.totalClients || 0;
  const activeCount = kpiData.activeClients || 0;
  const enterpriseCount = kpiData.enterpriseAccounts || 0;
  const smbCount = kpiData.smbAccounts || 0;

  const deleteClientFromList = async (cid, label) => {
    if (!(await window.themedConfirm(`Delete client "${label}"? This removes the client record and all its domains and credentials.`))) return;
    const res = await apiFetch(`${API_BASE}/${cid}`, { method: 'DELETE' });
    if (res.ok) { toast('Client deleted', { icon: 'trash' }); loadClients(); }
    else { toast('Failed to delete client', { icon: 'warn' }); }
  };

  const navigateToClient = (id) => {
    const targetUrl = `/clients/c/${id}`;
    if (window.__navigate) {
      window.__navigate(targetUrl);
    } else {
      history.pushState(null, '', targetUrl);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  return jsxs('div', {
    ref: scopeRef,
    className: 'client-directory-wrap',
    children: [
      // 3.1 Top KPI Metrics & Portfolio Telemetry (Dashboard Bento Style)
      jsxs('div', {
        className: 'kpis',
        style: { marginBottom: 'var(--gap)' },
        children: [
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'cobalt',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'building' }) }),
                  'Total Portfolio'
                ]
              }),
              jsx('b', { className: 'kpi__value', children: totalCount }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: `${activeCount} Active Accounts` }),
                  jsx(StatusPill, { kind: 'good', children: 'Institutional' })
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'citron',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'trophy' }) }),
                  'Enterprise Tier'
                ]
              }),
              jsx('b', { className: 'kpi__value', children: enterpriseCount }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: 'Strategic Accounts' }),
                  jsx('span', { className: 'badge-tier badge-tier--enterprise', children: 'Tier 1' })
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'kpi',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'target' }) }),
                  'SMB & Startup Tier'
                ]
              }),
              jsx('b', { className: 'kpi__value', children: smbCount }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: 'Growth Ventures' }),
                  jsx('span', { className: 'badge-tier badge-tier--startup', children: 'Growth' })
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'kpi',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'finance' }) }),
                  'Portfolio Gross Billed'
                ]
              }),
              jsx('b', { className: 'kpi__value', children: fmtINR(kpiData.totalBilled || 0) }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: 'Lifetime Ledger Demands' })
                ]
              })
            ]
          })
        ]
      }),

      // 3.2 Filterable Master Client List & Live Search in Single Container (Matching Reference Layout)
      jsx(Card, {
        flush: true,
        children: jsxs('div', {
          children: [
            jsxs('div', {
              className: 'toolbar client-master-toolbar',
              style: { padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'nowrap', borderBottom: '1px solid var(--line)', marginBottom: 0 },
              children: [
                jsx(SearchInput, {
                  value: searchQuery,
                  onChange: setSearchQuery,
                  placeholder: 'Search legal company name, contact, email, GSTIN...'
                }),
                jsx('span', { style: { flex: 1 } }),
                jsx('select', {
                  className: 'select client-category-select',
                  value: activeCategory,
                  onChange: (e) => setActiveCategory(e.target.value),
                  style: {
                    height: 38,
                    fontSize: 'var(--fs-xs)',
                    padding: '0 32px 0 12px',
                    borderRadius: 10,
                    background: 'var(--card-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  },
                  children: [
                    jsx('option', { value: 'All', children: 'All Groups' }),
                    jsx('option', { value: 'Enterprise', children: 'Enterprise' }),
                    jsx('option', { value: 'SMB', children: 'SMB' }),
                    jsx('option', { value: 'Startup', children: 'Startup' })
                  ]
                }),
                jsx('div', {
                  style: { display: 'none' },
                  children: ['All', 'Enterprise', 'SMB', 'Startup'].map((cat) =>
                    jsx('button', {
                      type: 'button',
                      className: `chip${activeCategory === cat ? ' is-on' : ''}`,
                      onClick: () => setActiveCategory(cat),
                      children: cat
                    }, cat)
                  )
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
                jsx('button', {
                  type: 'button',
                  className: 'btn btn--primary',
                  style: { height: 38 },
                  onClick: () => go('/clients/new'),
                  children: jsxs('span', {
                    style: { display: 'flex', alignItems: 'center', gap: 6 },
                    children: [jsx(Icon, { name: 'plus' }), 'Register New Client']
                  })
                })
              ]
            }),
            filtered.length
              ? jsx('div', {
                  className: 'table-wrap',
                  children: jsxs('table', {
                    className: 'table cl-table',
                    children: [
                      jsx('thead', {
                        children: jsxs('tr', {
                          children: [
                            jsx('th', { style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center', paddingLeft: 8, paddingRight: 8 }, children: 'S No' }),
                            jsx('th', { style: { width: 70, textAlign: 'center' }, children: 'Logo' }),
                            jsx('th', { style: { width: 110, textAlign: 'center' }, children: 'Customer No' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Customer' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Group of Company' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Branch' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Primary Contact' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Products / Licenses' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Statutory GSTIN' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Total Billed' }),
                            jsx('th', { style: { textAlign: 'center' }, children: 'Balance Due' }),
                            jsx('th', { style: { textAlign: 'center', width: 90 }, children: 'Status' }),
                            jsx('th', { style: { textAlign: 'center', width: 130 }, children: 'Action' })
                          ]
                        })
                      }),
                      jsx('tbody', {
                        children: filtered.map((c, idx) => {
                          const id = c.clientId || c._id || c.id;
                          const summary = c.financialSummary || { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 };
                          const hasDebt = summary.totalOutstanding > 0;
                          return jsxs(
                            'tr',
                            {
                              className: 'is-click',
                              onClick: () => navigateToClient(id),
                              children: [
                                jsx('td', {
                                  style: { width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center', paddingLeft: 8, paddingRight: 8, verticalAlign: 'middle' },
                                  children: jsx('span', {
                                    className: `sno-pill ${idx + pageOffset < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`,
                                    children: idx + pageOffset + 1
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('img', {
                                    src: c.logo || ('data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#e0e7ff"/><path d="M12 31V11a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6h3a1 1 0 0 1 1 1v13h-4v-5h-2v5zm4-17v3h2v-3zm0 6v3h2v-3zm0 6v3h2v-3zm10-3v3h2v-3z" fill="#4f46e5"/></svg>')),
                                    alt: (c.company || 'Client') + ' logo',
                                    style: { width: 38, height: 38, borderRadius: 10, objectFit: 'contain', display: 'block', margin: '0 auto' }
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('span', {
                                    style: {
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                      fontSize: 'var(--fs-xs)',
                                      background: 'var(--card-2)',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      border: '1px solid var(--line)',
                                      color: 'var(--primary)',
                                      display: 'inline-block'
                                    },
                                    children: c.clientCode || 'CLI-' + String(idx + pageOffset + 1).padStart(3, '0')
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('b', {
                                    style: { fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)' },
                                    children: c.company
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('span', {
                                    className: `badge-tier badge-tier--${(c.category || 'smb').toLowerCase()}`,
                                    style: { margin: '0 auto', display: 'inline-flex' },
                                    children: c.category || 'SMB'
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', fontSize: 'var(--fs-sm)', verticalAlign: 'middle' },
                                  children: c.address?.city || c.city || 'Bengaluru'
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', fontSize: 'var(--fs-sm)', fontWeight: 500, verticalAlign: 'middle' },
                                  children: c.primaryContact?.name || c.contactPerson || c.name || '—'
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('span', {
                                    style: {
                                      fontSize: 'var(--fs-xs)',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      background: 'var(--card-2)',
                                      border: '1px solid var(--line)',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-block'
                                    },
                                    children: c.industry || 'Cloud & Enterprise'
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('span', {
                                    style: { fontFamily: 'monospace', fontWeight: 600, fontSize: 'var(--fs-xs)', display: 'inline-block' },
                                    children: c.gstNumber || 'EXEMPT'
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', fontWeight: 600, fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap', verticalAlign: 'middle' },
                                  children: fmtINR(summary.totalBilled)
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('div', {
                                    style: { display: 'flex', justifyContent: 'center' },
                                    children: jsx(StatusPill, {
                                      kind: hasDebt ? 'warn' : 'good',
                                      children: hasDebt ? `Due: ${fmtINR(summary.totalOutstanding)}` : 'Zero Debt'
                                    })
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsx('div', {
                                    style: { display: 'flex', justifyContent: 'center' },
                                    children: jsx(StatusPill, {
                                      kind: c.status === 'Active' ? 'good' : 'warn',
                                      children: c.status || 'Active'
                                    })
                                  })
                                }),
                                jsx('td', {
                                  style: { textAlign: 'center', verticalAlign: 'middle' },
                                  children: jsxs('div', { style: { display: 'inline-flex', gap: 6 }, children: [
                                  jsx('button', {
                                    type: 'button',
                                    className: 'action-btn action-btn--view',
                                    title: 'Open 360°',
                                    'aria-label': 'Open 360°',
                                    onClick: (e) => {
                                      e.stopPropagation();
                                      navigateToClient(id);
                                    },
                                    children: jsx(Icon, { name: 'eye' })
                                  }),
                                  jsx('button', {
                                    type: 'button',
                                    className: 'action-btn action-btn--edit',
                                    title: 'Edit Client',
                                    'aria-label': 'Edit Client',
                                    onClick: (e) => { e.stopPropagation(); navigateToClient(id + '?edit=1'); },
                                    children: jsx(Icon, { name: 'edit' })
                                  }),
                                  jsx('button', {
                                    type: 'button',
                                    className: 'action-btn action-btn--delete',
                                    title: 'Delete Client',
                                    'aria-label': 'Delete Client',
                                    onClick: (e) => { e.stopPropagation(); deleteClientFromList(id, c.company || c.name); },
                                    children: jsx(Icon, { name: 'trash' })
                                  })
                                  ] })
                                })
                              ]
                            },
                            id
                          );
                        })
                      })
                    ]
                  })
                })
              : jsx('div', {
                  style: { padding: '32px 20px', textAlign: 'center' },
                  children: jsx(EmptyState, {
                    icon: 'building',
                    title: 'No clients found',
                    text: 'Try adjusting your search criteria or register a new client.'
                  })
                }),
            paged.pager
          ]
        })
      }),

      // Direct Registration Modal (Path A)
      showAddModal &&
        jsx('div', {
          className: 'scrim',
          style: {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000
          },
          onClick: () => setShowAddModal(false),
          children: jsxs('div', {
            className: 'card',
            style: { width: '100%', maxWidth: 580, padding: 24, margin: 20 },
            onClick: (e) => e.stopPropagation(),
            children: [
              jsxs('header', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
                children: [
                  jsxs('div', {
                    children: [
                      jsx('h2', { style: { fontSize: 'var(--fs-xl)', fontWeight: 700 }, children: 'Register New Client' }),
                      jsx('p', {
                        style: { color: 'var(--muted)', fontSize: 'var(--fs-sm)' },
                        children: 'Add legal corporate coordinates and primary contact person.'
                      })
                    ]
                  }),
                  jsx('button', {
                    type: 'button',
                    className: 'ibtn ibtn--bare',
                    onClick: () => setShowAddModal(false),
                    children: jsx(Icon, { name: 'x' })
                  })
                ]
              }),
              jsxs('form', {
                onSubmit: handleCreateClient,
                children: [
                  jsxs('div', {
                    className: 'form-grid',
                    children: [
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'Company Legal Name *' }),
                          jsx('input', {
                            className: 'input',
                            required: true,
                            value: formCompany,
                            onChange: (e) => setFormCompany(e.target.value),
                            placeholder: 'e.g. Acme Technologies Private Limited'
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Primary Contact Full Name *' }),
                          jsx('input', {
                            className: 'input',
                            required: true,
                            value: formContact,
                            onChange: (e) => setFormContact(e.target.value),
                            placeholder: ''
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Official Corporate Email *' }),
                          jsx('input', {
                            className: 'input',
                            type: 'email',
                            required: true,
                            value: formEmail,
                            onChange: (e) => setFormEmail(e.target.value),
                            placeholder: ''
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Phone / Hotline *' }),
                          jsx('input', {
                            className: 'input',
                            required: true,
                            value: formPhone,
                            onChange: (e) => setFormPhone(e.target.value),
                            placeholder: ''
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Category Tier' }),
                          jsxs('select', {
                            className: 'select',
                            value: formCategory,
                            onChange: (e) => setFormCategory(e.target.value),
                            children: [
                              jsx('option', { value: '', children: 'Select category…' }),
                              jsx('option', { value: 'Enterprise', children: 'Enterprise' }),
                              jsx('option', { value: 'SMB', children: 'SMB' }),
                              jsx('option', { value: 'Startup', children: 'Startup' })
                            ]
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Statutory GSTIN (15-char)' }),
                          jsx('input', {
                            className: 'input',
                            value: formGstin,
                            onChange: (e) => setFormGstin(e.target.value.toUpperCase()),
                            placeholder: ''
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'City / Region' }),
                          jsx('input', {
                            className: 'input',
                            value: formCity,
                            onChange: (e) => setFormCity(e.target.value),
                            placeholder: ''
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'Website URL' }),
                          jsx('input', {
                            className: 'input',
                            value: formWebsite,
                            onChange: (e) => setFormWebsite(e.target.value),
                            placeholder: ''
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'Corporate HQ Street Address' }),
                          jsx('textarea', {
                            className: 'input',
                            rows: 2,
                            value: formAddress,
                            onChange: (e) => setFormAddress(e.target.value),
                            placeholder: 'Suite 402, Trade Centre, BKC, Mumbai 400051'
                          })
                        ]
                      })
                    ]
                  }),
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
                    children: [
                      jsx('button', {
                        type: 'button',
                        className: 'btn btn--ghost',
                        onClick: () => setShowAddModal(false),
                        children: 'Cancel'
                      }),
                      jsx('button', {
                        type: 'submit',
                        className: 'btn btn--primary',
                        disabled: saving,
                        children: saving ? 'Registering...' : 'Register Client'
                      })
                    ]
                  })
                ]
              })
            ]
          })
        })
    ]
  });
}

// -------------------------------------------------------------------------
// COMPONENT: Client 360° Command Center View (`me`)
// -------------------------------------------------------------------------
function Client360CommandCenter({ id }) {
  const scopeRef = useScopeRef();
  const [client, setClient] = useState(() => {
    return DEFAULT_CLIENTS.find((c) => c.clientId === id || c._id === id || c.id === id) || DEFAULT_CLIENTS[0];
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('General');

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddWebsiteModal, setShowAddWebsiteModal] = useState(false);
  const [showAddCredModal, setShowAddCredModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  // --- Service types (active only), projects, contracts, invoice filter ---
  const [serviceTypes, setServiceTypes] = useState([]);
  const [projModal, setProjModal] = useState(null); // { id?, ...form }
  const [docModal, setDocModal] = useState(null); // { id?, ...form }
  const [invProjFilter, setInvProjFilter] = useState('all');
  const [formErr, setFormErr] = useState('');
  // --- Server-side paginated tables (10 per page) ---
  const [billStatus, setBillStatus] = useState('All');
  const lists = {
    websites: usePaged(`${API_BASE}/${id}/lists/websites`, {}, { enabled: activeTab === 'Websites', noun: 'domains' }),
    credentials: usePaged(`${API_BASE}/${id}/lists/credentials`, {}, { enabled: activeTab === 'Credentials', noun: 'logins' }),
    projects: usePaged(`${API_BASE}/${id}/lists/projects`, {}, { enabled: activeTab === 'Projects', noun: 'projects' }),
    invoices: usePaged(`${API_BASE}/${id}/lists/invoices`, { projectId: invProjFilter === 'all' ? '' : invProjFilter }, { enabled: activeTab === 'Invoices', noun: 'invoices' }),
    payments: usePaged(`${API_BASE}/${id}/lists/payments`, {}, { enabled: activeTab === 'Payments', noun: 'payments' }),
    documents: usePaged(`${API_BASE}/${id}/lists/documents`, {}, { enabled: activeTab === 'Documents', noun: 'contracts' })
  };
  const billing = usePaged(`${API_BASE}/${id}/billing`, { status: billStatus === 'All' ? '' : billStatus }, { enabled: activeTab === 'Billing', noun: 'months' });
  const reloadListsRef = useRef(() => {});
  reloadListsRef.current = () => { Object.values(lists).forEach((l) => l.reload()); billing.reload(); };
  const [billForm, setBillForm] = useState({ amount: '', gstMode: 'Without GST', gstRate: 18 });
  const [billModal, setBillModal] = useState(null);
  const [timelineId, setTimelineId] = useState(null);
  const [activeStages, setActiveStages] = useState([]);
  useEffect(() => {
    const s = billing.body && billing.body.settings;
    if (s) setBillForm({ amount: s.amount || '', gstMode: s.gstMode || 'Without GST', gstRate: s.gstRate ?? 18 });
  }, [billing.body && billing.body.settings && JSON.stringify(billing.body.settings)]);
  useEffect(() => {
    apiFetch('/api/project-stages?status=Active').then((r) => { if (r.ok) setActiveStages(r.data.data || []); });
  }, []);


  // Password eye toggle state: set of credential IDs revealed
  const [revealedPasswords, setRevealedPasswords] = useState({});

  // Form states for modals
  const [editForm, setEditForm] = useState({});
  const [editWebId, setEditWebId] = useState(null);
  const [editCredId, setEditCredId] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const [newHosting, setNewHosting] = useState('AWS Cloud');
  const [newSslExpiry, setNewSslExpiry] = useState('');
  const [newCredType, setNewCredType] = useState('AWS Cloud');
  const [newCredLabel, setNewCredLabel] = useState('');
  const [newCredUrl, setNewCredUrl] = useState('');
  const [newCredUser, setNewCredUser] = useState('');
  const [newCredPass, setNewCredPass] = useState('');
  const [newCredNotes, setNewCredNotes] = useState('');

  // Load client details from backend
  const loadClientDetails = async () => {
    setLoading(true);
    const res = await apiFetch(`${API_BASE}/${id}`);
    if (res.ok && res.data?.data) {
      setClient(res.data.data);
      setEditForm(res.data.data);
      if (/[?&]edit=1/.test(window.location.search)) {
        go('/clients/edit/' + (res.data.data.clientId || id));
        try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}
      }
    }
    setLoading(false);
    reloadListsRef.current();
  };

  useEffect(() => {
    loadClientDetails();
  }, [id]);

  // Copy to clipboard helper
  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard!`, { icon: 'check' });
  };

  // Toggle reveal password
  const toggleReveal = (credId) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [credId]: !prev[credId]
    }));
  };

  // Handle Edit Profile Save
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      toast('Corporate profile updated successfully', { icon: 'check' });
      setShowEditProfileModal(false);
      loadClientDetails();
    } else {
      toast('Failed to update profile: ' + (res.error || res.data?.message), { icon: 'warn' });
    }
  };

  // Handle Add Domain
  const handleAddWebsite = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    const editing = !!editWebId;
    const res = await apiFetch(editing ? `${API_BASE}/${id}/websites/${editWebId}` : `${API_BASE}/${id}/websites`, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify({
        domain: newDomain.trim(),
        ...(editing ? {} : { status: 'Live' }),
        hostingProvider: newHosting,
        sslExpiry: newSslExpiry || '2027-12-31'
      })
    });
    if (res.ok) {
      toast(editing ? `Domain ${newDomain} updated` : `Domain ${newDomain} added to cloud inventory`, { icon: 'check' });
      setShowAddWebsiteModal(false);
      setEditWebId(null);
      setNewDomain('');
      loadClientDetails();
    } else {
      toast(editWebId ? 'Failed to update domain' : 'Failed to add domain', { icon: 'warn' });
    }
  };

  // Handle Delete Website
  const handleDeleteWebsite = async (webId) => {
    if (!(await window.themedConfirm('Are you sure you want to remove this domain?'))) return;
    const res = await apiFetch(`${API_BASE}/${id}/websites/${webId}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Domain removed from catalog', { icon: 'trash' });
      loadClientDetails();
    }
  };

  // Handle Add Credential
  const handleAddCredential = async (e) => {
    e.preventDefault();
    if (!newCredLabel.trim() || !newCredUser.trim()) return;
    const editingCred = !!editCredId;
    const res = await apiFetch(editingCred ? `${API_BASE}/${id}/credentials/${editCredId}` : `${API_BASE}/${id}/credentials`, {
      method: editingCred ? 'PUT' : 'POST',
      body: JSON.stringify({
        type: newCredType,
        label: newCredLabel.trim(),
        loginUrl: newCredUrl.trim(),
        username: newCredUser.trim(),
        password: newCredPass.trim(),
        notes: newCredNotes.trim()
      })
    });
    if (res.ok) {
      toast(editingCred ? 'Credential updated' : 'Login credential saved', { icon: 'lock' });
      setShowAddCredModal(false);
      setEditCredId(null);
      setNewCredLabel('');
      setNewCredUser('');
      setNewCredPass('');
      loadClientDetails();
    } else {
      toast(editCredId ? 'Failed to update credential' : 'Failed to store credential', { icon: 'warn' });
    }
  };

  // Handle Delete Credential
  const handleDeleteCredential = async (credId) => {
    if (!(await window.themedConfirm('Are you sure you want to delete this login credential?'))) return;
    const res = await apiFetch(`${API_BASE}/${id}/credentials/${credId}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Login credential deleted', { icon: 'trash' });
      loadClientDetails();
    }
  };

  // Handle Delete Client
  const handleDeleteClient = async () => {
    const res = await apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast(`Client ${client.company} deleted`, { icon: 'trash' });
      if (window.__navigate) {
        window.__navigate('/clients/companies');
      } else {
        history.pushState(null, '', '/clients/companies');
        window.dispatchEvent(new Event('popstate'));
      }
    } else {
      toast('Failed to delete client', { icon: 'warn' });
    }
  };

  const summary = client.financialSummary || { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 };
  const hasDebt = summary.totalOutstanding > 0;

  // Active service types feed the Login Credentials dropdown
  useEffect(() => {
    apiFetch('/api/service-types?status=Active').then((r) => { if (r.ok) setServiceTypes(r.data.data || []); });
  }, []);

  const projects = client.projects || [];
  const invoicesOf = (pid) => (client.invoices || []).filter((i) => i.projectId === pid);
  const projectName = (pid) => (projects.find((p) => p.id === pid) || {}).title;

  // paged rows with a continuing S No across pages
  const __rowsP = (pg, colSpan, icon, title, text, fn) => {
    const off = pg.pagination ? pg.pagination.from - 1 : 0;
    return __rows(pg.rows, colSpan, icon, title, text, (x, i) => fn(x, i + off));
  };
  const withPager = (pg, node) => jsxs(Fragment, { children: [node, pg.pager ? jsx('div', { className: 'pager-slot', children: pg.pager }) : null] });

  // ---- Project stage selection / timeline
  const stageOptionsFor = (modal) => {
    const current = (modal && modal.id ? (projects.find((p) => p.id === modal.id) || {}).stages : []) || [];
    const extra = current.filter((st) => !activeStages.some((a) => a._id === st.stageId)).map((st) => ({ _id: st.stageId, name: st.name + ' (inactive)', sequence: st.order, inactive: true }));
    return [...activeStages, ...extra];
  };
  const toggleStage = (sid) => setProjModal((m) => ({ ...m, stageIds: m.stageIds.includes(sid) ? m.stageIds.filter((x) => x !== sid) : [...m.stageIds, sid] }));
  const timelineProject = projects.find((p) => p.id === timelineId) || null;
  const updateStageEntry = async (projId, entryId, body) => {
    const res = await apiFetch(`${API_BASE}/${id}/projects/${projId}/stages/${entryId}`, { method: 'PUT', body: JSON.stringify(body) });
    if (res.ok) { await loadClientDetails(); } else toast(res.data?.message || 'Failed to update stage', { icon: 'warn' });
  };
  const removeStageEntry = async (projId, entryId) => {
    const res = await apiFetch(`${API_BASE}/${id}/projects/${projId}/stages/${entryId}`, { method: 'DELETE' });
    if (res.ok) { toast('Stage removed from project', { icon: 'trash' }); await loadClientDetails(); } else toast('Failed to remove stage', { icon: 'warn' });
  };
  const addStageEntry = async (projId, stageId) => {
    if (!stageId) return;
    const res = await apiFetch(`${API_BASE}/${id}/projects/${projId}/stages`, { method: 'POST', body: JSON.stringify({ stageId }) });
    if (res.ok) { toast('Stage added to project', { icon: 'check' }); await loadClientDetails(); } else toast(res.data?.message || 'Failed to add stage', { icon: 'warn' });
  };

  // ---- Agreement monthly billing
  const monthLabelOf = (m) => {
    const [y, mo] = String(m || '').split('-');
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(mo) - 1] + ' ' + y;
  };
  const billPreview = (() => {
    const a = Number(billForm.amount) || 0;
    const gst = billForm.gstMode === 'With GST' ? Math.round(a * (Number(billForm.gstRate) || 0)) / 100 : 0;
    return { base: a, gst, total: Math.round((a + gst) * 100) / 100 };
  })();
  const saveBillingSettings = async (e) => {
    if (e) e.preventDefault();
    setFormErr('');
    const res = await apiFetch(`${API_BASE}/${id}/billing`, { method: 'PUT', body: JSON.stringify({ amount: Number(billForm.amount) || 0, gstMode: billForm.gstMode, gstRate: Number(billForm.gstRate) || 0 }) });
    if (res.ok) { toast('Monthly billing saved — schedule generated', { icon: 'check' }); await loadClientDetails(); }
    else setFormErr(res.data?.message || res.error || 'Failed to save billing');
  };
  const clearBillingSettings = async () => {
    if (!(await window.themedConfirm('Clear the monthly billing setup? Unpaid months will be removed (paid months are kept).'))) return;
    const res = await apiFetch(`${API_BASE}/${id}/billing`, { method: 'DELETE' });
    if (res.ok) { toast('Monthly billing cleared', { icon: 'trash' }); await loadClientDetails(); }
  };
  const setBillRowStatus = async (row, status) => {
    const res = await apiFetch(`${API_BASE}/${id}/billing/rows/${row.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (res.ok) { toast(status === 'Paid' ? `${monthLabelOf(row.month)} marked as paid` : `${monthLabelOf(row.month)} marked as pending`, { icon: 'check' }); await loadClientDetails(); }
    else toast(res.data?.message || 'Failed to update', { icon: 'warn' });
  };
  const saveBillRow = async (e) => {
    e.preventDefault();
    const m = billModal;
    setFormErr('');
    const body = { baseAmount: Number(m.baseAmount), dueDate: m.dueDate, notes: m.notes };
    if (!(Number(m.baseAmount) >= 0) || m.baseAmount === '') { setFormErr('Amount must be 0 or more'); return; }
    let res;
    if (m.id) res = await apiFetch(`${API_BASE}/${id}/billing/rows/${m.id}`, { method: 'PUT', body: JSON.stringify(body) });
    else {
      if (!/^\d{4}-\d{2}$/.test(m.month || '')) { setFormErr('Pick the billing month'); return; }
      res = await apiFetch(`${API_BASE}/${id}/billing/rows`, { method: 'POST', body: JSON.stringify({ ...body, month: m.month }) });
    }
    if (res.ok) { toast(m.id ? 'Billing month updated' : 'Billing month added', { icon: 'check' }); setBillModal(null); await loadClientDetails(); }
    else setFormErr(res.data?.message || res.error || 'Failed to save');
  };
  const deleteBillRow = async (row) => {
    if (!(await window.themedConfirm(`Delete the ${monthLabelOf(row.month)} billing month?`))) return;
    const res = await apiFetch(`${API_BASE}/${id}/billing/rows/${row.id}`, { method: 'DELETE' });
    if (res.ok) { toast('Billing month deleted', { icon: 'trash' }); await loadClientDetails(); }
  };

  const blankProj = { title: '', description: '', contractValue: 0, totalMilestones: 1, milestonesCompleted: 0, leadEngineer: '', startDate: '', targetDate: '', status: 'Planning', stageIds: [] };
  const openProjModal = (p) => {
    setFormErr('');
    setProjModal(p ? { id: p.id, title: p.title || '', description: p.description || '', contractValue: p.contractValue ?? 0, totalMilestones: p.totalMilestones || 1, milestonesCompleted: p.milestonesCompleted || 0, leadEngineer: p.leadEngineer || '', startDate: p.startDate || '', targetDate: p.targetDate || '', status: p.status || 'In Progress', stageIds: [...(p.stages || [])].sort((a, b) => a.order - b.order).map((st) => st.stageId) } : { ...blankProj });
  };
  const saveProject = async (e) => {
    e.preventDefault();
    const m = projModal;
    if (!m.title.trim()) { setFormErr('Project title is required'); return; }
    if (Number(m.milestonesCompleted) > Number(m.totalMilestones)) { setFormErr('Completed milestones cannot exceed total milestones'); return; }
    if (m.startDate && m.targetDate && m.targetDate < m.startDate) { setFormErr('Target date cannot be before the start date'); return; }
    const res = await apiFetch(m.id ? `${API_BASE}/${id}/projects/${m.id}` : `${API_BASE}/${id}/projects`, {
      method: m.id ? 'PUT' : 'POST',
      body: JSON.stringify({ ...m, id: undefined, title: m.title.trim(), contractValue: Number(m.contractValue) || 0, totalMilestones: Number(m.totalMilestones) || 1, milestonesCompleted: Number(m.milestonesCompleted) || 0 })
    });
    if (res.ok) { toast(m.id ? 'Project updated' : 'Project created', { icon: 'check' }); setProjModal(null); loadClientDetails(); }
    else setFormErr(res.data?.message || res.error || 'Failed to save project');
  };
  const deleteProject = async (p) => {
    if (!(await window.themedConfirm(`Delete project "${p.title}"? Linked invoices will be unassigned.`))) return;
    const res = await apiFetch(`${API_BASE}/${id}/projects/${p.id}`, { method: 'DELETE' });
    if (res.ok) { toast('Project deleted', { icon: 'trash' }); loadClientDetails(); }
    else toast('Failed to delete project', { icon: 'warn' });
  };
  const linkInvoice = async (invId, projectId) => {
    const res = await apiFetch(`${API_BASE}/${id}/invoices/${invId}`, { method: 'PUT', body: JSON.stringify({ projectId }) });
    if (res.ok) { toast(projectId ? 'Invoice linked to project' : 'Invoice unlinked', { icon: 'check' }); loadClientDetails(); }
    else toast('Failed to link invoice', { icon: 'warn' });
  };

  const blankDoc = { name: '', category: 'MSA', startDate: '', endDate: '', notes: '', data: '', fileName: '', size: '', type: 'PDF' };
  const openDocModal = (d) => {
    setFormErr('');
    setDocModal(d ? { id: d.id, name: d.name || '', category: d.category || 'Other', startDate: d.startDate || '', endDate: d.endDate || '', notes: d.notes || '', data: '', fileName: d.data || d.hasFile ? 'Existing file attached' : '', size: d.size || '', type: d.type || 'PDF', hadData: !!(d.data || d.hasFile) } : { ...blankDoc });
  };
  const onDocFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFormErr('File must be smaller than 5 MB'); return; }
    setFormErr('');
    const data = await readFileAsDataUrl(file);
    setDocModal((m) => ({ ...m, data, fileName: file.name, size: fmtBytes(file.size), type: (file.name.split('.').pop() || 'FILE').toUpperCase(), name: m.name || file.name.replace(/\.[^.]+$/, '') }));
  };
  const saveDoc = async (e) => {
    e.preventDefault();
    const m = docModal;
    if (!m.name.trim()) { setFormErr('Contract name is required'); return; }
    if (m.startDate && m.endDate && m.endDate < m.startDate) { setFormErr('End date cannot be before the start date'); return; }
    const body = { name: m.name.trim(), category: m.category, startDate: m.startDate, endDate: m.endDate, notes: m.notes, type: m.type };
    if (m.data) { body.data = m.data; body.size = m.size; }
    const res = await apiFetch(m.id ? `${API_BASE}/${id}/documents/${m.id}` : `${API_BASE}/${id}/documents`, { method: m.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    if (res.ok) { toast(m.id ? 'Contract updated' : 'Contract added', { icon: 'check' }); setDocModal(null); loadClientDetails(); }
    else setFormErr(res.data?.message || res.error || 'Failed to save contract');
  };
  const deleteDoc = async (d) => {
    if (!(await window.themedConfirm(`Delete contract "${d.name}"?`))) return;
    const res = await apiFetch(`${API_BASE}/${id}/documents/${d.id}`, { method: 'DELETE' });
    if (res.ok) { toast('Contract deleted', { icon: 'trash' }); loadClientDetails(); }
    else toast('Failed to delete contract', { icon: 'warn' });
  };
  const downloadDoc = (d) => {
    const full = (client.documents || []).find((x) => x.id === d.id) || d;
    if (full.data) downloadDataUrl(full.data, d.name + (/\.[A-Za-z0-9]+$/.test(d.name) ? '' : '.' + String(d.type || 'pdf').toLowerCase()));
    else toast('No file attached to this contract yet — edit it to upload one', { icon: 'warn' });
  };


  // 11 Sub-Module Tabs Configuration
  const __rows = (list, colSpan, icon, title, text, fn) =>
    list.length
      ? list.map(fn)
      : [jsx('tr', { className: 'cd-empty-row', children: jsx('td', { colSpan, className: 'cd-empty-td', children: jsx(EmptyState, { icon, title, text }) }) }, 'empty')];

  const TABS = [
    { id: 'General', label: 'General' },
    { id: 'Websites', label: 'Websites' },
    { id: 'Social', label: 'Social' },
    { id: 'Credentials', label: 'Login Credentials' },
    { id: 'Projects', label: 'Projects' },
    { id: 'Invoices', label: 'Invoices' },
    { id: 'Payments', label: 'Payments' },
    { id: 'Billing', label: 'Monthly Billing' },
    { id: 'Documents', label: 'Contracts' },
  ];

  // Active-tab underline — mirrors the shared Settings section bar behaviour.
  // The shared helper is not exported from the ui bundle, so it is reproduced
  // here against the same GSAP instance (imported as `Pt`).
  const tabsRef = useRef(null);

  useLayoutEffect(() => {
    const nav = tabsRef.current;
    if (!nav) return undefined;
    const bar = nav.querySelector('.tabs__bar');
    if (!bar) return undefined;

    const place = (animate) => {
      const active = nav.querySelector('.tab.is-active');
      if (!active) {
        gsap.set(bar, { opacity: 0 });
        return;
      }
      const props = { x: active.offsetLeft, scaleX: active.offsetWidth, opacity: 1 };
      if (animate) gsap.to(bar, { ...props, duration: 0.5, ease: 'expo.out' });
      else gsap.set(bar, props);
    };

    place(false);
    const ro = new ResizeObserver(() => place(false));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activeTab]);

  return jsxs('div', {
    className: 'page td',
    ref: scopeRef,
    children: [
      // 1. Single Unified Top Header Container (Matching Dashboard Theme)
      jsx(PageHeader, {
        crumbs: [
          { label: 'Clients', href: '/clients/companies' },
          { label: client.company || 'Client 360°' }
        ],
        title: client.company || 'Client 360°',
        sub: `${client.category ? `[${client.category}] ` : ''}${client.industry || 'Technology & Enterprise Solutions'} · Primary: ${client.name || 'Primary Contact'} · GSTIN: ${client.gstNumber || 'EXEMPT'} · ${client.city || 'HQ'}`
      }),

      // 2. Sub-Module Navigation Tabs — placed immediately after the page header
      // so the global `.phead + .tabs` / `.phead:has(+ .tabs)` rules merge the
      // header and the section bar into a single container, exactly as the
      // Settings page renders its section navigation.
      jsxs('nav', {
        className: 'tabs',
        ref: tabsRef,
        role: 'tablist',
        'aria-label': 'Client sections',
        children: [
          TABS.map((t) =>
            jsx(
              'button',
              {
                type: 'button',
                role: 'tab',
                key: t.id,
                'aria-selected': activeTab === t.id,
                className: `tab${activeTab === t.id ? ' is-active' : ''}`,
                onClick: () => setActiveTab(t.id),
                children: t.label
              },
              t.id
            )
          ),
          jsx('i', { className: 'tabs__bar', 'aria-hidden': 'true' })
        ]
      }),

      // 3. Bento KPI Cards (Matching Dashboard Theme)
      jsxs('div', {
        className: 'kpis',
        style: { marginBottom: 'var(--gap)' },
        children: [
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'cobalt',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'trophy' }) }),
                  'Total Invoiced'
                ]
              }),
              jsx('b', { className: 'kpi__value', children: fmtINR(summary.totalBilled) }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                                    jsx('span', { children: 'Gross Billed' })
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'kpi',
            'data-tone': 'citron',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'target' }) }),
                  'Total Paid'
                ]
              }),
              jsx('b', { className: 'kpi__value', children: fmtINR(summary.totalPaid) }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: `${(client.payments || []).length} settlements` }),
                  jsx(StatusPill, { kind: 'good', children: 'Reconciled' })
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'kpi',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'finance' }) }),
                  'Balance Due'
                ]
              }),
              jsx('b', {
                className: 'kpi__value',
                style: { color: hasDebt ? 'var(--amber, #f59e0b)' : 'var(--text)' },
                children: fmtINR(summary.totalOutstanding)
              }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: hasDebt ? 'Unsettled Exposure' : 'Fully Settled' }),
                  jsx(StatusPill, {
                    kind: hasDebt ? 'warn' : 'good',
                    children: hasDebt ? 'Debt Warning' : 'Zero Debt'
                  })
                ]
              })
            ]
          }),
          jsxs('div', {
            className: 'kpi',
            'data-tile': '',
            children: [
              jsxs('span', {
                className: 'kpi__label',
                children: [
                  jsx('span', { className: 'kpi__icon', children: jsx(Icon, { name: 'user' }) }),
                  'Account Lead'
                ]
              }),
              jsx('b', { className: 'kpi__value', style: { fontSize: 'var(--fs-xl)' }, children: client.accountManager || 'Rahul Sen' }),
              jsxs('span', {
                className: 'kpi__foot',
                children: [
                  jsx('span', { children: client.city ? `HQ: ${client.city}` : 'Institutional' }),
                  jsx('span', { className: `badge-tier badge-tier--${(client.category || 'enterprise').toLowerCase()}`, children: client.category || 'Enterprise' })
                ]
              })
            ]
          })
        ]
      }),

      // TAB 1: General & Corporate Coordinates
      activeTab === 'General' &&
        jsxs('div', {
          style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20 },
          children: [
            jsx(Card, {
              title: 'Corporate Coordinates',
              sub: 'Official company registration, tax identifiers, and headquarters.',
              tools: jsxs('div', {
                style: { display: 'flex', gap: 8 },
                children: [
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--sm',
                    title: 'Edit Profile',
                    onClick: () => go('/clients/edit/' + (client.clientId || id)),
                    children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'edit' }), 'Edit Profile'] })
                  }),
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--sm btn--ghost',
                    style: { color: 'var(--red, #ef4444)' },
                    title: 'Delete Client Record',
                    onClick: () => setShowDeleteModal(true),
                    children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'trash' }), 'Delete'] })
                  })
                ]
              }),
              children: jsxs('div', {
                className: 'cd-grid',
                children: [
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'COMPANY LEGAL NAME' }),
                      jsx('div', { className: 'cd-value', children: client.company })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'CATEGORY TIER' }),
                      jsx('div', { className: 'cd-value', children: client.category })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'STATUTORY GSTIN' }),
                      jsx('div', { className: 'cd-value cd-mono', children: client.gstNumber || 'EXEMPT' })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'INCOME TAX PAN' }),
                      jsx('div', { className: 'cd-value cd-mono', children: client.panNumber || '—' })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'OFFICIAL CORPORATE EMAIL' }),
                      jsx('div', { className: 'cd-value', children: client.email || '—' })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'HOTLINE / PHONE' }),
                      jsx('div', { className: 'cd-value', children: client.phone || '—' })
                    ]
                  }),
                  jsxs('div', {
                    className: 'span-2',
                    style: { gridColumn: 'span 2' },
                    children: [
                      jsx('small', { className: 'cd-label', children: 'REGISTERED HQ ADDRESS' }),
                      jsx('div', { className: 'cd-value', children: client.address || '—' })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'CITY / REGION' }),
                      jsx('div', { className: 'cd-value', children: client.city || '—' })
                    ]
                  }),
                  jsxs('div', {
                    children: [
                      jsx('small', { className: 'cd-label', children: 'ACCOUNT MANAGER' }),
                      jsx('div', { className: 'cd-value', children: client.accountManager || 'Rahul Sen' })
                    ]
                  })
                ]
              })
            }),
            jsx(Card, {
              title: 'Primary Contact Person',
              sub: 'Authorized signatory and primary executive.',
              children: jsxs('div', {
                style: { padding: '10px 0' },
                children: [
                  jsxs('div', {
                    className: 'cd-person',
                    children: [
                      jsx(UserAvatar, { name: client.name, size: 48 }),
                      jsxs('div', {
                        children: [
                          jsx('b', { style: { fontSize: 'var(--fs-lg)' }, children: client.name }),
                          jsx('div', { style: { color: 'var(--muted)', fontSize: 'var(--fs-sm)' }, children: 'Authorized Signatory & Lead' })
                        ]
                      })
                    ]
                  }),
                  jsxs('div', {
                    className: 'cd-rows',
                    children: [
                      jsxs('div', {
                        className: 'cd-row',
                        children: [
                          jsx('span', { className: 'cd-row__k', children: 'Email' }),
                          jsx('span', { className: 'cd-row__v', children: client.email })
                        ]
                      }),
                      jsxs('div', {
                        className: 'cd-row',
                        children: [
                          jsx('span', { className: 'cd-row__k', children: 'Phone' }),
                          jsx('span', { className: 'cd-row__v', children: client.phone })
                        ]
                      }),
                      jsxs('div', {
                        className: 'cd-row',
                        children: [
                          jsx('span', { className: 'cd-row__k', children: 'Onboarded' }),
                          jsx('span', { className: 'cd-row__v', children: client.createdDate ? String(client.createdDate).slice(0, 10) : '2026-04-12' })
                        ]
                      })
                    ]
                  })
                ]
              })
            }),
            jsx('div', {
              style: { gridColumn: '1 / -1' },
              children: jsx(Card, {
                title: 'Agreement & Validity',
                sub: 'Agreement period with automatic duration, elapsed and remaining-day calculation.',
                tools: jsx('button', { type: 'button', className: 'btn btn--sm', onClick: () => go('/clients/edit/' + (client.clientId || id)), children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'edit' }), 'Edit Agreement'] }) }),
                children: jsxs('div', {
                  id: 'agreement-section',
                  style: { display: 'grid', gap: 16 },
                  children: [
                    jsxs('div', {
                      style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
                      children: [
                        client.logo ? jsx('img', { src: client.logo, alt: (client.company || 'Client') + ' logo', style: { width: 56, height: 56, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--line)' } }) : null,
                        jsxs('div', { children: [jsx('small', { className: 'cd-label', children: 'AGREEMENT FROM' }), jsx('div', { className: 'cd-value', id: 'agreement-from-val', children: client.agreementFrom || '—' })] }),
                        jsxs('div', { children: [jsx('small', { className: 'cd-label', children: 'AGREEMENT TO' }), jsx('div', { className: 'cd-value', id: 'agreement-to-val', children: client.agreementTo || '—' })] }),
                        jsxs('div', {
                          children: [
                            jsx('small', { className: 'cd-label', children: 'AGREEMENT COPY' }),
                            client.agreementDocument && client.agreementDocument.name
                              ? jsx('div', { className: 'cd-value', children: jsx('button', { type: 'button', id: 'agreement-download', className: 'btn btn--sm', onClick: () => (client.agreementDocument.data ? downloadDataUrl(client.agreementDocument.data, client.agreementDocument.name) : toast('Document data unavailable', { icon: 'warn' })), children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'download' }), client.agreementDocument.name] }) }) })
                              : jsx('div', { className: 'cd-value', children: '—' })
                          ]
                        })
                      ]
                    }),
                    jsx(AgreementCalc, { from: client.agreementFrom, to: client.agreementTo })
                  ]
                })
              })
            })
          ]
        }),

      // TAB 2: Websites & Cloud Infrastructure
      activeTab === 'Websites' &&
        withPager(lists.websites, jsx(Card, {
          title: 'Websites & Cloud Infrastructure',
          sub: 'Configured domains, web applications, SSL certificate expirations, and hosting targets.',
          tools: jsx('button', {
            type: 'button', onClick: () => { setEditWebId(null); setNewDomain(''); setNewHosting('AWS Cloud'); setNewSslExpiry(''); setShowAddWebsiteModal(true); },
            className: 'btn btn--sm btn--primary',
            children: jsxs('span', {
              style: { display: 'flex', alignItems: 'center', gap: 6 },
              children: [jsx(Icon, { name: 'plus' }), 'Add Domain']
            })
          }),
          flush: true,
          children: jsx('div', {
                className: 'table-wrap',
                children: jsxs('table', {
                  className: 'table cd-table',
                  children: [
                    jsx('thead', {
                      children: jsxs('tr', {
                        children: [
                          jsx('th', { className: 'col-sno', children: 'S NO' }),
jsx('th', { children: 'Domain / FQDN' }),
                          jsx('th', { children: 'Status' }),
                          jsx('th', { children: 'Hosting Provider' }),
                          jsx('th', { children: 'SSL Certificate Expiry' }),
                          jsx('th', { children: 'Domain Expiry' }),
                          jsx('th', { style: { textAlign: 'right' }, children: 'Actions' })
                        ]
                      })
                    }),
                    jsx('tbody', {
                      children: __rowsP(lists.websites, 7, 'globe', 'No websites or domains configured', 'Add official client web applications and domains to monitor SSL & infrastructure.', (w, __i) =>
                        jsxs(
                          'tr',
                          {
                            children: [
jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${__i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: __i + 1 }) }),
                              jsx('td', {
                                children: jsxs('div', {
                                  style: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 },
                                  children: [jsx(Icon, { name: 'globe' }), w.domain]
                                })
                              }),
                              jsx('td', {
                                children: jsx(StatusPill, {
                                  kind: w.status === 'Live' ? 'good' : 'info',
                                  children: w.status
                                })
                              }),
                              jsx('td', { children: w.hostingProvider || 'Cloud Infrastructure' }),
                              jsx('td', { children: w.sslExpiry || 'Auto-renew' }),
                              jsx('td', { children: w.domainExpiry || '2028-02-15' }),
                              jsx('td', {
                                style: { textAlign: 'right' },
                                children: jsxs('div', {
                                  style: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
                                  children: [
                                    jsx('a', {
                                      href: `https://${w.domain}`,
                                      target: '_blank',
                                      rel: 'noreferrer',
                                      className: 'ibtn ibtn--sm',
                                      title: 'Visit Domain',
                                      children: jsx(Icon, { name: 'arrow-up-right' })
                                    }),
                                    jsx('button', {
                                      type: 'button',
                                      className: 'ibtn ibtn--sm ibtn--bare',
                                      title: 'Edit Domain',
                                      onClick: () => { setEditWebId(w.id); setNewDomain(w.domain || ''); setNewHosting(w.hostingProvider || ''); setNewSslExpiry(w.sslExpiry && /^\d{4}-\d{2}-\d{2}$/.test(w.sslExpiry) ? w.sslExpiry : ''); setShowAddWebsiteModal(true); },
                                      children: jsx(Icon, { name: 'edit' })
                                    }),
                                    jsx('button', {
                                      type: 'button',
                                      className: 'ibtn ibtn--sm ibtn--bare',
                                      title: 'Remove Domain',
                                      onClick: () => handleDeleteWebsite(w.id),
                                      children: jsx(Icon, { name: 'trash' })
                                    })
                                  ]
                                })
                              })
                            ]
                          },
                          w.id
                        )
                      )
                    })
                  ]
                })
              })
        })),

      // TAB 3: Social Channels & External Feeds
      activeTab === 'Social' &&
        jsx(Card, {
          title: 'Social Channels & Corporate Feeds',
          sub: 'Official commercial channels, developer repositories, and external brand handles.',
          children: jsx('div', {
            className: 'cd-social',
            children: [
              { key: 'li', name: 'LinkedIn Corporate', handle: 'linkedin.com/company', desc: 'Institutional updates & executive announcements', status: 'Connected', kind: 'good', href: 'https://linkedin.com', cta: 'View Page', icon: 'globe', tone: 'blue' },
              { key: 'x', name: 'Twitter / X Feed', handle: '@aedentek_network', desc: 'Public announcements and brand mentions', status: 'Active', kind: 'info', href: 'https://twitter.com', cta: 'View Channel', icon: 'globe', tone: 'ink' },
              { key: 'gh', name: 'GitHub Organization', handle: 'github.com/aedentek', desc: 'Source repositories & automated deploy webhooks', status: 'Verified', kind: 'good', href: 'https://github.com', cta: 'Open Repo', icon: 'globe', tone: 'violet' }
            ].map((s) =>
              jsxs(
                'div',
                {
                  className: `cd-soc cd-soc--${s.tone}`,
                  children: [
                    jsxs('div', {
                      className: 'cd-soc__top',
                      children: [
                        jsx('span', { className: 'cd-soc__ico', children: jsx(Icon, { name: s.icon }) }),
                        jsx(StatusPill, { kind: s.kind, children: s.status })
                      ]
                    }),
                    jsx('b', { className: 'cd-soc__name', children: s.name }),
                    jsx('span', { className: 'cd-soc__handle', children: s.handle }),
                    jsx('p', { className: 'cd-soc__desc', children: s.desc }),
                    jsxs('a', {
                      href: s.href,
                      target: '_blank',
                      rel: 'noreferrer',
                      className: 'cd-soc__cta',
                      children: [s.cta, jsx(Icon, { name: 'arrow-up-right' })]
                    })
                  ]
                },
                s.key
              )
            )
          })
        }),

      // TAB 4: Credentials & Encrypted Server Vault
      activeTab === 'Credentials' &&
        withPager(lists.credentials, jsx(Card, {
          title: 'Login Credentials',
          sub: 'Login credentials (service, URL, username and password) for the client\'s cloud infrastructure, databases and deployment repos.',
          tools: jsx('button', {
            type: 'button', onClick: () => { setEditCredId(null); setNewCredType((serviceTypes[0] || {}).name || ''); setNewCredLabel(''); setNewCredUrl(''); setNewCredUser(''); setNewCredPass(''); setNewCredNotes(''); setShowAddCredModal(true); },
            className: 'btn btn--sm btn--primary',
            children: jsxs('span', {
              style: { display: 'flex', alignItems: 'center', gap: 6 },
              children: [jsx(Icon, { name: 'plus' }), 'Add Login']
            })
          }),
          flush: true,
          children: jsx('div', {
                className: 'table-wrap',
                children: jsxs('table', {
                  className: 'table cd-table',
                  children: [
                    jsx('thead', {
                      children: jsxs('tr', {
                        children: [
                          jsx('th', { className: 'col-sno', children: 'S NO' }),
jsx('th', { children: 'Service Type' }),
                          jsx('th', { children: 'Login Label' }),
                          jsx('th', { children: 'Login URL' }),
                          jsx('th', { children: 'Username' }),
                          jsx('th', { children: 'Password' }),
                          jsx('th', { children: 'Notes' }),
                          jsx('th', { style: { textAlign: 'right' }, children: 'Actions' })
                        ]
                      })
                    }),
                    jsx('tbody', {
                      children: __rowsP(lists.credentials, 8, 'lock', 'No login credentials added', 'Add the service logins, usernames and passwords for this client.', (c, __i) => {
                        const isRevealed = revealedPasswords[c.id];
                        return jsxs(
                          'tr',
                          {
                            children: [
jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${__i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: __i + 1 }) }),
                              jsx('td', {
                                children: jsx('span', {
                                  className: 'badge-tier badge-tier--enterprise',
                                  children: c.type || 'Cloud'
                                })
                              }),
                              jsx('td', {
                                children: jsx('b', { style: { fontSize: 'var(--fs-sm)' }, children: c.label })
                              }),
                              jsx('td', {
                                children: jsxs('div', {
                                  style: { display: 'flex', alignItems: 'center', gap: 6 },
                                  children: [
                                    jsx('span', { style: { fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }, children: c.loginUrl ? c.loginUrl.slice(0, 24) + '...' : '—' }),
                                    c.loginUrl &&
                                      jsx('button', {
                                        type: 'button',
                                        className: 'ibtn ibtn--sm ibtn--bare',
                                        title: 'Copy URL',
                                        onClick: () => copyToClipboard(c.loginUrl, 'URL'),
                                        children: jsx(Icon, { name: 'copy' })
                                      })
                                  ]
                                })
                              }),
                              jsx('td', {
                                children: jsxs('div', {
                                  style: { display: 'flex', alignItems: 'center', gap: 6 },
                                  children: [
                                    jsx('span', { style: { fontFamily: 'monospace', fontSize: 'var(--fs-xs)', fontWeight: 600 }, children: c.username }),
                                    jsx('button', {
                                      type: 'button',
                                      className: 'ibtn ibtn--sm ibtn--bare',
                                      title: 'Copy Username',
                                      onClick: () => copyToClipboard(c.username, 'Username'),
                                      children: jsx(Icon, { name: 'copy' })
                                    })
                                  ]
                                })
                              }),
                              jsx('td', {
                                children: jsxs('div', {
                                  className: 'vault-input-group',
                                  children: [
                                    jsx('input', {
                                      type: isRevealed ? 'text' : 'password',
                                      readOnly: true,
                                      value: c.password || '••••••••••••'
                                    }),
                                    jsx('button', {
                                      type: 'button',
                                      className: 'ibtn ibtn--sm ibtn--bare',
                                      title: isRevealed ? 'Mask Password' : 'Show Password',
                                      onClick: () => toggleReveal(c.id),
                                      children: jsx(Icon, { name: isRevealed ? 'eye-off' : 'eye' })
                                    }),
                                    jsx('button', {
                                      type: 'button',
                                      className: 'ibtn ibtn--sm ibtn--bare',
                                      title: 'Copy Password',
                                      onClick: () => copyToClipboard(c.password, 'Password'),
                                      children: jsx(Icon, { name: 'copy' })
                                    })
                                  ]
                                })
                              }),
                              jsx('td', {
                                children: jsx('span', { style: { fontSize: 'var(--fs-xs)', color: 'var(--muted)' }, children: c.notes || '—' })
                              }),
                              jsx('td', {
                                style: { textAlign: 'right' },
                                children: jsxs('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 6 }, children: [
                                  jsx('button', {
                                    type: 'button',
                                    className: 'ibtn ibtn--sm ibtn--bare',
                                    title: 'Edit Login',
                                    onClick: () => { setEditCredId(c.id); setNewCredType(c.type || 'AWS Cloud'); setNewCredLabel(c.label || ''); setNewCredUrl(c.loginUrl || ''); setNewCredUser(c.username || ''); setNewCredPass(''); setNewCredNotes(c.notes || ''); setShowAddCredModal(true); },
                                    children: jsx(Icon, { name: 'edit' })
                                  }),
                                  jsx('button', {
                                    type: 'button',
                                    className: 'ibtn ibtn--sm ibtn--bare',
                                    title: 'Delete Login',
                                    onClick: () => handleDeleteCredential(c.id),
                                    children: jsx(Icon, { name: 'trash' })
                                  })
                                ] })
                              })
                            ]
                          },
                          c.id
                        );
                      })
                    })
                  ]
                })
              })
        })),

      // TAB 5: Projects & Engineering Deliverables
      activeTab === 'Projects' &&
        withPager(lists.projects, jsx(Card, {
          title: 'Projects & Engineering Deliverables',
          sub: 'Ongoing sprints, contractual milestones, completion telemetry and invoiced value per project.',
          tools: jsx('button', {
            type: 'button', id: 'proj-add', className: 'btn btn--sm btn--primary', onClick: () => openProjModal(null),
            children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Add Project'] })
          }),
          flush: true,
          children: jsx('div', {
            className: 'table-wrap',
            children: jsxs('table', {
              className: 'table cd-table',
              id: 'proj-table',
              children: [
                jsx('thead', {
                  children: jsxs('tr', {
                    children: [
                      jsx('th', { className: 'col-sno', children: 'S NO' }),
                      jsx('th', { children: 'Project ID' }),
                      jsx('th', { children: 'Project Title' }),
                      jsx('th', { children: 'Contract Value' }),
                      jsx('th', { children: 'Invoiced' }),
                      jsx('th', { children: 'Milestone Progress' }),
                      jsx('th', { children: 'Lead Engineer' }),
                      jsx('th', { children: 'Start' }),
                      jsx('th', { children: 'Target Date' }),
                      jsx('th', { children: 'Status' }),
                      jsx('th', { style: { textAlign: 'right' }, children: 'Actions' })
                    ]
                  })
                }),
                jsx('tbody', {
                  children: __rowsP(lists.projects, 11, 'projects', 'No active projects', 'Add a project to track contracted deliverables and milestones.', (p, __i) => {
                    const linked = invoicesOf(p.id);
                    const invoiced = linked.reduce((s, i) => s + (i.totalAmount || 0), 0);
                    const status = p.status || ((p.progress || 0) === 100 ? 'Completed' : 'In Progress');
                    return jsxs('tr', {
                      'data-project': p.id,
                      children: [
                        jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${__i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: __i + 1 }) }),
                        jsx('td', { children: jsx('span', { style: { fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }, children: p.id }) }),
                        jsx('td', { children: jsxs('div', { children: [jsx('b', { children: p.title }), p.description ? jsx('div', { style: { fontSize: 'var(--fs-xs)', color: 'var(--muted)' }, children: p.description }) : null] }) }),
                        jsx('td', { children: fmtINR(p.contractValue) }),
                        jsx('td', { children: jsxs('div', { children: [jsx('b', { className: 'proj-invoiced', children: fmtINR(invoiced) }), jsx('div', { style: { fontSize: 'var(--fs-xs)', color: 'var(--muted)' }, children: `${linked.length} invoice${linked.length === 1 ? '' : 's'}` })] }) }),
                        jsx('td', {
                          style: { minWidth: 160 },
                          children: jsxs('div', {
                            children: [
                              jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }, children: [jsx('span', { children: (p.stages || []).length ? `${(p.stages || []).filter((x) => x.status === 'Completed').length} / ${(p.stages || []).length} Stages` : `${p.milestonesCompleted || 0} / ${p.totalMilestones || 0} Milestones` }), jsx('span', { style: { fontWeight: 600 }, children: `${p.progress || 0}%` })] }),
                              jsx(ProgressBar, { value: p.progress || 0, tone: (p.progress || 0) === 100 ? 'good' : 'cobalt' })
                            ]
                          })
                        }),
                        jsx('td', { children: p.leadEngineer || '—' }),
                        jsx('td', { children: p.startDate || '—' }),
                        jsx('td', { children: p.targetDate || '—' }),
                        jsx('td', { children: jsx(StatusPill, { kind: status === 'Completed' ? 'good' : status === 'On Hold' ? 'amber' : status === 'Planning' ? 'warn' : 'info', children: status }) }),
                        jsx('td', { style: { textAlign: 'right' }, children: jsxs('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 6 }, children: [jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare proj-timeline', title: 'Completion timeline', 'aria-label': 'Completion timeline', onClick: () => setTimelineId(p.id), children: jsx(Icon, { name: 'clock' }) }), rowActions(() => openProjModal(p), () => deleteProject(p), 'project')] }) })
                      ]
                    }, p.id);
                  })
                })
              ]
            })
          })
        })),

      // TAB 6: Invoices & Statutory Demands
      activeTab === 'Invoices' &&
        withPager(lists.invoices, (() => {
          const allInv = client.invoices || [];
          const shownInv = invProjFilter === 'all' ? allInv : invProjFilter === 'none' ? allInv.filter((i) => !i.projectId) : allInv.filter((i) => i.projectId === invProjFilter);
          const shownTotal = shownInv.reduce((s, i) => s + (i.totalAmount || 0), 0);
          return jsx(Card, {
            title: 'Invoices & Statutory Demands',
            sub: `State-compliant tax invoices grouped by project. Showing ${shownInv.length} invoice${shownInv.length === 1 ? '' : 's'} · ${fmtINR(shownTotal)}.`,
            tools: jsxs('div', {
              style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
              children: [
                jsxs('select', {
                  className: 'select', id: 'inv-project-filter', value: invProjFilter, onChange: (e) => setInvProjFilter(e.target.value), style: { height: 34, width: 210 },
                  children: [
                    jsx('option', { value: 'all', children: 'All projects' }),
                    ...projects.map((p) => jsx('option', { value: p.id, children: p.title }, p.id)),
                    jsx('option', { value: 'none', children: 'Unassigned' })
                  ]
                }),
                jsx('a', {
                  href: '/finance/invoices', className: 'btn btn--sm btn--primary',
                  children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Create Invoice'] })
                })
              ]
            }),
            flush: true,
            children: jsx('div', {
              className: 'table-wrap',
              children: jsxs('table', {
                className: 'table cd-table',
                id: 'inv-table',
                children: [
                  jsx('thead', {
                    children: jsxs('tr', {
                      children: [
                        jsx('th', { className: 'col-sno', children: 'S NO' }),
                        jsx('th', { children: 'Invoice Number' }),
                        jsx('th', { children: 'Project' }),
                        jsx('th', { children: 'Issue Date' }),
                        jsx('th', { children: 'Due Date' }),
                        jsx('th', { children: 'Tax Regime' }),
                        jsx('th', { children: 'Total Demand' }),
                        jsx('th', { children: 'Status' }),
                        jsx('th', { style: { textAlign: 'right' }, children: 'Print / View' })
                      ]
                    })
                  }),
                  jsx('tbody', {
                    children: __rowsP(lists.invoices, 9, 'finance', 'No invoices for this selection', 'Invoices issued against this project appear here.', (inv, __i) =>
                      jsxs('tr', {
                        'data-invoice': inv.invoiceNumber,
                        children: [
                          jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${__i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: __i + 1 }) }),
                          jsx('td', { children: jsx('b', { style: { fontFamily: 'monospace' }, children: inv.invoiceNumber }) }),
                          jsx('td', {
                            children: jsxs('select', {
                              className: 'select inv-project-select', value: inv.projectId || '', title: 'Assign invoice to a project', style: { height: 32, width: 200 },
                              onChange: (e) => linkInvoice(inv.id, e.target.value),
                              children: [jsx('option', { value: '', children: '— Unassigned —' }), ...projects.map((p) => jsx('option', { value: p.id, children: p.title }, p.id))]
                            })
                          }),
                          jsx('td', { children: inv.issueDate }),
                          jsx('td', { children: inv.dueDate }),
                          jsx('td', { children: jsx('span', { className: 'badge-tier badge-tier--enterprise', children: inv.taxMode || 'B2B Registered' }) }),
                          jsx('td', { children: jsx('b', { children: fmtINR(inv.totalAmount) }) }),
                          jsx('td', { children: jsx(StatusPill, { kind: inv.status === 'Paid' ? 'good' : inv.status === 'Partially Paid' ? 'amber' : 'warn', children: inv.status }) }),
                          jsx('td', {
                            style: { textAlign: 'right' },
                            children: jsx('button', { type: 'button', className: 'action-btn action-btn--print', title: 'Print Preview', 'aria-label': 'Print Preview', onClick: () => setPreviewInvoice(inv), children: jsx(Icon, { name: 'printer' }) })
                          })
                        ]
                      }, inv.id)
                    )
                  })
                ]
              })
            })
          });
        })()),

      // TAB 7: Payments & Ledger Reconciliations
      activeTab === 'Payments' &&
        withPager(lists.payments, jsx(Card, {
          title: 'Payments & Ledger Reconciliations',
          sub: 'Settled bank transfers (RTGS / NEFT / SWIFT), receipt numbers, and bank UTR references.',
          flush: true,
          children: jsx('div', {
                className: 'table-wrap',
                children: jsxs('table', {
                  className: 'table cd-table',
                  children: [
                    jsx('thead', {
                      children: jsxs('tr', {
                        children: [
                          jsx('th', { className: 'col-sno', children: 'S NO' }),
jsx('th', { children: 'Receipt ID' }),
                          jsx('th', { children: 'Payment Date' }),
                          jsx('th', { children: 'Settlement Channel' }),
                          jsx('th', { children: 'Bank Reference / UTR' }),
                          jsx('th', { children: 'Amount Credited' }),
                          jsx('th', { style: { textAlign: 'right' }, children: 'Reconciliation' })
                        ]
                      })
                    }),
                    jsx('tbody', {
                      children: __rowsP(lists.payments, 7, 'finance', 'No payment receipts recorded', 'Settled inward payments and wire reconciliations will display here.', (pm, __i) =>
                        jsxs(
                          'tr',
                          {
                            children: [
jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${__i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: __i + 1 }) }),
                              jsx('td', { children: jsx('b', { style: { fontFamily: 'monospace' }, children: pm.receiptId }) }),
                              jsx('td', { children: pm.paymentDate }),
                              jsx('td', { children: pm.paymentChannel || 'Bank Transfer' }),
                              jsx('td', { children: jsx('span', { style: { fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }, children: pm.bankReference || '—' }) }),
                              jsx('td', { children: jsx('b', { style: { color: 'var(--green, #10b981)' }, children: fmtINR(pm.amount) }) }),
                              jsx('td', {
                                style: { textAlign: 'right' },
                                children: jsx(StatusPill, { kind: 'good', children: 'Reconciled' })
                              })
                            ]
                          },
                          pm.id
                        )
                      )
                    })
                  ]
                })
              })
        })),

      // TAB: Agreement monthly billing
      activeTab === 'Billing' &&
        jsxs('div', {
          style: { display: 'grid', gap: 20 },
          children: [
            jsx(Card, {
              title: 'Agreement Monthly Billing',
              sub: client.agreementFrom && client.agreementTo
                ? `Agreement ${client.agreementFrom} → ${client.agreementTo}. One bill is raised for every month of the agreement.`
                : 'Set the agreement From and To dates (Edit Profile) before configuring monthly billing.',
              children: jsxs('form', {
                id: 'billing-form', onSubmit: saveBillingSettings, noValidate: true, style: { display: 'grid', gap: 14 },
                children: [
                  jsxs('div', {
                    className: 'form-grid',
                    children: [
                      field('Monthly Amount (₹)', jsx('input', { className: 'input', id: 'bill-amount', type: 'number', min: 0, value: billForm.amount, onChange: (e) => setBillForm({ ...billForm, amount: e.target.value }), placeholder: 'e.g. 25000' })),
                      field('GST', jsxs('select', { className: 'select', id: 'bill-gst-mode', value: billForm.gstMode, onChange: (e) => setBillForm({ ...billForm, gstMode: e.target.value }), children: [jsx('option', { value: 'Without GST', children: 'Without GST' }), jsx('option', { value: 'With GST', children: 'With GST (added on top)' })] })),
                      billForm.gstMode === 'With GST' ? field('GST Rate (%)', jsx('input', { className: 'input', id: 'bill-gst-rate', type: 'number', min: 0, max: 100, value: billForm.gstRate, onChange: (e) => setBillForm({ ...billForm, gstRate: e.target.value }) })) : null
                    ]
                  }),
                  jsxs('div', {
                    id: 'bill-preview', className: 'cd-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' },
                    children: [
                      jsxs('div', { children: [jsx('small', { className: 'cd-label', children: 'AMOUNT / MONTH' }), jsx('div', { className: 'cd-value', children: fmtINR(billPreview.base) })] }),
                      jsxs('div', { children: [jsx('small', { className: 'cd-label', children: billForm.gstMode === 'With GST' ? `GST @ ${billForm.gstRate || 0}%` : 'GST' }), jsx('div', { className: 'cd-value', children: billForm.gstMode === 'With GST' ? fmtINR(billPreview.gst) : 'Not applied' })] }),
                      jsxs('div', { children: [jsx('small', { className: 'cd-label', children: 'BILL / MONTH' }), jsx('div', { className: 'cd-value', children: jsx('b', { children: fmtINR(billPreview.total) }) })] }),
                      jsxs('div', { children: [jsx('small', { className: 'cd-label', children: 'AGREEMENT TOTAL' }), jsx('div', { className: 'cd-value', children: fmtINR((billing.kpis && billing.kpis.totalValue) || 0) })] })
                    ]
                  }),
                  formErr && activeTab === 'Billing' && !billModal ? jsx('div', { id: 'form-error', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)' }, children: formErr }) : null,
                  jsxs('div', {
                    style: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
                    children: [
                      jsx('button', { type: 'button', id: 'bill-clear', className: 'btn btn--ghost', onClick: clearBillingSettings, children: 'Clear Setup' }),
                      jsx('button', { type: 'submit', id: 'bill-save', className: 'btn btn--primary', children: 'Save & Generate Schedule' })
                    ]
                  })
                ]
              })
            }),
            jsx(Card, {
              title: 'Monthly Payment Schedule',
              sub: billing.kpis ? `${billing.kpis.months} month${billing.kpis.months === 1 ? '' : 's'} · Total ${fmtINR(billing.kpis.totalValue)} · Paid ${fmtINR(billing.kpis.totalPaid)} · Pending ${fmtINR(billing.kpis.totalPending)}` : 'Month-by-month billing generated from the agreement period.',
              tools: jsxs('div', {
                style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
                children: [
                  jsxs('select', { className: 'select', id: 'bill-filter', value: billStatus, onChange: (e) => setBillStatus(e.target.value), style: { height: 34, width: 140 }, children: ['All', 'Pending', 'Paid'].map((s) => jsx('option', { value: s, children: s === 'All' ? 'All statuses' : s }, s)) }),
                  jsx('button', { type: 'button', id: 'bill-add', className: 'btn btn--sm btn--primary', onClick: () => { setFormErr(''); setBillModal({ month: '', baseAmount: billForm.amount || 0, dueDate: '', notes: '' }); }, children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Add Month'] }) })
                ]
              }),
              flush: true,
              children: jsx('div', {
                className: 'table-wrap',
                children: jsxs('table', {
                  className: 'table cd-table', id: 'bill-table',
                  children: [
                    jsx('thead', { children: jsxs('tr', { children: [jsx('th', { className: 'col-sno', children: 'S NO' }), jsx('th', { children: 'Month' }), jsx('th', { children: 'Due Date' }), jsx('th', { children: 'Amount' }), jsx('th', { children: 'GST' }), jsx('th', { children: 'Total' }), jsx('th', { children: 'Status' }), jsx('th', { children: 'Paid On' }), jsx('th', { style: { textAlign: 'right' }, children: 'Actions' })] }) }),
                    jsx('tbody', {
                      children: __rowsP(billing, 9, 'finance', 'No monthly billing yet', 'Save the monthly amount above to generate the schedule from the agreement dates.', (r, __i) =>
                        jsxs('tr', {
                          'data-month': r.month,
                          children: [
                            jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${__i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: __i + 1 }) }),
                            jsx('td', { children: jsxs('b', { children: [monthLabelOf(r.month), r.manual ? jsx('small', { style: { color: 'var(--muted)', marginLeft: 6 }, children: '(extra)' }) : null] }) }),
                            jsx('td', { children: r.dueDate || '—' }),
                            jsx('td', { children: fmtINR(r.baseAmount) }),
                            jsx('td', { children: r.gstAmount ? fmtINR(r.gstAmount) : jsx('span', { className: 'muted', children: '—' }) }),
                            jsx('td', { children: jsx('b', { children: fmtINR(r.totalAmount) }) }),
                            jsx('td', { children: jsx(StatusPill, { kind: r.status === 'Paid' ? 'good' : 'amber', children: r.status }) }),
                            jsx('td', { children: r.paidDate || '—' }),
                            jsx('td', {
                              style: { textAlign: 'right' },
                              children: jsxs('div', {
                                style: { display: 'flex', justifyContent: 'flex-end', gap: 6 },
                                children: [
                                  jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare bill-toggle', title: r.status === 'Paid' ? 'Mark pending' : 'Mark paid', 'aria-label': r.status === 'Paid' ? 'Mark pending' : 'Mark paid', onClick: () => setBillRowStatus(r, r.status === 'Paid' ? 'Pending' : 'Paid'), children: jsx(Icon, { name: r.status === 'Paid' ? 'clock' : 'check' }) }),
                                  jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare', title: 'Edit billing month', 'aria-label': 'Edit billing month', onClick: () => { setFormErr(''); setBillModal({ id: r.id, month: r.month, baseAmount: r.baseAmount, dueDate: r.dueDate || '', notes: r.notes || '' }); }, children: jsx(Icon, { name: 'edit' }) }),
                                  jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare', title: 'Delete billing month', 'aria-label': 'Delete billing month', onClick: () => deleteBillRow(r), children: jsx(Icon, { name: 'trash' }) })
                                ]
                              })
                            })
                          ]
                        }, r.id)
                      )
                    })
                  ]
                })
              })
            }),
            billing.pager ? jsx('div', { className: 'pager-slot', children: billing.pager }) : null
          ]
        }),

      // TAB 9: Contracts & Document Repository
      activeTab === 'Documents' &&
        withPager(lists.documents, jsx(Card, {
          title: 'Contracts & Document Repository',
          sub: 'Executed Master Services Agreements (MSA), Statements of Work (SOW), and NDA legal documents.',
          tools: jsx('button', {
            type: 'button', id: 'doc-add', className: 'btn btn--sm btn--primary', onClick: () => openDocModal(null),
            children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Add Contract'] })
          }),
          children: lists.documents.rows.length
            ? jsx('div', {
                className: 'cd-social',
                id: 'doc-grid',
                children: lists.documents.rows.map((doc) => {
                  const v = doc.startDate && doc.endDate ? agreementStats(doc.startDate, doc.endDate) : { valid: false };
                  return jsxs('div', {
                    className: 'cd-soc cd-doc',
                    'data-doc': doc.name,
                    children: [
                      jsxs('div', { className: 'cd-soc__top', children: [jsx('span', { className: 'cd-soc__ico', children: jsx(Icon, { name: 'note' }) }), jsx('span', { className: 'cd-doc__type', children: `${doc.category || 'Other'} · ${doc.type || 'PDF'}` })] }),
                      jsx('b', { className: 'cd-soc__name', children: doc.name }),
                      jsxs('div', { className: 'cd-doc__meta', children: [jsx('span', { children: `Uploaded ${doc.uploadedAt || '—'}` }), jsx('span', { className: 'cd-doc__dot' }), jsx('span', { children: doc.size || '—' })] }),
                      doc.startDate || doc.endDate
                        ? jsxs('div', { className: 'cd-doc__meta', style: { flexWrap: 'wrap' }, children: [jsx('span', { children: `${doc.startDate || '—'} → ${doc.endDate || '—'}` }), v.valid ? jsx(StatusPill, { kind: agreementTone(v.state), children: v.state === 'Expired' ? 'Expired' : v.state === 'Upcoming' ? `Starts in ${v.daysToStart}d` : `${v.remaining}d left` }) : null] })
                        : null,
                      doc.notes ? jsx('div', { style: { fontSize: 'var(--fs-xs)', color: 'var(--muted)' }, children: doc.notes }) : null,
                      jsxs('div', {
                        style: { display: 'flex', gap: 6, marginTop: 4 },
                        children: [
                          jsxs('button', { type: 'button', className: 'cd-soc__cta doc-download', style: { flex: 1 }, onClick: () => downloadDoc(doc), children: [jsx(Icon, { name: 'download' }), 'Download'] }),
                          jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare doc-edit', title: 'Edit Contract', 'aria-label': 'Edit Contract', onClick: () => openDocModal(doc), children: jsx(Icon, { name: 'edit' }) }),
                          jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare doc-delete', title: 'Delete Contract', 'aria-label': 'Delete Contract', onClick: () => deleteDoc(doc), children: jsx(Icon, { name: 'trash' }) })
                        ]
                      })
                    ]
                  }, doc.id);
                })
              })
            : jsx(EmptyState, { icon: 'note', title: 'No legal documents uploaded', text: 'Upload signed MSAs, Statements of Work, and Letter of Undertakings.' })
        })),

      // MODAL: Edit Profile
      showEditProfileModal &&
        jsx('div', {
          className: 'scrim',
          style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 },
          onClick: () => setShowEditProfileModal(false),
          children: jsxs('div', {
            className: 'card',
            style: { width: '100%', maxWidth: 580, padding: 24, margin: 20 },
            onClick: (e) => e.stopPropagation(),
            children: [
              jsxs('header', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
                children: [
                  jsx('h2', { style: { fontSize: 'var(--fs-xl)', fontWeight: 700 }, children: 'Edit Corporate Profile' }),
                  jsx('button', { type: 'button', className: 'ibtn ibtn--bare', onClick: () => setShowEditProfileModal(false), children: jsx(Icon, { name: 'x' }) })
                ]
              }),
              jsxs('form', {
                onSubmit: handleUpdateProfile,
                children: [
                  jsxs('div', {
                    className: 'form-grid',
                    children: [
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'Company Legal Name' }),
                          jsx('input', { className: 'input', value: editForm.company || '', onChange: (e) => setEditForm({ ...editForm, company: e.target.value }) })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Primary Contact' }),
                          jsx('input', { className: 'input', value: editForm.name || '', onChange: (e) => setEditForm({ ...editForm, name: e.target.value }) })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Official Email' }),
                          jsx('input', { className: 'input', value: editForm.email || '', onChange: (e) => setEditForm({ ...editForm, email: e.target.value }) })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Hotline / Phone' }),
                          jsx('input', { className: 'input', value: editForm.phone || '', onChange: (e) => setEditForm({ ...editForm, phone: e.target.value }) })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Statutory GSTIN' }),
                          jsx('input', { className: 'input', value: editForm.gstNumber || '', onChange: (e) => setEditForm({ ...editForm, gstNumber: e.target.value.toUpperCase() }) })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'HQ Street Address' }),
                          jsx('textarea', { className: 'input', rows: 2, value: editForm.address || '', onChange: (e) => setEditForm({ ...editForm, address: e.target.value }) })
                        ]
                      })
                    ]
                  }),
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
                    children: [
                      jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setShowEditProfileModal(false), children: 'Cancel' }),
                      jsx('button', { type: 'submit', className: 'btn btn--primary', children: 'Save Changes' })
                    ]
                  })
                ]
              })
            ]
          })
        }),

      // MODAL: Add Website
      showAddWebsiteModal &&
        jsx('div', {
          className: 'scrim',
          style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 },
          onClick: () => setShowAddWebsiteModal(false),
          children: jsxs('div', {
            className: 'card',
            style: { width: '100%', maxWidth: 480, padding: 24, margin: 20 },
            onClick: (e) => e.stopPropagation(),
            children: [
              jsx('h2', { style: { fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 14 }, children: editWebId ? 'Edit Domain / Application' : 'Add Domain / Application' }),
              jsxs('form', {
                onSubmit: handleAddWebsite,
                children: [
                  jsxs('div', {
                    className: 'form-grid',
                    children: [
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'Domain / FQDN *' }),
                          jsx('input', { className: 'input', required: true, value: newDomain, onChange: (e) => setNewDomain(e.target.value), placeholder: 'api.domain.com' })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Hosting Provider' }),
                          jsx('input', { className: 'input', value: newHosting, onChange: (e) => setNewHosting(e.target.value), placeholder: 'AWS Mumbai' })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'SSL Expiry Date' }),
                          jsx('input', { className: 'input', type: 'date', value: newSslExpiry, onChange: (e) => setNewSslExpiry(e.target.value) })
                        ]
                      })
                    ]
                  }),
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
                    children: [
                      jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setShowAddWebsiteModal(false), children: 'Cancel' }),
                      jsx('button', { type: 'submit', className: 'btn btn--primary', children: editWebId ? 'Save Changes' : 'Add Domain' })
                    ]
                  })
                ]
              })
            ]
          })
        }),

      // MODAL: Add Credential
      showAddCredModal &&
        jsx('div', {
          className: 'scrim',
          style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 },
          onClick: () => setShowAddCredModal(false),
          children: jsxs('div', {
            className: 'card',
            style: { width: '100%', maxWidth: 520, padding: 24, margin: 20 },
            onClick: (e) => e.stopPropagation(),
            children: [
              jsx('h2', { style: { fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 14 }, children: editCredId ? 'Edit Login Credential' : 'Add Login Credential' }),
              jsxs('form', {
                onSubmit: handleAddCredential,
                children: [
                  jsxs('div', {
                    className: 'form-grid',
                    children: [
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Service Type' }),
                          jsxs('select', {
                            className: 'select',
                            value: newCredType,
                            onChange: (e) => setNewCredType(e.target.value),
                            children: [
                              ...(newCredType && !serviceTypes.some((t) => t.name === newCredType) ? [jsx('option', { value: newCredType, children: newCredType + ' (inactive)' }, '__cur')] : []),
                              ...serviceTypes.map((t) => jsx('option', { value: t.name, children: t.name }, t._id))
                            ]
                          })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Login Label *' }),
                          jsx('input', { className: 'input', required: true, value: newCredLabel, onChange: (e) => setNewCredLabel(e.target.value), placeholder: 'Production DB Replica' })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'Host / Login URL' }),
                          jsx('input', { className: 'input', value: newCredUrl, onChange: (e) => setNewCredUrl(e.target.value), placeholder: 'https://console.aws.amazon.com' })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: 'Username / Key ID *' }),
                          jsx('input', { className: 'input', required: true, value: newCredUser, onChange: (e) => setNewCredUser(e.target.value), placeholder: 'admin' })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field',
                        children: [
                          jsx('span', { children: editCredId ? 'Password (leave blank to keep)' : 'Password *' }),
                          jsx('input', { className: 'input', type: 'password', required: !editCredId, value: newCredPass, onChange: (e) => setNewCredPass(e.target.value), placeholder: 'SecretKey123!' })
                        ]
                      }),
                      jsxs('label', {
                        className: 'field span-2',
                        children: [
                          jsx('span', { children: 'Security Notes' }),
                          jsx('input', { className: 'input', value: newCredNotes, onChange: (e) => setNewCredNotes(e.target.value), placeholder: 'Restricted VPC subnet access only' })
                        ]
                      })
                    ]
                  }),
                  jsxs('div', {
                    style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
                    children: [
                      jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setShowAddCredModal(false), children: 'Cancel' }),
                      jsx('button', { type: 'submit', className: 'btn btn--primary', children: editCredId ? 'Save Changes' : 'Save Login' })
                    ]
                  })
                ]
              })
            ]
          })
        }),

      // MODAL: Project (add / edit)
      projModal &&
        jsx(ModalShell, {
          title: projModal.id ? 'Edit Project' : 'Add Project',
          sub: 'Contract value, milestones and schedule. Progress is calculated from milestones.',
          onClose: () => setProjModal(null),
          width: 580,
          children: jsxs('form', {
            onSubmit: saveProject, id: 'proj-form', noValidate: true,
            children: [
              jsxs('div', {
                className: 'form-grid',
                children: [
                  field('Project Title *', jsx('input', { className: 'input', id: 'proj-title', value: projModal.title, onChange: (e) => setProjModal({ ...projModal, title: e.target.value }) }), true),
                  field('Description', jsx('input', { className: 'input', id: 'proj-desc', value: projModal.description, onChange: (e) => setProjModal({ ...projModal, description: e.target.value }) }), true),
                  field('Contract Value (₹)', jsx('input', { className: 'input', id: 'proj-value', type: 'number', min: 0, value: projModal.contractValue, onChange: (e) => setProjModal({ ...projModal, contractValue: e.target.value }) })),
                  field('Lead Engineer', jsx('input', { className: 'input', id: 'proj-lead', value: projModal.leadEngineer, onChange: (e) => setProjModal({ ...projModal, leadEngineer: e.target.value }) })),
                  field('Total Milestones', jsx('input', { className: 'input', id: 'proj-total', type: 'number', min: 1, value: projModal.totalMilestones, onChange: (e) => setProjModal({ ...projModal, totalMilestones: e.target.value }) })),
                  field('Completed Milestones', jsx('input', { className: 'input', id: 'proj-done', type: 'number', min: 0, value: projModal.milestonesCompleted, onChange: (e) => setProjModal({ ...projModal, milestonesCompleted: e.target.value }) })),
                  field('Start Date', jsx('input', { className: 'input', id: 'proj-start', type: 'date', value: projModal.startDate, onChange: (e) => setProjModal({ ...projModal, startDate: e.target.value }) })),
                  field('Target Date', jsx('input', { className: 'input', id: 'proj-target', type: 'date', min: projModal.startDate || undefined, value: projModal.targetDate, onChange: (e) => setProjModal({ ...projModal, targetDate: e.target.value }) })),
                  field('Completion Timeline Stages', jsx('div', {
                    id: 'proj-stages', className: 'stage-picker',
                    children: stageOptionsFor(projModal).length
                      ? stageOptionsFor(projModal).map((a) => jsxs('label', { className: 'stage-picker__opt' + (projModal.stageIds.includes(a._id) ? ' is-on' : ''), children: [jsx('input', { type: 'checkbox', 'data-stage-id': a._id, checked: projModal.stageIds.includes(a._id), onChange: () => toggleStage(a._id) }), jsx('span', { children: a.name })] }, a._id))
                      : jsx('span', { style: { color: 'var(--muted)', fontSize: 'var(--fs-sm)' }, children: 'No active stages — add some under Clients → Project Stages.' })
                  }), true),
                  field('Status', jsxs('select', { className: 'select', id: 'proj-status', value: projModal.status, onChange: (e) => setProjModal({ ...projModal, status: e.target.value }), children: ['Planning', 'In Progress', 'On Hold', 'Completed'].map((s) => jsx('option', { value: s, children: s }, s)) }), true)
                ]
              }),
              formErr ? jsx('div', { id: 'form-error', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)', marginTop: 10 }, children: formErr }) : null,
              jsxs('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, children: [jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setProjModal(null), children: 'Cancel' }), jsx('button', { type: 'submit', id: 'proj-save', className: 'btn btn--primary', children: projModal.id ? 'Save Changes' : 'Create Project' })] })
            ]
          })
        }),

      // MODAL: Contract (add / edit)
      docModal &&
        jsx(ModalShell, {
          title: docModal.id ? 'Edit Contract' : 'Add Contract',
          sub: 'Upload the signed document and record its validity period.',
          onClose: () => setDocModal(null),
          width: 560,
          children: jsxs('form', {
            onSubmit: saveDoc, id: 'doc-form', noValidate: true,
            children: [
              jsxs('div', {
                className: 'form-grid',
                children: [
                  field('Contract Name *', jsx('input', { className: 'input', id: 'doc-name', value: docModal.name, onChange: (e) => setDocModal({ ...docModal, name: e.target.value }) }), true),
                  field('Category', jsxs('select', { className: 'select', id: 'doc-category', value: docModal.category, onChange: (e) => setDocModal({ ...docModal, category: e.target.value }), children: ['MSA', 'SOW', 'NDA', 'LOU', 'Other'].map((s) => jsx('option', { value: s, children: s }, s)) })),
                  field('Document File', jsxs('div', { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [jsxs('label', { className: 'btn btn--sm', style: { cursor: 'pointer' }, children: [jsx('span', { children: docModal.fileName || docModal.hadData ? 'Replace File' : 'Choose File' }), jsx('input', { type: 'file', id: 'doc-file', accept: '.pdf,.doc,.docx,.zip,image/*', onChange: onDocFile, style: { display: 'none' } })] }), jsx('span', { id: 'doc-file-name', style: { fontSize: 'var(--fs-xs)', color: 'var(--muted)' }, children: docModal.fileName || 'No file chosen' })] })),
                  field('Start Date', jsx('input', { className: 'input', id: 'doc-start', type: 'date', value: docModal.startDate, onChange: (e) => setDocModal({ ...docModal, startDate: e.target.value }) })),
                  field('End Date', jsx('input', { className: 'input', id: 'doc-end', type: 'date', min: docModal.startDate || undefined, value: docModal.endDate, onChange: (e) => setDocModal({ ...docModal, endDate: e.target.value }) })),
                  field('Notes', jsx('input', { className: 'input', id: 'doc-notes', value: docModal.notes, onChange: (e) => setDocModal({ ...docModal, notes: e.target.value }) }), true)
                ]
              }),
              formErr ? jsx('div', { id: 'form-error', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)', marginTop: 10 }, children: formErr }) : null,
              jsxs('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, children: [jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setDocModal(null), children: 'Cancel' }), jsx('button', { type: 'submit', id: 'doc-save', className: 'btn btn--primary', children: docModal.id ? 'Save Changes' : 'Add Contract' })] })
            ]
          })
        }),

      // MODAL: Billing month (add / edit)
      billModal &&
        jsx(ModalShell, {
          title: billModal.id ? 'Edit Billing Month' : 'Add Billing Month',
          sub: 'GST is calculated from the saved billing setup.',
          onClose: () => setBillModal(null),
          width: 460,
          children: jsxs('form', {
            onSubmit: saveBillRow, id: 'bill-row-form', noValidate: true,
            children: [
              jsxs('div', {
                className: 'form-grid',
                children: [
                  field('Month', jsx('input', { className: 'input', id: 'bill-row-month', type: 'month', value: billModal.month, disabled: !!billModal.id, onChange: (e) => setBillModal({ ...billModal, month: e.target.value }) })),
                  field('Amount (₹)', jsx('input', { className: 'input', id: 'bill-row-amount', type: 'number', min: 0, value: billModal.baseAmount, onChange: (e) => setBillModal({ ...billModal, baseAmount: e.target.value }) })),
                  field('Due Date', jsx('input', { className: 'input', id: 'bill-row-due', type: 'date', value: billModal.dueDate, onChange: (e) => setBillModal({ ...billModal, dueDate: e.target.value }) })),
                  field('Notes', jsx('input', { className: 'input', id: 'bill-row-notes', value: billModal.notes, onChange: (e) => setBillModal({ ...billModal, notes: e.target.value }) }))
                ]
              }),
              formErr ? jsx('div', { id: 'form-error', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)', marginTop: 10 }, children: formErr }) : null,
              jsxs('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, children: [jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setBillModal(null), children: 'Cancel' }), jsx('button', { type: 'submit', id: 'bill-row-save', className: 'btn btn--primary', children: billModal.id ? 'Save Changes' : 'Add Month' })] })
            ]
          })
        }),

      // MODAL: Project completion timeline (stage setup)
      timelineProject &&
        jsx(ModalShell, {
          title: `${timelineProject.title} — Completion Timeline`,
          sub: 'Pick the stages for this project and track each one to completion.',
          onClose: () => setTimelineId(null),
          width: 720,
          children: jsxs('div', {
            id: 'timeline-modal',
            style: { display: 'grid', gap: 14 },
            children: [
              jsxs('div', { children: [jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', marginBottom: 6 }, children: [jsx('span', { children: `${(timelineProject.stages || []).filter((s) => s.status === 'Completed').length} of ${(timelineProject.stages || []).length} stages completed` }), jsx('b', { id: 'timeline-progress', children: `${timelineProject.progress || 0}%` })] }), jsx(ProgressBar, { value: timelineProject.progress || 0, tone: (timelineProject.progress || 0) === 100 ? 'good' : 'cobalt' })] }),
              (timelineProject.stages || []).length
                ? jsx('ol', {
                    className: 'tl-stages',
                    children: [...(timelineProject.stages || [])].sort((a, b) => a.order - b.order).map((st, i) =>
                      jsxs('li', {
                        className: `tl-stage tl-stage--${String(st.status).replace(/\s+/g, '').toLowerCase()}`,
                        'data-stage-entry': st.name,
                        children: [
                          jsx('span', { className: 'tl-stage__dot', children: st.status === 'Completed' ? jsx(Icon, { name: 'check' }) : i + 1 }),
                          jsxs('div', {
                            className: 'tl-stage__body',
                            children: [
                              jsxs('div', { className: 'tl-stage__head', children: [jsx('b', { children: st.name }), jsx(StatusPill, { kind: st.status === 'Completed' ? 'good' : st.status === 'In Progress' ? 'info' : 'amber', children: st.status })] }),
                              jsxs('div', {
                                className: 'tl-stage__fields',
                                children: [
                                  jsxs('select', { className: 'select tl-status', value: st.status, onChange: (e) => updateStageEntry(timelineProject.id, st.id, { status: e.target.value }), children: ['Pending', 'In Progress', 'Completed'].map((s) => jsx('option', { value: s, children: s }, s)) }),
                                  jsx('input', { className: 'input tl-start', type: 'date', title: 'Start date', value: st.startDate || '', onChange: (e) => updateStageEntry(timelineProject.id, st.id, { startDate: e.target.value }) }),
                                  jsx('input', { className: 'input tl-due', type: 'date', title: 'Due date', value: st.dueDate || '', onChange: (e) => updateStageEntry(timelineProject.id, st.id, { dueDate: e.target.value }) }),
                                  jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare tl-remove', title: 'Remove stage', 'aria-label': 'Remove stage', onClick: () => removeStageEntry(timelineProject.id, st.id), children: jsx(Icon, { name: 'trash' }) })
                                ]
                              }),
                              st.completedDate ? jsx('small', { style: { color: 'var(--muted)' }, children: `Completed on ${st.completedDate}` }) : null
                            ]
                          })
                        ]
                      }, st.id)
                    )
                  })
                : jsx(EmptyState, { icon: 'projects', title: 'No stages selected', text: 'Add stages below to set up this project\'s completion timeline.' }),
              jsxs('div', {
                style: { display: 'flex', gap: 8, alignItems: 'center' },
                children: [
                  jsxs('select', {
                    className: 'select', id: 'tl-add-select', defaultValue: '',
                    onChange: (e) => { const v = e.target.value; e.target.value = ''; addStageEntry(timelineProject.id, v); },
                    children: [jsx('option', { value: '', children: '+ Add a stage…' }), ...activeStages.filter((a) => !(timelineProject.stages || []).some((st) => st.stageId === a._id)).map((a) => jsx('option', { value: a._id, children: a.name }, a._id))]
                  }),
                  jsx('a', { href: '/clients/project-stages', className: 'btn btn--sm btn--ghost', children: 'Manage stages' })
                ]
              })
            ]
          })
        }),

      // MODAL: Delete Confirmation
      showDeleteModal &&
        jsx('div', {
          className: 'scrim',
          style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 },
          onClick: () => setShowDeleteModal(false),
          children: jsxs('div', {
            className: 'card',
            style: { width: '100%', maxWidth: 440, padding: 24, margin: 20 },
            onClick: (e) => e.stopPropagation(),
            children: [
              jsx('h2', { style: { fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--red, #ef4444)', marginBottom: 10 }, children: 'Delete Client Record' }),
              jsxs('p', {
                style: { color: 'var(--muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.5, marginBottom: 20 },
                children: [
                  'Are you sure you want to permanently delete ',
                  jsx('b', { style: { color: 'var(--text)' }, children: client.company }),
                  '? All associated domain records, vault credentials, and timeline entries will be removed.'
                ]
              }),
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
                children: [
                  jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setShowDeleteModal(false), children: 'Cancel' }),
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--primary',
                    style: { background: 'var(--red, #ef4444)', borderColor: 'var(--red, #ef4444)' },
                    onClick: handleDeleteClient,
                    children: 'Yes, Delete Client'
                  })
                ]
              })
            ]
          })
        }),

      // MODAL: Printable Invoice Preview
      previewInvoice &&
        jsx('div', {
          className: 'scrim',
          style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 },
          onClick: () => setPreviewInvoice(null),
          children: jsxs('div', {
            className: 'card',
            style: { width: '100%', maxWidth: 640, padding: 28, margin: 20, background: '#fff', color: '#111827' },
            onClick: (e) => e.stopPropagation(),
            children: [
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: 16, marginBottom: 20 },
                children: [
                  jsxs('div', {
                    children: [
                      jsx('h2', { style: { fontSize: 24, fontWeight: 700, color: '#111827' }, children: 'TAX INVOICE' }),
                      jsx('div', { style: { fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }, children: previewInvoice.invoiceNumber })
                    ]
                  }),
                  jsxs('div', {
                    style: { textAlign: 'right' },
                    children: [
                      jsx('div', { style: { fontWeight: 700, fontSize: 16 }, children: 'Aedentek Technologies Pvt Ltd' }),
                      jsx('div', { style: { fontSize: 12, color: '#6b7280' }, children: 'GSTIN: 27AAFCO1234F1Z8' })
                    ]
                  })
                ]
              }),
              jsxs('div', {
                style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, fontSize: 13, marginBottom: 20 },
                children: [
                  jsxs('div', {
                    children: [
                      jsx('b', { style: { color: '#374151' }, children: 'BILLED TO:' }),
                      jsx('div', { style: { fontWeight: 600, fontSize: 14 }, children: client.company }),
                      jsx('div', { children: client.address }),
                      jsxs('div', { children: ['GSTIN: ', client.gstNumber || 'EXEMPT'] })
                    ]
                  }),
                  jsxs('div', {
                    style: { textAlign: 'right' },
                    children: [
                      jsxs('div', { children: ['Issue Date: ', jsx('b', { children: previewInvoice.issueDate })] }),
                      jsxs('div', { children: ['Due Date: ', jsx('b', { children: previewInvoice.dueDate })] }),
                      jsxs('div', { children: ['Tax Regime: ', jsx('b', { children: previewInvoice.taxMode })] })
                    ]
                  })
                ]
              }),
              jsxs('div', {
                style: { borderTop: '2px solid #e5e7eb', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                children: [
                  jsx('span', { style: { fontSize: 18, fontWeight: 700 }, children: 'Total Demand:' }),
                  jsx('span', { style: { fontSize: 24, fontWeight: 800, color: '#1d4ed8' }, children: fmtINR(previewInvoice.totalAmount) })
                ]
              }),
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
                children: [
                  jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setPreviewInvoice(null), children: 'Close' }),
                  jsx('button', {
                    type: 'button',
                    className: 'btn btn--primary',
                    onClick: () => {
                      window.print();
                    },
                    children: 'Print Invoice'
                  })
                ]
              })
            ]
          })
        })
    ]
  });
}

// -------------------------------------------------------------------------
// SHARED HELPERS: navigation, file reading, agreement date maths, modal shell
// -------------------------------------------------------------------------
const go = (p) => {
  if (window.__navigate) window.__navigate(p);
  else { history.pushState(null, '', p); window.dispatchEvent(new Event('popstate')); }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const fmtBytes = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

const dataUrlToBlobUrl = (dataUrl) => {
  const [head, b64] = String(dataUrl).split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64 || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
};

const downloadDataUrl = (dataUrl, name) => {
  const a = document.createElement('a');
  a.href = dataUrlToBlobUrl(dataUrl);
  a.download = name || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const utcDay = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
};

// Agreement / contract validity maths — inclusive of both the From and To day.
function agreementStats(from, to, todayMs) {
  const a = utcDay(from);
  const b = utcDay(to);
  if (isNaN(a) || isNaN(b) || b < a) return { valid: false };
  const t0 = new Date();
  const today = todayMs ?? Date.UTC(t0.getFullYear(), t0.getMonth(), t0.getDate());
  const DAY = 86400000;
  const totalDays = Math.round((b - a) / DAY) + 1;
  // calendar duration (end exclusive = To + 1 day)
  const s = new Date(a);
  const e = new Date(b + DAY);
  let months = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
  if (e.getUTCDate() < s.getUTCDate()) months -= 1;
  const anchor = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + months, s.getUTCDate()));
  const days = Math.round((e.getTime() - anchor.getTime()) / DAY);
  const years = Math.floor(months / 12);
  const mo = months % 12;
  const parts = [];
  if (years) parts.push(years + (years === 1 ? ' year' : ' years'));
  if (mo) parts.push(mo + (mo === 1 ? ' month' : ' months'));
  if (days) parts.push(days + (days === 1 ? ' day' : ' days'));
  const durationLabel = parts.join(' ') || '1 day';
  let state;
  let elapsed;
  let remaining;
  let daysToStart = 0;
  let daysOverdue = 0;
  if (today < a) { state = 'Upcoming'; elapsed = 0; remaining = totalDays; daysToStart = Math.round((a - today) / DAY); }
  else if (today > b) { state = 'Expired'; elapsed = totalDays; remaining = 0; daysOverdue = Math.round((today - b) / DAY); }
  else {
    elapsed = Math.round((today - a) / DAY) + 1;
    remaining = totalDays - elapsed;
    state = remaining <= 30 ? 'Expiring Soon' : 'Active';
  }
  return { valid: true, totalDays, durationLabel, elapsed, remaining, daysToStart, daysOverdue, pct: Math.round((elapsed / totalDays) * 100), state };
}

const agreementTone = (state) => (state === 'Active' ? 'good' : state === 'Expiring Soon' ? 'amber' : state === 'Upcoming' ? 'info' : 'warn');

function AgreementCalc({ from, to }) {
  const st = agreementStats(from, to);
  if (!from && !to) return jsx('div', { className: 'ag-calc ag-calc--empty', style: { color: 'var(--muted)', fontSize: 'var(--fs-sm)' }, children: 'Pick the agreement From and To dates to see the duration calculation.' });
  if (!st.valid) return jsx('div', { className: 'ag-calc ag-calc--empty', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)' }, children: 'Enter a valid From date and a To date that is on or after it.' });
  const cell = (k, v, extra) =>
    jsxs('div', {
      className: 'ag-calc__cell',
      children: [
        jsx('small', { className: 'cd-label', children: k }),
        jsx('div', { className: 'cd-value', style: extra || {}, children: v })
      ]
    }, k);
  return jsxs('div', {
    className: 'ag-calc',
    children: [
      jsxs('div', {
        className: 'cd-grid ag-calc__grid',
        children: [
          cell('TOTAL DURATION', st.durationLabel),
          cell('TOTAL DAYS', String(st.totalDays)),
          cell('DAYS ELAPSED', String(st.elapsed)),
          cell(st.state === 'Expired' ? 'DAYS OVERDUE' : st.state === 'Upcoming' ? 'STARTS IN (DAYS)' : 'DAYS REMAINING', String(st.state === 'Expired' ? st.daysOverdue : st.state === 'Upcoming' ? st.daysToStart : st.remaining)),
          jsxs('div', { children: [jsx('small', { className: 'cd-label', children: 'AGREEMENT STATUS' }), jsx('div', { className: 'cd-value', children: jsx(StatusPill, { kind: agreementTone(st.state), children: st.state }) })] }, 'status')
        ]
      }),
      jsxs('div', { className: 'ag-calc__bar', children: [jsxs('div', { className: 'ag-calc__bar-cap', children: [jsx('span', { children: 'Agreement progress' }), jsx('b', { children: `${st.pct}% elapsed` })] }), jsx(ProgressBar, { value: st.pct, tone: st.state === 'Expired' ? 'warn' : st.state === 'Expiring Soon' ? 'amber' : 'cobalt' })] })
    ]
  });
}

function ModalShell({ title, sub, onClose, width = 520, children }) {
  return jsx('div', {
    className: 'scrim',
    style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, overflowY: 'auto' },
    onClick: onClose,
    children: jsxs('div', {
      className: 'card',
      style: { width: '100%', maxWidth: width, padding: 24, margin: 20, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' },
      onClick: (e) => e.stopPropagation(),
      children: [
        jsxs('header', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
          children: [
            jsxs('div', { children: [jsx('h2', { style: { fontSize: 'var(--fs-xl)', fontWeight: 700 }, children: title }), sub ? jsx('p', { style: { color: 'var(--muted)', fontSize: 'var(--fs-sm)' }, children: sub }) : null] }),
            jsx('button', { type: 'button', className: 'ibtn ibtn--bare', 'aria-label': 'Close', onClick: onClose, children: jsx(Icon, { name: 'x' }) })
          ]
        }),
        children
      ]
    })
  });
}

const field = (label, control, span2) => jsxs('label', { className: 'field' + (span2 ? ' span-2' : ''), children: [jsx('span', { children: label }), control] });
const rowActions = (onEdit, onDelete, what) =>
  jsxs('div', {
    style: { display: 'flex', justifyContent: 'flex-end', gap: 6 },
    children: [
      jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare', title: 'Edit ' + what, 'aria-label': 'Edit ' + what, onClick: onEdit, children: jsx(Icon, { name: 'edit' }) }),
      jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare', title: 'Delete ' + what, 'aria-label': 'Delete ' + what, onClick: onDelete, children: jsx(Icon, { name: 'trash' }) })
    ]
  });

// -------------------------------------------------------------------------
// PAGE: Register / Edit Client (full page — replaces the old popup)
// -------------------------------------------------------------------------
const EMPTY_CLIENT_FORM = {
  company: '', name: '', email: '', phone: '', category: 'Startup', gstNumber: '', panNumber: '',
  city: '', website: '', address: '', notes: '', logo: '', agreementFrom: '', agreementTo: '', agreementDocument: null,
  billAmount: '', billGstMode: 'Without GST', billGstRate: 18,
  docs: []
};

let __docKey = 0;
const newDocRow = (over) => ({ key: 'dr' + (++__docKey), id: '', name: '', fileName: '', size: '', type: '', data: '', hasFile: false, ...(over || {}) });

// number of monthly bills an agreement period produces (one per month, anchored on the From day)
function countAgreementMonths(from, to) {
  const a = utcDay(from);
  const b = utcDay(to);
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  const s0 = new Date(a);
  let n = 0;
  for (let i = 0; i < 600; i += 1) {
    const y = s0.getUTCFullYear() + Math.floor((s0.getUTCMonth() + i) / 12);
    const m = (s0.getUTCMonth() + i) % 12;
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const due = Date.UTC(y, m, Math.min(s0.getUTCDate(), dim));
    if (due > b) break;
    n += 1;
  }
  return n;
}

function ClientFormPage({ editId }) {
  const scopeRef = useScopeRef();
  const [f, setF] = useState(EMPTY_CLIENT_FORM);
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);
  const isEdit = !!editId;
  const [mode, setMode] = useFormMode();
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState([]);
  const [refCode] = useState(() => 'REF-' + Math.floor(1000 + Math.random() * 9000));

  useEffect(() => {
    if (!editId) return;
    apiFetch(`${API_BASE}/${editId}`).then((res) => {
      const c = res.data?.data;
      if (res.ok && c) {
        setF({
          company: c.company || '', name: c.name || '', email: c.email || '', phone: c.phone || '', category: c.category || 'Startup',
          gstNumber: c.gstNumber || '', panNumber: c.panNumber || '', city: c.city || '', website: c.website || '', address: c.address || '',
          notes: c.notes || '', logo: c.logo || '', agreementFrom: c.agreementFrom || '', agreementTo: c.agreementTo || '',
          agreementDocument: c.agreementDocument && c.agreementDocument.name ? c.agreementDocument : null,
          billAmount: c.monthlyBilling && c.monthlyBilling.amount ? c.monthlyBilling.amount : '',
          billGstMode: (c.monthlyBilling && c.monthlyBilling.gstMode) || 'Without GST',
          billGstRate: c.monthlyBilling && c.monthlyBilling.gstRate !== undefined ? c.monthlyBilling.gstRate : 18,
          docs: (c.documents || []).map((d) => newDocRow({ id: d.id, name: d.name || '', fileName: d.data || d.hasFile ? `${d.name} (${d.type || 'file'}, ${d.size || ''})` : '', size: d.size || '', type: d.type || '', hasFile: !!(d.data || d.hasFile) }))
        });
      } else toast('Client not found', { icon: 'warn' });
      setLoaded(true);
    });
  }, [editId]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const onLogo = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Logo must be an image file', { icon: 'warn' }); return; }
    if (file.size > 1024 * 1024) { toast('Logo must be smaller than 1 MB', { icon: 'warn' }); return; }
    const data = await readFileAsDataUrl(file);
    setF((p) => ({ ...p, logo: data }));
  };

  const addDocRow = () => setF((p) => ({ ...p, docs: [...p.docs, newDocRow()] }));
  const setDocName = (key, name) => setF((p) => ({ ...p, docs: p.docs.map((d) => (d.key === key ? { ...d, name } : d)) }));
  const removeDocRow = (key) => setF((p) => ({ ...p, docs: p.docs.filter((d) => d.key !== key) }));
  const onDocFile = async (key, e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Each document must be smaller than 5 MB', { icon: 'warn' }); return; }
    const data = await readFileAsDataUrl(file);
    setF((p) => ({
      ...p,
      docs: p.docs.map((d) => (d.key === key ? { ...d, name: d.name || file.name.replace(/\.[^.]+$/, ''), fileName: `${file.name} (${fmtBytes(file.size)})`, size: fmtBytes(file.size), type: (file.name.split('.').pop() || 'FILE').toUpperCase(), data, hasFile: true } : d))
    }));
  };

  const STEP_KEYS = [['company', 'name', 'email', 'phone'], ['agreementFrom', 'agreementTo', 'billAmount', 'billGstRate'], ['docs']];
  const validateAll = () => {
    const er = {};
    if (!f.company.trim()) er.company = 'Company legal name is required';
    if (!f.name.trim()) er.name = 'Primary contact name is required';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'A valid corporate email is required';
    if (!f.phone.trim()) er.phone = 'Phone / hotline is required';
    if (f.agreementFrom && f.agreementTo && f.agreementTo < f.agreementFrom) er.agreementTo = 'To date cannot be before the From date';
    if ((f.agreementFrom && !f.agreementTo) || (!f.agreementFrom && f.agreementTo)) er.agreementTo = 'Provide both From and To dates';
    if (f.billAmount !== '' && !(Number(f.billAmount) >= 0)) er.billAmount = 'Monthly amount must be 0 or more';
    if (Number(f.billAmount) > 0 && (!f.agreementFrom || !f.agreementTo)) er.billAmount = 'Set the agreement From and To dates to bill monthly';
    if (f.billGstMode === 'With GST' && !(Number(f.billGstRate) >= 0 && Number(f.billGstRate) <= 100)) er.billGstRate = 'GST rate must be 0–100';
    const badDoc = f.docs.find((d) => (d.name.trim() && !d.hasFile) || (!d.name.trim() && d.hasFile));
    if (badDoc) er.docs = 'Each document needs both a name and an uploaded file';
    return er;
  };
  const ERR_LABELS = { company: 'Company legal name', name: 'Primary contact', email: 'Corporate email', phone: 'Phone / hotline', agreementFrom: 'Agreement from', agreementTo: 'Agreement to', billAmount: 'Monthly amount', billGstRate: 'GST rate', docs: 'Documents' };
  const toSummary = (er) => Object.keys(er).map((k) => ({ key: k, label: ERR_LABELS[k] || k, message: er[k], step: Math.max(0, STEP_KEYS.findIndex((ks) => ks.includes(k))) }));
  const jumpToError = (er) => {
    if (mode === 'wizard') setStep(er.step);
    setTimeout(() => {
      const el = document.querySelector(`[data-field="${er.key}"], #bill-amount-input, #agreement-from, #doc-rows`);
      const target = document.querySelector(`[data-field="${er.key}"]`) || (er.key === 'billAmount' ? document.getElementById('bill-amount-input') : er.key.startsWith('agreement') ? document.getElementById(er.key === 'agreementFrom' ? 'agreement-from' : 'agreement-to') : el);
      if (target && target.focus) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.focus({ preventScroll: true }); }
    }, 120);
  };
  const fillDemo = () => {
    const d = new Date();
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const end = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate() - 1);
    setErrs({}); setSummary([]);
    setF((prev) => ({
      ...prev, company: 'Apex Tech Solutions Pvt Ltd', name: 'Sarah Jenkins', email: 'sarah.jenkins@apextech.co', phone: '9820011223', category: 'Enterprise',
      gstNumber: '27AAACA1234F1Z5', panNumber: 'AAACA1234F', city: 'Mumbai', website: 'https://apextech.co', address: 'Suite 402, Trade Centre, BKC, Mumbai 400051',
      notes: 'Demo client created with Auto-Fill', agreementFrom: iso(d), agreementTo: iso(end), billAmount: '25000', billGstMode: 'With GST', billGstRate: 18
    }));
    toast('Demo data filled in', { icon: 'check' });
  };

  // Next / step-chip click: validate the step(s) being left, then move
  const goNext = (target) => {
    const er = validateAll();
    const bad = {};
    for (let i = step; i < target; i += 1) STEP_KEYS[i].forEach((k) => { if (er[k]) bad[k] = er[k]; });
    setErrs(bad);
    setSummary(toSummary(bad));
    if (Object.keys(bad).length) { toast('Please fix the highlighted fields', { icon: 'warn' }); return; }
    setStep(target);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'wizard' && step < STEP_KEYS.length - 1) { goNext(step + 1); return; }
    const er = validateAll();
    setErrs(er);
    setSummary(toSummary(er));
    if (Object.keys(er).length) {
      const first = STEP_KEYS.findIndex((ks) => ks.some((k) => er[k]));
      if (mode === 'wizard' && first >= 0) setStep(first);
      toast('Please fix the highlighted fields', { icon: 'warn' });
      return;
    }
    setSaving(true);
    const payload = {
      company: f.company.trim(), name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), category: f.category,
      gstNumber: f.gstNumber.trim(), panNumber: f.panNumber.trim(), city: f.city.trim(), website: f.website.trim(),
      address: f.address.trim(), notes: f.notes.trim(), logo: f.logo, agreementFrom: f.agreementFrom, agreementTo: f.agreementTo,
      documents: f.docs.filter((d) => d.name.trim() && d.hasFile).map((d) => ({ ...(d.id ? { id: d.id } : {}), name: d.name.trim(), ...(d.data ? { data: d.data, size: d.size, type: d.type } : {}) })),
      ...(Number(f.billAmount) > 0 || isEdit ? { monthlyBilling: { amount: Number(f.billAmount) || 0, gstMode: f.billGstMode, gstRate: Number(f.billGstRate) || 0 } } : {})
    };
    const res = await apiFetch(isEdit ? `${API_BASE}/${editId}` : API_BASE, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok && res.data?.data) {
      toast(isEdit ? `${payload.company} updated` : `Client profile created for ${payload.company}`, { icon: 'check' });
      go('/clients/c/' + (res.data.data.clientId || editId));
    } else toast('Failed to save client: ' + (res.error || res.data?.message || 'Server error'), { icon: 'warn' });
  };

  const inp = (k, props) => jsx('input', { className: 'input' + (errs[k] ? ' is-bad' : ''), value: f[k], onChange: set(k), 'data-field': k, ...(props || {}) });
  // span: '' | 'span-2' | 'span-3'
  const lbl = (t) => (String(t).endsWith(' *') ? [String(t).slice(0, -2), jsx('b', { className: 'req', children: ' *' }, 'r')] : t);
  const fld = (label, k, props, span) =>
    jsxs('label', { className: 'field' + (span ? ' ' + span : '') + (errs[k] ? ' is-bad' : ''), children: [jsx('span', { children: lbl(label) }), inp(k, props), errs[k] ? jsx('small', { style: { color: 'var(--red, #ef4444)' }, children: errs[k] }) : null] });
  const fieldS = (label, control, span) => jsxs('label', { className: 'field' + (span ? ' ' + span : ''), children: [jsx('span', { children: label }), control] });

  const initials = (f.company || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'NC';
  const calc = agreementStats(f.agreementFrom, f.agreementTo);
  const billBase = Number(f.billAmount) || 0;
  const billGst = f.billGstMode === 'With GST' ? Math.round(billBase * (Number(f.billGstRate) || 0)) / 100 : 0;
  const nMonths = countAgreementMonths(f.agreementFrom, f.agreementTo);

  const stepIdentity = jsxs(Fragment, {
    children: [
      jsx(Panel, {
        label: 'Brand logo', icon: 'building',
        children: jsxs('div', {
          style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
          children: [
            f.logo
              ? jsx('img', { id: 'logo-preview', src: f.logo, alt: 'Logo preview', style: { width: 72, height: 72, objectFit: 'contain', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--card)' } })
              : jsx('div', { id: 'logo-preview-empty', style: { width: 72, height: 72, borderRadius: 14, border: '1px dashed var(--line-2)', display: 'grid', placeItems: 'center', color: 'var(--muted)', background: 'var(--card)' }, children: jsx(Icon, { name: 'building' }) }),
            jsxs('div', {
              style: { display: 'grid', gap: 8 },
              children: [
                jsx('small', { style: { color: 'var(--muted)' }, children: 'Shown in the Client Directory. PNG, JPG, SVG or WebP up to 1 MB.' }),
                jsxs('div', {
                  style: { display: 'flex', gap: 8, flexWrap: 'wrap' },
                  children: [
                    jsxs('label', { className: 'btn btn--sm btn--primary', style: { cursor: 'pointer' }, children: [jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'upload' }), f.logo ? 'Change Logo' : 'Upload Logo'] }), jsx('input', { type: 'file', id: 'logo-input', accept: 'image/*', onChange: onLogo, style: { display: 'none' } })] }),
                    f.logo ? jsx('button', { type: 'button', className: 'btn btn--sm btn--ghost', id: 'logo-remove', onClick: () => setF((p) => ({ ...p, logo: '' })), children: 'Remove' }) : null
                  ]
                })
              ]
            })
          ]
        })
      }),
      jsx(Panel, {
        label: 'Legal identity', icon: 'note',
        children: jsxs('div', {
          className: 'form-grid form-grid--3', id: 'cf-corporate',
          children: [
            fld('Company Legal Name *', 'company', { placeholder: 'e.g. Acme Technologies Private Limited' }, 'span-2'),
            fieldS('Category Tier', jsxs('select', { className: 'select', value: f.category, onChange: set('category'), children: ['Enterprise', 'SMB', 'Startup'].map((c) => jsx('option', { value: c, children: c }, c)) }))
          ]
        })
      }),
      jsx(Panel, {
        label: 'Primary contact person', icon: 'user',
        children: jsxs('div', {
          className: 'form-grid form-grid--3',
          children: [fld('Primary Contact Full Name *', 'name'), fld('Official Corporate Email *', 'email', { type: 'email' }), fld('Phone / Hotline *', 'phone')]
        })
      }),
      jsx(Panel, {
        label: 'Statutory identifiers & location', icon: 'building',
        children: jsxs('div', {
          className: 'form-grid form-grid--3',
          children: [
            fld('Statutory GSTIN (15-char)', 'gstNumber'), fld('PAN', 'panNumber'), fld('City / Region', 'city'),
            fld('Website URL', 'website'),
            fieldS('Corporate HQ Street Address', jsx('input', { className: 'input', value: f.address, onChange: set('address'), placeholder: 'Suite 402, Trade Centre, BKC, Mumbai 400051' }), 'span-2'),
            fieldS('Notes', jsx('input', { className: 'input', value: f.notes, onChange: set('notes') }), 'span-3')
          ]
        })
      })
    ]
  });

  const stepAgreement = jsxs(Fragment, {
    children: [
      jsx(Panel, {
        label: 'Agreement period', icon: 'calendar',
        children: jsxs('div', {
          style: { display: 'grid', gap: 14 },
          children: [
            jsxs('div', { className: 'form-grid form-grid--3', children: [fld('Agreement From', 'agreementFrom', { type: 'date', id: 'agreement-from' }), fld('Agreement To', 'agreementTo', { type: 'date', id: 'agreement-to', min: f.agreementFrom || undefined })] }),
            jsx(AgreementCalc, { from: f.agreementFrom, to: f.agreementTo })
          ]
        })
      }),
      jsx(Panel, {
        label: 'Monthly payment (optional) — billed every month of the agreement', icon: 'finance', id: 'billing-section',
        children: jsxs('div', {
          style: { display: 'grid', gap: 12 },
          children: [
            jsxs('div', {
              className: 'form-grid form-grid--3',
              children: [
                jsxs('label', { className: 'field' + (errs.billAmount ? ' is-bad' : ''), children: [jsx('span', { children: 'Amount per month (₹)' }), jsx('input', { className: 'input', id: 'bill-amount-input', type: 'number', min: 0, value: f.billAmount, onChange: set('billAmount'), placeholder: 'e.g. 25000' }), errs.billAmount ? jsx('small', { style: { color: 'var(--red, #ef4444)' }, children: errs.billAmount }) : null] }),
                fieldS('GST', jsxs('select', { className: 'select', id: 'bill-gst-select', value: f.billGstMode, onChange: set('billGstMode'), children: [jsx('option', { value: 'Without GST', children: 'Without GST' }), jsx('option', { value: 'With GST', children: 'With GST (added on top)' })] })),
                f.billGstMode === 'With GST' ? jsxs('label', { className: 'field' + (errs.billGstRate ? ' is-bad' : ''), children: [jsx('span', { children: 'GST rate (%)' }), jsx('input', { className: 'input', id: 'bill-rate-input', type: 'number', min: 0, max: 100, value: f.billGstRate, onChange: set('billGstRate') }), errs.billGstRate ? jsx('small', { style: { color: 'var(--red, #ef4444)' }, children: errs.billGstRate }) : null] }) : jsx('span', {})
              ]
            }),
            billBase > 0 && nMonths > 0
              ? jsx('div', { id: 'bill-summary', style: { fontSize: 'var(--fs-sm)', color: 'var(--muted)' }, children: `${nMonths} monthly bills × ${fmtINR(billBase + billGst)}${billGst ? ` (incl. GST ${fmtINR(billGst)})` : ''} = ${fmtINR(Math.round((billBase + billGst) * nMonths * 100) / 100)} over the agreement` })
              : null
          ]
        })
      })
    ]
  });

  const stepDocs = jsx(Panel, {
    label: 'Client documents (PDF, DOC or image, up to 5 MB each)', icon: 'note',
    children: jsxs('div', {
      children: [
        jsx('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }, children: jsx('button', { type: 'button', id: 'doc-row-add', className: 'btn btn--sm btn--primary', onClick: addDocRow, children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Add Document'] }) }) }),
        jsx('div', {
          className: 'table-wrap', style: { margin: 0 },
          children: jsxs('table', {
            className: 'table cd-table cf-docs', id: 'doc-rows',
            children: [
              jsx('thead', { children: jsxs('tr', { children: [jsx('th', { className: 'col-sno', children: 'S NO' }), jsx('th', { children: 'Name' }), jsx('th', { children: 'Upload' }), jsx('th', { style: { textAlign: 'right' }, children: 'Action' })] }) }),
              jsx('tbody', {
                children: f.docs.length
                  ? f.docs.map((d, i) =>
                      jsxs('tr', {
                        'data-doc-row': '',
                        children: [
                          jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${i < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: i + 1 }) }),
                          jsx('td', { children: jsx('input', { className: 'input doc-name-input', value: d.name, placeholder: 'e.g. Master Services Agreement', onChange: (e) => setDocName(d.key, e.target.value) }) }),
                          jsx('td', {
                            children: jsxs('div', {
                              style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
                              children: [
                                jsxs('label', { className: 'btn btn--sm', style: { cursor: 'pointer' }, children: [jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'upload' }), d.hasFile ? 'Replace' : 'Upload'] }), jsx('input', { type: 'file', className: 'doc-file-input', accept: '.pdf,.doc,.docx,.zip,image/*', onChange: (e) => onDocFile(d.key, e), style: { display: 'none' } })] }),
                                d.hasFile ? jsx('span', { className: 'doc-file-label', style: { fontSize: 'var(--fs-sm)' }, children: d.fileName || 'File attached' }) : jsx('span', { style: { color: 'var(--muted)', fontSize: 'var(--fs-sm)' }, children: 'No file chosen' })
                              ]
                            })
                          }),
                          jsx('td', { style: { textAlign: 'right' }, children: jsx('button', { type: 'button', className: 'ibtn ibtn--sm ibtn--bare doc-remove', title: 'Remove document', 'aria-label': 'Remove document', onClick: () => removeDocRow(d.key), children: jsx(Icon, { name: 'trash' }) }) })
                        ]
                      }, d.key)
                    )
                  : [jsx('tr', { className: 'cd-empty-row', children: jsx('td', { colSpan: 4, className: 'cd-empty-td', children: jsx(EmptyState, { icon: 'note', title: 'No documents added', text: 'Click "Add Document" to attach a signed agreement or any client paper.' }) }) }, 'empty')]
              })
            ]
          })
        }),
        errs.docs ? jsx('div', { id: 'docs-error', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)', paddingTop: 10 }, children: errs.docs }) : null
      ]
    })
  });

  const steps = [
    { id: 'identity', label: 'Company Identity', title: 'Company Identity', icon: 'building', desc: 'Brand logo, legal identity, primary contact and statutory identifiers.', accent: 'primary', badge: `Ref: ${isEdit ? editId : refCode}`, content: stepIdentity },
    { id: 'agreement', label: 'Agreement & Billing', title: 'Agreement & Billing', icon: 'calendar', desc: 'Agreement validity and the monthly payment billed across it.', accent: 'emerald', badge: calc.valid ? calc.durationLabel : 'Agreement', content: stepAgreement },
    { id: 'docs', label: 'Documents', title: 'Documents', icon: 'note', desc: 'Signed agreements and other client papers (listed under Contracts).', accent: 'rose', badge: f.docs.some((d) => d.hasFile) ? '✓ Verified' : 'Pending verification', content: stepDocs }
  ];

  const preview = jsx(PreviewCard, {
    avatar: f.logo, initials,
    title: f.company.trim() || 'New Client',
    subtitle: `${f.category}${f.city ? ' · ' + f.city : ''}`,
    tabs: [
      { label: 'Corporate', rows: [['Contact', f.name], ['Email', f.email], ['Phone', f.phone], ['GSTIN', f.gstNumber], ['PAN', f.panNumber]] },
      { label: 'Agreement', rows: [['From', f.agreementFrom], ['To', f.agreementTo], ['Duration', calc.valid ? calc.durationLabel : ''], ['Status', calc.valid ? calc.state : ''], ['Monthly bill', billBase > 0 ? fmtINR(billBase + billGst) + (billGst ? ' (incl. GST)' : '') : '']] },
      { label: 'Documents', rows: [['Verification', f.docs.some((d) => d.hasFile) ? 'Verified' : 'Pending'], ...(f.docs.length ? f.docs.map((d, i) => [`${i + 1}. ${d.name || 'Untitled'}`, d.hasFile ? 'Attached' : 'No file']) : [])] }
    ]
  });

  return jsxs('div', {
    className: 'page',
    ref: scopeRef,
    children: [
      !loaded
        ? jsx('div', { style: { padding: 24, color: 'var(--muted)' }, children: 'Loading client…' })
        : jsx('form', {
            onSubmit: submit,
            id: 'client-form',
            noValidate: true,
            children: jsx(FormWizard, {
              icon: 'building',
              title: isEdit ? 'Edit Client Profile' : 'Add New Client',
              titleBadge: 'Client & Agreement Setup',
              subtitle: 'Register the company, configure the agreement and monthly billing, and attach client documents.',
              headerExtra: isEdit ? null : jsx('button', { type: 'button', className: 'wz-demo', id: 'wz-demo', onClick: fillDemo, children: [jsx(Icon, { name: 'sparkle' }), 'Auto-Fill Demo Data'] }),
              steps, step, setStep, mode, setMode, preview,
              backLabel: 'Back',
              onBack: () => go(isEdit ? '/clients/c/' + editId : '/clients/companies'),
              onCancel: () => go(isEdit ? '/clients/c/' + editId : '/clients/companies'),
              onNext: goNext,
              submitLabel: isEdit ? 'Save Changes' : 'Register Client',
              saving
            })
          })
    ]
  });
}

// -------------------------------------------------------------------------
// PAGE: Service Type master — full CRUD. Only ACTIVE types feed the
// Login Credentials "Service Type" dropdown.
// -------------------------------------------------------------------------
const SVC_API = '/api/service-types';

function ServiceTypesPage() {
  const scopeRef = useScopeRef();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | { id?, name, code, description, status }
  const [err, setErr] = useState('');
  const paged = usePaged(SVC_API, { q: q.trim(), status: statusFilter === 'All' ? '' : statusFilter }, { noun: 'service types' });
  const loading = paged.loading;
  const shown = paged.rows;
  const offset = paged.pagination ? paged.pagination.from - 1 : 0;
  const load = () => paged.reload();
  const kp = paged.kpis || { total: 0, active: 0 };

  const open = (r) => { setErr(''); setModal(r ? { id: r._id, name: r.name, code: r.code || '', description: r.description || '', status: r.status } : { name: '', code: '', description: '', status: 'Active' }); };

  const save = async (e) => {
    e.preventDefault();
    if (!modal.name.trim()) { setErr('Service type name is required'); return; }
    const res = await apiFetch(modal.id ? `${SVC_API}/${modal.id}` : SVC_API, {
      method: modal.id ? 'PUT' : 'POST',
      body: JSON.stringify({ name: modal.name.trim(), code: modal.code.trim(), description: modal.description.trim(), status: modal.status })
    });
    if (res.ok) { toast(modal.id ? 'Service type updated' : 'Service type created', { icon: 'check' }); setModal(null); load(); }
    else setErr(res.data?.message || res.error || 'Failed to save');
  };

  const toggle = async (r) => {
    const next = r.status === 'Active' ? 'Inactive' : 'Active';
    const res = await apiFetch(`${SVC_API}/${r._id}`, { method: 'PUT', body: JSON.stringify({ status: next }) });
    if (res.ok) { toast(`${r.name} is now ${next}`, { icon: 'check' }); load(); }
  };

  const del = async (r) => {
    if (!(await window.themedConfirm(`Delete service type "${r.name}"?`))) return;
    const res = await apiFetch(`${SVC_API}/${r._id}`, { method: 'DELETE' });
    if (res.ok) { toast('Service type deleted', { icon: 'trash' }); load(); }
    else toast('Failed to delete service type', { icon: 'warn' });
  };

  return jsxs('div', {
    className: 'page',
    ref: scopeRef,
    children: [
      jsx(PageHeader, {
        crumbs: [{ label: 'Clients', href: '/clients/companies' }, { label: 'Service Types' }],
        title: 'Service Type Master',
        sub: `${kp.total} service types · ${kp.active} active. Only active types are offered when storing client login credentials.`
      }),
      jsx(Card, {
        title: 'Service Types',
        sub: 'Categories of systems and platforms a client login belongs to.',
        tools: jsxs('div', {
          style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
          children: [
            jsx('input', { className: 'input', id: 'svc-search', placeholder: 'Search service types…', value: q, onChange: (e) => setQ(e.target.value), style: { height: 34, width: 220 } }),
            jsxs('select', { className: 'select', id: 'svc-filter', value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), style: { height: 34, width: 150 }, children: ['All', 'Active', 'Inactive'].map((s) => jsx('option', { value: s, children: s === 'All' ? 'All statuses' : s }, s)) }),
            jsx('button', { type: 'button', id: 'svc-add', className: 'btn btn--sm btn--primary', onClick: () => open(null), children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Add Service Type'] }) })
          ]
        }),
        flush: true,
        children: jsx('div', {
          className: 'table-wrap',
          children: jsxs('table', {
            className: 'table cd-table',
            id: 'svc-table',
            children: [
              jsx('thead', { children: jsxs('tr', { children: [jsx('th', { className: 'col-sno', children: 'S NO' }), jsx('th', { children: 'Service Type' }), jsx('th', { children: 'Code' }), jsx('th', { children: 'Description' }), jsx('th', { children: 'Status' }), jsx('th', { style: { textAlign: 'right' }, children: 'Actions' })] }) }),
              jsx('tbody', {
                children: loading
                  ? [jsx('tr', { children: jsx('td', { colSpan: 6, style: { padding: 24, color: 'var(--muted)' }, children: 'Loading…' }) }, 'l')]
                  : shown.length
                    ? shown.map((r, i) =>
                        jsxs('tr', {
                          'data-svc': r.name,
                          children: [
                            jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${i + offset < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: i + offset + 1 }) }),
                            jsx('td', { children: jsx('b', { children: r.name }) }),
                            jsx('td', { children: jsx('span', { style: { fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }, children: r.code || '—' }) }),
                            jsx('td', { children: jsx('span', { style: { fontSize: 'var(--fs-sm)', color: 'var(--muted)' }, children: r.description || '—' }) }),
                            jsx('td', { children: jsx('button', { type: 'button', className: 'svc-status', title: 'Click to toggle status', onClick: () => toggle(r), style: { background: 'none', border: 0, cursor: 'pointer', padding: 0 }, children: jsx(StatusPill, { kind: r.status === 'Active' ? 'good' : 'warn', children: r.status }) }) }),
                            jsx('td', { style: { textAlign: 'right' }, children: rowActions(() => open(r), () => del(r), 'service type') })
                          ]
                        }, r._id)
                      )
                    : [jsx('tr', { className: 'cd-empty-row', children: jsx('td', { colSpan: 6, className: 'cd-empty-td', children: jsx(EmptyState, { icon: 'settings', title: 'No service types found', text: 'Add a service type or adjust the filters.' }) }) }, 'e')]
              })
            ]
          })
        })
      }),
      paged.pager ? jsx('div', { className: 'pager-slot', children: paged.pager }) : null,
      modal &&
        jsx(ModalShell, {
          title: modal.id ? 'Edit Service Type' : 'Add Service Type',
          onClose: () => setModal(null),
          width: 460,
          children: jsxs('form', {
            onSubmit: save,
            id: 'svc-form',
            noValidate: true,
            children: [
              jsxs('div', {
                className: 'form-grid',
                children: [
                  field('Service Type Name *', jsx('input', { className: 'input', id: 'svc-name', value: modal.name, onChange: (e) => setModal({ ...modal, name: e.target.value }), placeholder: 'e.g. Azure Cloud' }), true),
                  field('Code', jsx('input', { className: 'input', id: 'svc-code', value: modal.code, onChange: (e) => setModal({ ...modal, code: e.target.value }) })),
                  field('Status', jsxs('select', { className: 'select', id: 'svc-status-select', value: modal.status, onChange: (e) => setModal({ ...modal, status: e.target.value }), children: [jsx('option', { value: 'Active', children: 'Active' }), jsx('option', { value: 'Inactive', children: 'Inactive' })] })),
                  field('Description', jsx('input', { className: 'input', id: 'svc-desc', value: modal.description, onChange: (e) => setModal({ ...modal, description: e.target.value }) }), true)
                ]
              }),
              err ? jsx('div', { id: 'svc-error', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)', marginTop: 10 }, children: err }) : null,
              jsxs('div', {
                style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
                children: [
                  jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setModal(null), children: 'Cancel' }),
                  jsx('button', { type: 'submit', id: 'svc-save', className: 'btn btn--primary', children: modal.id ? 'Save Changes' : 'Create Service Type' })
                ]
              })
            ]
          })
        })
    ]
  });
}

// -------------------------------------------------------------------------
// PAGE: Project Stage master — full CRUD. Only ACTIVE stages can be picked
// when setting up a project's completion timeline.
// -------------------------------------------------------------------------
const STG_API = '/api/project-stages';

function ProjectStagesPage() {
  const scopeRef = useScopeRef();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState('');
  const paged = usePaged(STG_API, { q: q.trim(), status: statusFilter === 'All' ? '' : statusFilter }, { noun: 'stages' });
  const rows = paged.rows;
  const offset = paged.pagination ? paged.pagination.from - 1 : 0;

  const open = (r) => { setErr(''); setModal(r ? { id: r._id, name: r.name, description: r.description || '', sequence: r.sequence ?? 0, status: r.status } : { name: '', description: '', sequence: '', status: 'Active' }); };
  const save = async (e) => {
    e.preventDefault();
    if (!modal.name.trim()) { setErr('Stage name is required'); return; }
    const res = await apiFetch(modal.id ? `${STG_API}/${modal.id}` : STG_API, {
      method: modal.id ? 'PUT' : 'POST',
      body: JSON.stringify({ name: modal.name.trim(), description: modal.description.trim(), sequence: modal.sequence === '' ? undefined : Number(modal.sequence), status: modal.status })
    });
    if (res.ok) { toast(modal.id ? 'Stage updated' : 'Stage created', { icon: 'check' }); setModal(null); paged.reload(); }
    else setErr(res.data?.message || res.error || 'Failed to save');
  };
  const toggle = async (r) => {
    const next = r.status === 'Active' ? 'Inactive' : 'Active';
    const res = await apiFetch(`${STG_API}/${r._id}`, { method: 'PUT', body: JSON.stringify({ status: next }) });
    if (res.ok) { toast(`${r.name} is now ${next}`, { icon: 'check' }); paged.reload(); }
  };
  const del = async (r) => {
    if (!(await window.themedConfirm(`Delete project stage "${r.name}"?`))) return;
    const res = await apiFetch(`${STG_API}/${r._id}`, { method: 'DELETE' });
    if (res.ok) { toast('Project stage deleted', { icon: 'trash' }); paged.reload(); }
    else toast('Failed to delete stage', { icon: 'warn' });
  };

  return jsxs('div', {
    className: 'page',
    ref: scopeRef,
    children: [
      jsx(PageHeader, {
        crumbs: [{ label: 'Clients', href: '/clients/companies' }, { label: 'Project Stages' }],
        title: 'Project Stage Master',
        sub: `${paged.pagination ? paged.pagination.total : 0} stages. Only active stages can be selected when setting up a project's completion timeline.`
      }),
      jsx(Card, {
        title: 'Project Stages',
        sub: 'The categories a project moves through — each project picks its own set of stages.',
        tools: jsxs('div', {
          style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
          children: [
            jsx('input', { className: 'input', id: 'stg-search', placeholder: 'Search stages…', value: q, onChange: (e) => setQ(e.target.value), style: { height: 34, width: 220 } }),
            jsxs('select', { className: 'select', id: 'stg-filter', value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), style: { height: 34, width: 150 }, children: ['All', 'Active', 'Inactive'].map((s) => jsx('option', { value: s, children: s === 'All' ? 'All statuses' : s }, s)) }),
            jsx('button', { type: 'button', id: 'stg-add', className: 'btn btn--sm btn--primary', onClick: () => open(null), children: jsxs('span', { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [jsx(Icon, { name: 'plus' }), 'Add Stage'] }) })
          ]
        }),
        flush: true,
        children: jsx('div', {
          className: 'table-wrap',
          children: jsxs('table', {
            className: 'table cd-table',
            id: 'stg-table',
            children: [
              jsx('thead', { children: jsxs('tr', { children: [jsx('th', { className: 'col-sno', children: 'S NO' }), jsx('th', { children: 'Sequence' }), jsx('th', { children: 'Stage' }), jsx('th', { children: 'Description' }), jsx('th', { children: 'Status' }), jsx('th', { style: { textAlign: 'right' }, children: 'Actions' })] }) }),
              jsx('tbody', {
                children: paged.loading
                  ? [jsx('tr', { children: jsx('td', { colSpan: 6, style: { padding: 24, color: 'var(--muted)' }, children: 'Loading…' }) }, 'l')]
                  : rows.length
                    ? rows.map((r, i) =>
                        jsxs('tr', {
                          'data-stage': r.name,
                          children: [
                            jsx('td', { className: 'col-sno', children: jsx('span', { className: `sno-pill ${i + offset < 3 ? 'sno-pill--top' : 'sno-pill--normal'}`, children: i + offset + 1 }) }),
                            jsx('td', { children: jsx('span', { style: { fontFamily: 'monospace' }, children: r.sequence }) }),
                            jsx('td', { children: jsx('b', { children: r.name }) }),
                            jsx('td', { children: jsx('span', { style: { fontSize: 'var(--fs-sm)', color: 'var(--muted)' }, children: r.description || '—' }) }),
                            jsx('td', { children: jsx('button', { type: 'button', className: 'stg-status', title: 'Click to toggle status', onClick: () => toggle(r), style: { background: 'none', border: 0, cursor: 'pointer', padding: 0 }, children: jsx(StatusPill, { kind: r.status === 'Active' ? 'good' : 'warn', children: r.status }) }) }),
                            jsx('td', { style: { textAlign: 'right' }, children: rowActions(() => open(r), () => del(r), 'stage') })
                          ]
                        }, r._id)
                      )
                    : [jsx('tr', { className: 'cd-empty-row', children: jsx('td', { colSpan: 6, className: 'cd-empty-td', children: jsx(EmptyState, { icon: 'projects', title: 'No project stages found', text: 'Add a stage or adjust the filters.' }) }) }, 'e')]
              })
            ]
          })
        })
      }),
      paged.pager ? jsx('div', { className: 'pager-slot', children: paged.pager }) : null,
      modal &&
        jsx(ModalShell, {
          title: modal.id ? 'Edit Project Stage' : 'Add Project Stage',
          onClose: () => setModal(null),
          width: 460,
          children: jsxs('form', {
            onSubmit: save, id: 'stg-form', noValidate: true,
            children: [
              jsxs('div', {
                className: 'form-grid',
                children: [
                  field('Stage Name *', jsx('input', { className: 'input', id: 'stg-name', value: modal.name, onChange: (e) => setModal({ ...modal, name: e.target.value }), placeholder: 'e.g. Quality Review' }), true),
                  field('Sequence', jsx('input', { className: 'input', id: 'stg-seq', type: 'number', min: 0, value: modal.sequence, onChange: (e) => setModal({ ...modal, sequence: e.target.value }), placeholder: 'auto' })),
                  field('Status', jsxs('select', { className: 'select', id: 'stg-status-select', value: modal.status, onChange: (e) => setModal({ ...modal, status: e.target.value }), children: [jsx('option', { value: 'Active', children: 'Active' }), jsx('option', { value: 'Inactive', children: 'Inactive' })] })),
                  field('Description', jsx('input', { className: 'input', id: 'stg-desc', value: modal.description, onChange: (e) => setModal({ ...modal, description: e.target.value }) }), true)
                ]
              }),
              err ? jsx('div', { id: 'stg-error', style: { color: 'var(--red, #ef4444)', fontSize: 'var(--fs-sm)', marginTop: 10 }, children: err }) : null,
              jsxs('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, children: [jsx('button', { type: 'button', className: 'btn btn--ghost', onClick: () => setModal(null), children: 'Cancel' }), jsx('button', { type: 'submit', id: 'stg-save', className: 'btn btn--primary', children: modal.id ? 'Save Changes' : 'Create Stage' })] })
            ]
          })
        })
    ]
  });
}

export default function ClientsPage({ route }) {
  const globalState = useGlobalState();

  // (hook must run before any early return) the People directory was unified: /clients/people and /clients/companies both render Client Directory cleanly without reload
  useEffect(() => {
    if (route.sub === 'people') {
      try { history.replaceState(null, '', '/clients/companies'); } catch (e) {}
    }
  }, [route.sub]);

  // If sub is 'c' -> render Client 360° Command Center (`me`)
  if (route.sub === 'c') {
    return jsx(Client360CommandCenter, { id: route.param }, route.param);
  }

  if (route.sub === 'new') return jsx(ClientFormPage, {}, 'new');
  if (route.sub === 'edit') return jsx(ClientFormPage, { editId: route.param }, 'edit-' + route.param);
  if (route.sub === 'service-types') return jsx(ServiceTypesPage, {}, 'svc');
  if (route.sub === 'project-stages') return jsx(ProjectStagesPage, {}, 'stg');

  return jsxs('div', {
    className: 'page',
    children: [
      jsx(PageHeader, {
        crumbs: [{ label: 'Clients' }, { label: 'Client Directory' }],
        title: 'Client Directory Master',
        sub: 'Institutional client portfolio, corporate coordinates, financial ledger telemetries, and 360° management.'
      }),
      jsx(ClientDirectoryMaster, { openId: route.param }, 'c')
    ]
  });
}
