import {
  A as e,
  D as t,
  Ft as n,
  K as r,
  Mt as i,
  O as a,
  P as o,
  R as s,
  S as c,
  U as l,
  Y as u,
  _ as d,
  h as f,
  l as p,
  m,
  r as h,
  t as g,
  v as _,
  vt as v,
  y,
  yt as b
} from './ui-D4_WaMI9.js';
import { n as x, t as S } from './index-DG0_cRQu.js';

var C = n();
var w = b();



/* Theme palette picker: preset swatches + custom hex pill (colour wheel + editable hex). */
const PALETTE_PRESETS = ['#1f2937', '#347571', '#3f8447', '#96c941', '#a55621', '#d9642b', '#ac2b41', '#8a3de0', '#7627c4', '#2a4fd2', '#3a62e5', '#3883c3'];
const normHex = (v) => { const m = /^#?([0-9a-fA-F]{6})$/.exec(String(v || '').trim()); return m ? '#' + m[1].toLowerCase() : null; };
function ColorPalette({ value, onChange, name }) {
  const cur = normHex(value);
  const pick = (hex) => onChange(hex);
  return (0, w.jsxs)('div', {
    className: 'palette',
    'data-palette': name,
    role: 'radiogroup',
    'aria-label': name + ' colour',
    children: [
      (0, w.jsx)('div', {
        className: 'palette__swatches',
        children: PALETTE_PRESETS.map((hex) =>
          (0, w.jsx)('button', {
            key: hex, type: 'button', role: 'radio', 'aria-checked': cur === hex, title: hex.toUpperCase(),
            className: 'palette__sw' + (cur === hex ? ' is-on' : ''), 'data-color': hex, style: { background: hex },
            onClick: () => pick(hex),
            children: cur === hex ? (0, w.jsx)('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', children: (0, w.jsx)('path', { d: 'm5 12.5 4.5 4.5L19 7.5' }) }) : null
          })
        ).concat(
          cur && !PALETTE_PRESETS.includes(cur)
            ? [(0, w.jsx)('button', { key: 'custom', type: 'button', role: 'radio', 'aria-checked': 'true', title: cur.toUpperCase(), className: 'palette__sw is-on', 'data-color': cur, style: { background: cur }, onClick: () => pick(cur), children: (0, w.jsx)('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', children: (0, w.jsx)('path', { d: 'm5 12.5 4.5 4.5L19 7.5' }) }) })]
            : []
        )
      }),
      (0, w.jsxs)('label', {
        className: 'palette__hex',
        children: [
          (0, w.jsxs)('span', {
            className: 'palette__ico',
            children: [
              (0, w.jsxs)('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', children: [(0, w.jsx)('path', { d: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.7 1.8-1.7H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7Z' }), (0, w.jsx)('circle', { cx: 7.5, cy: 11, r: 1 }), (0, w.jsx)('circle', { cx: 10.5, cy: 7, r: 1 }), (0, w.jsx)('circle', { cx: 15, cy: 7.5, r: 1 })] }),
              (0, w.jsx)('input', { type: 'color', className: 'palette__wheel', 'aria-label': 'Open colour picker', value: cur || '#4d33b6', onChange: (ev) => pick(ev.target.value.toLowerCase()) })
            ]
          }),
          (0, w.jsx)('input', { className: 'palette__input', value: value || '', placeholder: '#4D33B6', maxLength: 7, spellCheck: false, 'aria-label': 'Hex colour', onChange: (ev) => onChange(ev.target.value) })
        ]
      })
    ]
  });
}

/* One themed container per group of settings (icon tile + title + description, then the fields). */
function AdminGroup({ icon, title, desc, children }) {
  return (0, w.jsxs)('section', {
    className: 'admin-group',
    'data-group': title,
    children: [
      (0, w.jsxs)('header', {
        className: 'admin-group__head',
        children: [
          (0, w.jsx)('span', { className: 'admin-group__ico', children: (0, w.jsx)(v, { name: icon }) }),
          (0, w.jsxs)('div', {
            className: 'admin-group__txt',
            children: [
              (0, w.jsx)('h3', { className: 'admin-group__title', children: title }),
              (0, w.jsx)('p', { className: 'admin-group__desc', children: desc })
            ]
          })
        ]
      }),
      (0, w.jsx)('div', { className: 'form-grid admin-group__body', children })
    ]
  });
}

// Admin Sections Definition (13 Platform Configuration Sections)
var ADMIN_SECTIONS = [
  { id: 'theme', num: '1', label: 'Web Appearance', shortLabel: 'Web Appearance', icon: 'sun', desc: 'Theme tokens, color palette, mode schedules, and typography' },
  { id: 'smtp', num: '2', label: 'SMTP Server', shortLabel: 'SMTP Server', icon: 'mail', desc: 'Outbound email gateway, mail server host, port, credentials' },
  { id: 'msg91', num: '3', label: 'MSG91 SMS', shortLabel: 'MSG91 SMS', icon: 'phone', desc: 'Transactional SMS alerts, authorization keys, and DLT templates' },
  { id: 'otp', num: '4', label: 'OTP Policy', shortLabel: 'OTP Policy', icon: 'lock', desc: 'One-time passcode length, validity duration, and resend limits' },
  { id: 'firebase', num: '5', label: 'Firebase Push', shortLabel: 'Firebase Push', icon: 'bell', desc: 'Web push notifications, project IDs, VAPID keys, and service account' },
  { id: 'mobileapp', num: '6', label: 'Mobile Apps Sync', shortLabel: 'Mobile Apps Sync', icon: 'smartphone', desc: 'Client application titles, semantic release builds, and direct APK URLs' },
  { id: 'navigation', num: '7', label: 'Page Visibility', shortLabel: 'Page Visibility', icon: 'globe', desc: 'Public display and navigation toggles for site pages and modules' },
  { id: 'desktop', num: '8', label: 'Desktop Updates', shortLabel: 'Desktop Updates', icon: 'download', desc: 'Desktop binary release channels, auto-update policies, and download endpoints' },
  { id: 'razorpay', num: '9', label: 'Razorpay Gateway', shortLabel: 'Razorpay Gateway', icon: 'card', desc: 'Payment merchant credentials and in-app checkout toggles' },
  { id: 'security', num: '10', label: 'Security & Anti-Fraud', shortLabel: 'Security & Anti-Fraud', icon: 'lock', desc: 'DevTools guard, window screenshot protection, and Google reCAPTCHA' }
];

var OTHER_PAGES = [
  { id: 'appearance', label: 'Appearance', icon: 'sun' },
];

var T = [
  ...ADMIN_SECTIONS.map(s => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    href: '/settings/' + s.id
  })),
  ...OTHER_PAGES.map(s => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    href: '/settings/' + s.id
  }))
];

function E({ route: e }) {
  // Standalone Profile page (sidebar link: /profile)
  if (e.page === 'profile') {
    return (0, w.jsxs)('div', {
      className: 'page st',
      children: [
        (0, w.jsx)(m, {
          crumbs: [{ label: 'Studio' }, { label: 'Profile', href: '/profile' }],
          title: 'Profile',
          sub: 'Your account details, role, and sign-in security.'
        }),
        (0, w.jsx)(O, {})
      ]
    });
  }

  let activeTab = 'theme';

  if (ADMIN_SECTIONS.some(s => s.id === e.sub)) {
    activeTab = e.sub;
  } else if (OTHER_PAGES.some(s => s.id === e.sub)) {
    activeTab = e.sub;
  } else if (e.sub === 'admin') {
    if (e.param && ADMIN_SECTIONS.some(s => s.id === e.param)) {
      activeTab = e.param;
    } else {
      activeTab = 'theme';
    }
  } else if (!e.sub) {
    activeTab = 'theme';
  }

  let isAdminSection = ADMIN_SECTIONS.some(s => s.id === activeTab);
  let activeAdminDef = ADMIN_SECTIONS.find(s => s.id === activeTab) || ADMIN_SECTIONS[0];

  return (0, w.jsxs)('div', {
    className: 'page st',
    children: [
      (0, w.jsx)(m, {
        crumbs: [
          { label: 'Studio' },
          { label: 'Settings', href: '/settings/theme' },
          ...(isAdminSection ? [{ label: activeAdminDef.shortLabel || activeAdminDef.label }] : [{ label: (OTHER_PAGES.find(p => p.id === activeTab) || {}).label || activeTab }])
        ],
        title: 'Settings & Platform Configuration',
        sub: 'Admin settings, platform gateways, security, communication channels, and appearance.'
      }),
      (0, w.jsx)(y, {
        active: activeTab,
        label: 'Settings sections',
        items: T
      }),
      (0, w.jsxs)(D, {
        children: [
          isAdminSection && (0, w.jsx)(AdminSettingsHub, {
            activeSection: activeTab,
            onSelectSection: (id) => {
              if (window.__navigate) window.__navigate('/settings/' + id);
              else {
                history.pushState(null, '', '/settings/' + id);
                window.dispatchEvent(new Event('popstate'));
              }
            }
          }),
          activeTab === 'profile' && (0, w.jsx)(O, {}),
          activeTab === 'notifications' && (0, w.jsx)(N, {}),
          activeTab === 'appearance' && (0, w.jsx)(F, {}),
        ]
      }, activeTab)
    ]
  });
}

function D({ children: e }) {
  return (0, w.jsx)('div', { className: 'st-section', ref: a({ title: !1 }), children: e });
}

// -------------------------------------------------------------
// COMPREHENSIVE ADMIN SETTINGS HUB (CONNECTED WITH MONGODB API)
// -------------------------------------------------------------
function AdminSettingsHub({ activeSection, onSelectSection }) {
  let [settings, setSettings] = (0, C.useState)(null);
  let [loading, setLoading] = (0, C.useState)(!0);
  let [saving, setSaving] = (0, C.useState)(!1);
  let [dbStatus, setDbStatus] = (0, C.useState)({ connected: !1, name: 'connecting...' });
  let [gstRates, setGstRates] = (0, C.useState)([]);
  let [newRate, setNewRate] = (0, C.useState)({
    hsnCode: '',
    gstRate: '',
    taxType: 'Standard',
    serviceName: '',
    status: 'Active',
    isDefault: !1
  });

  // Load settings and GST rates from MongoDB API
  let loadSettings = async () => {
    try {
      setLoading(!0);
      let res = await fetch('/api/settings');
      let data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
      }
      
      let hRes = await fetch('/api/health');
      let hData = await hRes.json();
      if (hData.database) {
        setDbStatus({
          connected: hData.database.connection === 'connected',
          name: hData.database.name || 'aedentek_crm'
        });
      }

      let rRes = await fetch('/api/gst-rates');
      let rData = await rRes.json();
      if (rData.success && rData.data) {
        setGstRates(rData.data);
      }
    } catch (err) {
      console.warn('API fetch warning, fallback to default state:', err);
    } finally {
      setLoading(!1);
    }
  };

  (0, C.useEffect)(() => {
    loadSettings();
  }, []);

  let updateField = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev ? prev[section] : {}),
        [field]: value
      }
    }));
  };

  let saveSection = async (sectionKey) => {
    try {
      setSaving(!0);
      let payload = settings ? settings[sectionKey] : {};
      let res = await fetch(`/api/settings/${sectionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = await res.json();
      if (data.success) {
        let secName = ADMIN_SECTIONS.find(s => s.id === sectionKey)?.label || sectionKey;
        t(`${secName} saved to MongoDB`, { icon: 'check' });
      } else {
        t(data.message || 'Error saving settings', { icon: 'x' });
      }
    } catch (err) {
      t('Failed to save settings to API', { icon: 'x' });
    } finally {
      setSaving(!1);
    }
  };

  // The Web Appearance tab now hosts the Platform Identity (general) and Social Media (social)
  // field groups, so saving that tab persists all three section keys.
  let activeSaveKeys = () => activeDef.id === 'theme' ? ['theme', 'general', 'social'] : [activeDef.id];
  let saveGroup = async () => {
    for (const key of activeSaveKeys()) {
      await saveSection(key);
    }
  };

  let resetAll = async () => {
    if (!(await window.themedConfirm('Are you sure you want to reset all admin settings to clean non-static defaults?'))) return;
    try {
      let res = await fetch('/api/settings/reset', { method: 'POST' });
      let data = await res.json();
      if (data.success) {
        setSettings(data.data);
        t('All settings reset to non-static defaults', { icon: 'reset' });
      }
    } catch (err) {
      t('Error resetting settings', { icon: 'x' });
    }
  };

  let handleAddGstRate = async (ev) => {
    if (ev) ev.preventDefault();
    if (!newRate.hsnCode || !newRate.serviceName || newRate.gstRate === '') {
      t('Please enter HSN code, Service description, and GST rate', { icon: 'warn' });
      return;
    }
    try {
      let payload = {
        ...newRate,
        gstRate: Number(newRate.gstRate)
      };
      let res = await fetch('/api/gst-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = await res.json();
      if (data.success) {
        t('GST Tax Rate slab created in MongoDB', { icon: 'check' });
        setNewRate({ hsnCode: '', gstRate: '', taxType: 'Standard', serviceName: '', status: 'Active', isDefault: !1 });
        let rRes = await fetch('/api/gst-rates');
        let rData = await rRes.json();
        if (rData.data) setGstRates(rData.data);
      }
    } catch (err) {
      t('Error adding GST slab', { icon: 'x' });
    }
  };

  let handleDeleteGstRate = async (id) => {
    try {
      let res = await fetch(`/api/gst-rates/${id}`, { method: 'DELETE' });
      let data = await res.json();
      if (data.success) {
        t('GST Slab deleted', { icon: 'trash' });
        setGstRates(prev => prev.filter(r => r._id !== id));
      }
    } catch (err) {
      t('Error deleting slab', { icon: 'x' });
    }
  };

  let activeDef = ADMIN_SECTIONS.find(s => s.id === activeSection) || ADMIN_SECTIONS[0];
  let curData = settings ? (settings[activeDef.id] || {}) : {};
  let gd = settings ? (settings['general'] || {}) : {};
  let sd = settings ? (settings['social'] || {}) : {};

  (0, C.useEffect)(() => {
    let handleReset = () => resetAll();
    let handleSave = () => saveGroup();
    window.addEventListener('adminResetSettings', handleReset);
    window.addEventListener('adminSaveActiveSettings', handleSave);
    return () => {
      window.removeEventListener('adminResetSettings', handleReset);
      window.removeEventListener('adminSaveActiveSettings', handleSave);
    };
  }, [activeDef.id, settings]);

  return (0, w.jsxs)('div', {
    className: 'admin-hub',
    children: [
      // BENTO TELEMETRY CARDS (MATCHING DASHBOARD & CLIENT 360 AESTHETIC)
      (0, w.jsxs)('div', {
        className: 'kpis',
        style: { marginBottom: '20px' },
        children: [
          (0, w.jsxs)('div', {
            className: 'kpi',
            'data-tone': 'cobalt',
            children: [
              (0, w.jsx)('div', { className: 'kpi__label', children: 'DATABASE ENGINE' }),
              (0, w.jsx)('div', { className: 'kpi__value', style: { fontSize: 'var(--fs-2xl)' }, children: 'MongoDB' }),
              (0, w.jsxs)('div', {
                className: 'kpi__meta',
                style: { display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' },
                children: [
                  (0, w.jsx)('span', { style: { width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 } }),
                  (0, w.jsx)('span', { style: { color: 'var(--good)', fontWeight: 600 }, children: 'Connected' }),
                  (0, w.jsx)('span', { style: { opacity: 0.65 }, children: '· aedentek_crm' })
                ]
              })
            ]
          }),
          (0, w.jsxs)('div', {
            className: 'kpi',
            'data-tone': 'citron',
            children: [
              (0, w.jsx)('div', { className: 'kpi__label', children: 'PLATFORM MODULES' }),
              (0, w.jsx)('div', { className: 'kpi__value', style: { fontSize: 'var(--fs-2xl)' }, children: '10 Active' }),
              (0, w.jsx)('div', { className: 'kpi__meta', children: 'All 10 admin modules healthy' })
            ]
          }),
          (0, w.jsxs)('div', {
            className: 'kpi',
            children: [
              (0, w.jsx)('div', { className: 'kpi__label', children: 'GATEWAYS & COMMS' }),
              (0, w.jsx)('div', { className: 'kpi__value', style: { fontSize: 'var(--fs-2xl)' }, children: 'Live' }),
              (0, w.jsx)('div', { className: 'kpi__meta', children: 'SMTP · MSG91 SMS · Razorpay' })
            ]
          }),
          (0, w.jsxs)('div', {
            className: 'kpi',
            children: [
              (0, w.jsx)('div', { className: 'kpi__label', children: 'SECURITY GUARD' }),
              (0, w.jsx)('div', { className: 'kpi__value', style: { fontSize: 'var(--fs-2xl)' }, children: 'Guarded' }),
              (0, w.jsx)('div', { className: 'kpi__meta', children: 'Anti-Fraud & DevTools Active' })
            ]
          })
        ]
      }),


      // SECTION CONTENT CARD
      (0, w.jsxs)(h, {
        title: activeDef.id === 'theme' ? undefined : activeDef.label,
        sub: activeDef.id === 'theme' ? undefined : activeDef.desc,
        className: activeDef.id === 'theme' ? 'admin-card--groups' : '',
        tools: activeDef.id === 'theme' ? undefined : (0, w.jsx)('div', {
          className: 'row',
          style: { gap: '8px', alignItems: 'center' },
          children: [
            (0, w.jsx)('span', {
              className: 'chip',
              style: { fontSize: '12px', fontWeight: 600, padding: '4px 10px', height: 'auto', background: 'var(--card-2)', border: '1px solid var(--line-2)' },
              children: `Module ${activeDef.num} of 10`
            })
          ]
        }),
        children: [
          (0, w.jsxs)('form', {
            noValidate: !0,
            onSubmit: (ev) => {
              ev.preventDefault();
              saveGroup();
            },
            children: [
              // RENDER CORRESPONDING SECTION FIELDS
              activeDef.id === 'invoiceSender' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)(p, {
                    label: 'Company / Issuer Name *',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.companyName || '',
                        placeholder: 'Registered corporate legal entity name',
                        onChange: ev => updateField('invoiceSender', 'companyName', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Registered business or corporate legal entity name' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Tagline / Subtitle',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.companyTagline || '',
                        placeholder: 'e.g. Surfaces Studio & Stone Supply',
                        onChange: ev => updateField('invoiceSender', 'companyTagline', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Corporate branding tagline or description' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Profile Status',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: curData.status || '',
                        onChange: ev => updateField('invoiceSender', 'status', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select status...' }),
                          (0, w.jsx)('option', { value: 'Active', children: 'Active' }),
                          (0, w.jsx)('option', { value: 'Secondary', children: 'Secondary' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: Active, Secondary' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Corporate Email *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        type: 'email',
                        value: curData.companyEmail || '',
                        placeholder: 'billing@company.com',
                        onChange: ev => updateField('invoiceSender', 'companyEmail', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Official billing and invoice delivery email' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Company Hotline / Phone',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.companyPhone || '',
                        placeholder: '+1 (555) 000-0000',
                        onChange: ev => updateField('invoiceSender', 'companyPhone', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Primary telephone or support contact number' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Statutory GSTIN',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.companyGst || '',
                        placeholder: '15-character GST identification number or LUT',
                        onChange: ev => updateField('invoiceSender', 'companyGst', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: '15-character GST identification number' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Income Tax PAN',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.companyPan || '',
                        placeholder: '10-character Permanent Account Number',
                        onChange: ev => updateField('invoiceSender', 'companyPan', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: '10-character Permanent Account Number' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Registered Street Address *',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('textarea', {
                        className: 'input',
                        rows: 3,
                        value: curData.companyAddress || '',
                        placeholder: 'Full physical corporate address for legal compliance',
                        onChange: ev => updateField('invoiceSender', 'companyAddress', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Full physical corporate address for legal compliance' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Authorised Signatory Name',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.signatoryName || '',
                        placeholder: 'e.g. Ines Okafor',
                        onChange: ev => updateField('invoiceSender', 'signatoryName', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Name of corporate signatory for invoices' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Signatory Designation / Capacity',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.signatoryDesignation || '',
                        placeholder: 'e.g. Director, Authorised Signatory',
                        onChange: ev => updateField('invoiceSender', 'signatoryDesignation', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Capacity (Authorised Signatory, Proprietor, Director)' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Company Brand Logo (URL / Base64)',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.companyLogo || '',
                        placeholder: 'Image file URL or Base64 data (PNG, JPG, SVG, WebP, max 2MB)',
                        onChange: ev => updateField('invoiceSender', 'companyLogo', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Image file or Base64 data URL (max 2MB)' })
                    ]
                  })
                ]
              }),

              activeDef.id === 'bankDetails' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)(p, {
                    label: 'Clearing Bank Name *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.bankName || '',
                        placeholder: 'e.g. HDFC Bank, JPMorgan Chase',
                        onChange: ev => updateField('bankDetails', 'bankName', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Scheduled commercial bank or banking institution' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Account Holder / Payee *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.accountName || '',
                        placeholder: 'Legal beneficiary name',
                        onChange: ev => updateField('bankDetails', 'accountName', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Beneficiary name matching corporate bank account' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Account Type *',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: curData.accountType || '',
                        onChange: ev => updateField('bankDetails', 'accountType', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select account type...' }),
                          (0, w.jsx)('option', { value: 'Current', children: 'Current' }),
                          (0, w.jsx)('option', { value: 'Savings', children: 'Savings' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: Current, Savings' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Account Number *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.accountNumber || '',
                        placeholder: 'Settlement account number',
                        onChange: ev => updateField('bankDetails', 'accountNumber', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Settlement account number' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'IFSC / RTGS Code *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.ifsc || '',
                        placeholder: '11-character IFSC code',
                        onChange: ev => updateField('bankDetails', 'ifsc', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: '11-character Indian Financial System Code' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'SWIFT / BIC Routing Code',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.swiftCode || '',
                        placeholder: 'SWIFT routing code for international wire',
                        onChange: ev => updateField('bankDetails', 'swiftCode', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'International bank identifier code' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Instant UPI / VPA ID',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.upiId || '',
                        placeholder: 'name@bank',
                        onChange: ev => updateField('bankDetails', 'upiId', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Virtual Payment Address for instant UPI settlements' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Bank Branch Name',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.branch || '',
                        placeholder: 'Branch location',
                        onChange: ev => updateField('bankDetails', 'branch', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Local branch or clearing house location' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Branch Physical Address',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('textarea', {
                        className: 'input',
                        rows: 2,
                        value: curData.bankAddress || '',
                        placeholder: 'Physical address of clearing branch',
                        onChange: ev => updateField('bankDetails', 'bankAddress', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Physical address of clearing branch' })
                    ]
                  })
                ]
              }),

              activeDef.id === 'gstSettings' && (0, w.jsxs)('div', {
                className: 'stack',
                children: [
                  (0, w.jsxs)('div', {
                    className: 'admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Enable Statutory GST System' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Master toggle to enable statutory GST calculation on invoices' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.enableGst),
                        label: 'Enable GST System',
                        onChange: val => updateField('gstSettings', 'enableGst', val)
                      })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'form-grid',
                    children: [
                      (0, w.jsxs)(p, {
                        label: 'Default HSN Code',
                        children: [
                          (0, w.jsx)('input', {
                            className: 'input font-mono',
                            value: curData.defaultHsn || '',
                            placeholder: 'e.g. 6802, 998311',
                            onChange: ev => updateField('gstSettings', 'defaultHsn', ev.target.value)
                          }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Default fallback HSN code for items' })
                        ]
                      }),
                      (0, w.jsxs)(p, {
                        label: 'Default Tax Percentage (%)',
                        children: [
                          (0, w.jsx)('input', {
                            className: 'input',
                            type: 'number',
                            value: curData.defaultGstRate ?? '',
                            placeholder: '18',
                            onChange: ev => updateField('gstSettings', 'defaultGstRate', ev.target.value === '' ? null : Number(ev.target.value))
                          }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Default fallback GST tax percentage' })
                        ]
                      }),
                      (0, w.jsxs)(p, {
                        label: 'Default Tax Scope',
                        children: [
                          (0, w.jsx)('input', {
                            className: 'input',
                            value: curData.defaultTaxType || '',
                            placeholder: 'e.g. IGST, CGST+SGST',
                            onChange: ev => updateField('gstSettings', 'defaultTaxType', ev.target.value)
                          }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Default tax regime scope' })
                        ]
                      }),
                      (0, w.jsxs)(p, {
                        label: 'Export LUT Reference Number',
                        children: [
                          (0, w.jsx)('input', {
                            className: 'input',
                            value: curData.lutNumber || '',
                            placeholder: 'Letter of Undertaking reference',
                            onChange: ev => updateField('gstSettings', 'lutNumber', ev.target.value)
                          }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'LUT reference number for zero-rated export invoices' })
                        ]
                      })
                    ]
                  }),
                  // GST TAX SLABS TABLE & CREATION FORM
                  (0, w.jsxs)('div', {
                    style: { marginTop: '24px' },
                    children: [
                      (0, w.jsx)('h4', { style: { marginBottom: '6px' }, children: 'Statutory GST & HSN Tax Slabs' }),
                      (0, w.jsx)('p', { className: 'muted', style: { marginBottom: '14px', fontSize: '13px' }, children: 'Configured tax slabs with automatic intra-state (CGST/SGST 50/50) and inter-state (IGST 100%) computation.' }),
                      (0, w.jsxs)('table', {
                        className: 'admin-tax-table',
                        children: [
                          (0, w.jsx)('thead', {
                            children: (0, w.jsxs)('tr', {
                              children: [
                                (0, w.jsx)('th', { children: 'HSN / SAC' }),
                                (0, w.jsx)('th', { children: 'Description' }),
                                (0, w.jsx)('th', { children: 'GST Rate' }),
                                (0, w.jsx)('th', { children: 'CGST (Auto)' }),
                                (0, w.jsx)('th', { children: 'SGST (Auto)' }),
                                (0, w.jsx)('th', { children: 'IGST (Auto)' }),
                                (0, w.jsx)('th', { children: 'Scope' }),
                                (0, w.jsx)('th', { children: 'Action' })
                              ]
                            })
                          }),
                          (0, w.jsx)('tbody', {
                            children: gstRates.length === 0 ? (
                              (0, w.jsx)('tr', {
                                children: (0, w.jsx)('td', {
                                  colSpan: 8,
                                  style: { textAlign: 'center', padding: '18px', color: 'var(--muted)' },
                                  children: 'No statutory GST slabs added yet. Use the form below to create one.'
                                })
                              })
                            ) : (
                              gstRates.map(slab => (0, w.jsxs)('tr', {
                                key: slab._id,
                                children: [
                                  (0, w.jsx)('td', { children: (0, w.jsx)('code', { children: slab.hsnCode }) }),
                                  (0, w.jsx)('td', { children: slab.serviceName }),
                                  (0, w.jsxs)('td', { children: [(0, w.jsx)('b', { children: slab.gstRate }), '%'] }),
                                  (0, w.jsxs)('td', { children: [slab.cgst, '%'] }),
                                  (0, w.jsxs)('td', { children: [slab.sgst, '%'] }),
                                  (0, w.jsxs)('td', { children: [slab.igst, '%'] }),
                                  (0, w.jsx)('td', {
                                    children: (0, w.jsx)('span', {
                                      className: `admin-tax-badge ${slab.taxType === 'Zero-Rated' ? 'zero' : slab.taxType === 'Exempted' ? 'exempt' : 'standard'}`,
                                      children: slab.taxType || 'Standard'
                                    })
                                  }),
                                  (0, w.jsx)('td', {
                                    children: (0, w.jsx)('button', {
                                      type: 'button',
                                      className: 'action-btn action-btn--delete',
                                      title: 'Delete GST Slab',
                                      'aria-label': 'Delete GST Slab',
                                      onClick: () => handleDeleteGstRate(slab._id),
                                      children: (0, w.jsx)(v, { name: 'trash' })
                                    })
                                  })
                                ]
                              }))
                            )
                          })
                        ]
                      }),
                      // ADD SLAB FORM
                      (0, w.jsxs)('div', {
                        style: { marginTop: '16px', padding: '16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--line-2)' },
                        children: [
                          (0, w.jsx)('b', { style: { display: 'block', marginBottom: '10px' }, children: '+ Add Statutory Tax Slab' }),
                          (0, w.jsxs)('div', {
                            className: 'form-grid',
                            children: [
                              (0, w.jsx)(p, {
                                label: 'HSN / SAC Code',
                                children: (0, w.jsx)('input', {
                                  className: 'input font-mono',
                                  value: newRate.hsnCode,
                                  placeholder: 'e.g. 680210',
                                  onChange: ev => setNewRate({ ...newRate, hsnCode: ev.target.value })
                                })
                              }),
                              (0, w.jsx)(p, {
                                label: 'GST Percentage (%)',
                                children: (0, w.jsx)('input', {
                                  className: 'input',
                                  type: 'number',
                                  value: newRate.gstRate,
                                  placeholder: '18',
                                  onChange: ev => setNewRate({ ...newRate, gstRate: ev.target.value })
                                })
                              }),
                              (0, w.jsx)(p, {
                                label: 'Applicability Scope',
                                children: (0, w.jsxs)('select', {
                                  className: 'select',
                                  value: newRate.taxType,
                                  onChange: ev => setNewRate({ ...newRate, taxType: ev.target.value }),
                                  children: [
                                    (0, w.jsx)('option', { value: 'Standard', children: 'Standard' }),
                                    (0, w.jsx)('option', { value: 'Zero-Rated', children: 'Zero-Rated' }),
                                    (0, w.jsx)('option', { value: 'Exempted', children: 'Exempted' })
                                  ]
                                })
                              }),
                              (0, w.jsx)(p, {
                                label: 'Service / Classification Name',
                                className: 'span-2',
                                children: (0, w.jsx)('input', {
                                  className: 'input',
                                  value: newRate.serviceName,
                                  placeholder: 'e.g. Natural Granite, Marble & Quartz Fabrication',
                                  onChange: ev => setNewRate({ ...newRate, serviceName: ev.target.value })
                                })
                              }),
                              (0, w.jsx)('div', {
                                className: 'span-2',
                                children: (0, w.jsx)('button', {
                                  type: 'button',
                                  className: 'btn btn--primary',
                                  onClick: handleAddGstRate,
                                  children: 'Save Slab to MongoDB'
                                })
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),

              activeDef.id === 'theme' && (0, w.jsxs)('div', {
                className: 'admin-groups',
                children: [
(0, w.jsx)(AdminGroup, { icon: 'building', title: 'Platform Identity', desc: 'Site branding, helpdesk contacts, currency, and store download links', children: [

                  (0, w.jsxs)(p, {
                    label: 'Platform Site Name',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: gd.siteName || '',
                        placeholder: 'Tessly Surfaces CRM',
                        onChange: ev => updateField('general', 'siteName', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Public name of the application / system' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Platform Support Email',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        type: 'email',
                        value: gd.siteEmail || '',
                        placeholder: 'support@caldermoss.co',
                        onChange: ev => updateField('general', 'siteEmail', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Official contact and helpdesk email' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Platform Phone Number',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: gd.sitePhone || '',
                        placeholder: '+1 (555) 234-5678',
                        onChange: ev => updateField('general', 'sitePhone', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Official contact telephone number' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Country',
                    children: [
                      (0, w.jsx)('select', {
                        className: 'select',
                        value: gd.country || 'IN',
                        onChange: ev => {
                          const code = ev.target.value;
                          updateField('general', 'country', code);
                          updateField('general', 'currency', ({IN:'INR',US:'USD',GB:'GBP',AE:'AED',SA:'SAR',SG:'SGD',AU:'AUD',CA:'CAD',NZ:'NZD',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR',NL:'EUR',JP:'JPY',CN:'CNY',CH:'CHF',ZA:'ZAR',LK:'LKR',NP:'NPR',BD:'BDT',MY:'MYR',ID:'IDR',TH:'THB'})[code] || 'INR');
                          if (window.tlSetCountry) window.tlSetCountry(code);
                        },
                        children: [(0, w.jsx)('option', { value: 'IN', children: 'India (INR · ₹)' }),
(0, w.jsx)('option', { value: 'US', children: 'United States (USD · $)' }),
(0, w.jsx)('option', { value: 'GB', children: 'United Kingdom (GBP · £)' }),
(0, w.jsx)('option', { value: 'AE', children: 'United Arab Emirates (AED · AED)' }),
(0, w.jsx)('option', { value: 'SA', children: 'Saudi Arabia (SAR · SAR)' }),
(0, w.jsx)('option', { value: 'SG', children: 'Singapore (SGD · S$)' }),
(0, w.jsx)('option', { value: 'AU', children: 'Australia (AUD · A$)' }),
(0, w.jsx)('option', { value: 'CA', children: 'Canada (CAD · C$)' }),
(0, w.jsx)('option', { value: 'NZ', children: 'New Zealand (NZD · NZ$)' }),
(0, w.jsx)('option', { value: 'DE', children: 'Germany (EUR · €)' }),
(0, w.jsx)('option', { value: 'FR', children: 'France (EUR · €)' }),
(0, w.jsx)('option', { value: 'IT', children: 'Italy (EUR · €)' }),
(0, w.jsx)('option', { value: 'ES', children: 'Spain (EUR · €)' }),
(0, w.jsx)('option', { value: 'NL', children: 'Netherlands (EUR · €)' }),
(0, w.jsx)('option', { value: 'JP', children: 'Japan (JPY · ¥)' }),
(0, w.jsx)('option', { value: 'CN', children: 'China (CNY · ¥)' }),
(0, w.jsx)('option', { value: 'CH', children: 'Switzerland (CHF · CHF)' }),
(0, w.jsx)('option', { value: 'ZA', children: 'South Africa (ZAR · R)' }),
(0, w.jsx)('option', { value: 'LK', children: 'Sri Lanka (LKR · Rs.)' }),
(0, w.jsx)('option', { value: 'NP', children: 'Nepal (NPR · Rs.)' }),
(0, w.jsx)('option', { value: 'BD', children: 'Bangladesh (BDT · ৳)' }),
(0, w.jsx)('option', { value: 'MY', children: 'Malaysia (MYR · RM)' }),
(0, w.jsx)('option', { value: 'ID', children: 'Indonesia (IDR · Rp)' }),
(0, w.jsx)('option', { value: 'TH', children: 'Thailand (THB · ฿)' })]
                      })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Time Format',
                    children: [
                      (0, w.jsx)('select', {
                        className: 'select',
                        value: gd.timeFormat || '12h',
                        onChange: ev => updateField('general', 'timeFormat', ev.target.value),
                        children: [(0, w.jsx)('option', { value: '12h', children: '12-hour (2:30 PM)' }),
(0, w.jsx)('option', { value: '24h', children: '24-hour (14:30)' })]
                      })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Date Format',
                    children: [
                      (0, w.jsx)('select', {
                        className: 'select',
                        value: gd.dateFormat || 'DD/MM/YYYY',
                        onChange: ev => updateField('general', 'dateFormat', ev.target.value),
                        children: [(0, w.jsx)('option', { value: 'DD/MM/YYYY', children: 'DD/MM/YYYY' }),
(0, w.jsx)('option', { value: 'MM/DD/YYYY', children: 'MM/DD/YYYY' }),
(0, w.jsx)('option', { value: 'YYYY-MM-DD', children: 'YYYY-MM-DD' })]
                      })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Timezone',
                    children: [
                      (0, w.jsx)('select', {
                        className: 'select',
                        value: gd.timezone || 'Asia/Kolkata',
                        onChange: ev => updateField('general', 'timezone', ev.target.value),
                        children: [(0, w.jsx)('option', { value: 'Asia/Kolkata', children: 'India (IST, UTC+5:30)' }),
(0, w.jsx)('option', { value: 'UTC', children: 'UTC' }),
(0, w.jsx)('option', { value: 'America/New_York', children: 'US Eastern' }),
(0, w.jsx)('option', { value: 'Europe/London', children: 'UK (GMT/BST)' }),
(0, w.jsx)('option', { value: 'Asia/Dubai', children: 'Dubai (GST, UTC+4)' }),
(0, w.jsx)('option', { value: 'Asia/Singapore', children: 'Singapore (SGT)' }),
(0, w.jsx)('option', { value: 'Australia/Sydney', children: 'Sydney (AEST)' })]
                      })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Language',
                    children: [
                      (0, w.jsx)('select', {
                        className: 'select',
                        value: gd.language || 'en',
                        onChange: ev => updateField('general', 'language', ev.target.value),
                        children: [(0, w.jsx)('option', { value: 'en', children: 'English' }),
(0, w.jsx)('option', { value: 'hi', children: 'Hindi' }),
(0, w.jsx)('option', { value: 'ta', children: 'Tamil' })]
                      })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Platform Logo (URL / Asset Path)',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: gd.logo || '',
                        placeholder: '/assets/logo.png',
                        onChange: ev => updateField('general', 'logo', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Brand header logo image asset' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Android Play Store URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: gd.androidAppUrl || '',
                        placeholder: 'https://play.google.com/store/apps/...',
                        onChange: ev => updateField('general', 'androidAppUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Google Play Store application listing URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'iOS App Store URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: gd.iosAppUrl || '',
                        placeholder: 'https://apps.apple.com/app/...',
                        onChange: ev => updateField('general', 'iosAppUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Apple iOS App Store application listing URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Mac App Store URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: gd.macAppUrl || '',
                        placeholder: 'https://apps.apple.com/mac/...',
                        onChange: ev => updateField('general', 'macAppUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Apple Mac App Store application listing URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Windows Store URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: gd.windowsAppUrl || '',
                        placeholder: 'https://apps.microsoft.com/...',
                        onChange: ev => updateField('general', 'windowsAppUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Microsoft Windows Store application listing URL' })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'span-2 admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Show Contact Form' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Enables public contact inquiry form on front screens' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(gd.showContactForm),
                        label: 'Show Contact Form',
                        onChange: val => updateField('general', 'showContactForm', val)
                      })
                    ]
                  })
                ]}),
(0, w.jsx)(AdminGroup, { icon: 'globe', title: 'Social Media', desc: 'Corporate channels: Instagram, Facebook, LinkedIn, X, WhatsApp, YouTube', children: [

                  (0, w.jsxs)(p, {
                    label: 'Instagram Profile URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: sd.instagramUrl || '',
                        placeholder: 'https://instagram.com/caldermoss',
                        onChange: ev => updateField('social', 'instagramUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Corporate Instagram profile URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Facebook Page URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: sd.facebookUrl || '',
                        placeholder: 'https://facebook.com/caldermoss',
                        onChange: ev => updateField('social', 'facebookUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Corporate Facebook page URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'LinkedIn Company URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: sd.linkedinUrl || '',
                        placeholder: 'https://linkedin.com/company/caldermoss',
                        onChange: ev => updateField('social', 'linkedinUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Corporate LinkedIn company URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'X (Twitter) Profile URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: sd.twitterUrl || '',
                        placeholder: 'https://x.com/caldermoss',
                        onChange: ev => updateField('social', 'twitterUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Corporate X / Twitter profile URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'WhatsApp Business Number',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: sd.whatsappNumber || '',
                        placeholder: '+1555000000',
                        onChange: ev => updateField('social', 'whatsappNumber', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'WhatsApp customer support number with country code' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'YouTube Channel URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: sd.youtubeUrl || '',
                        placeholder: 'https://youtube.com/@caldermoss',
                        onChange: ev => updateField('social', 'youtubeUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Corporate YouTube channel URL' })
                    ]
                  })
                ]})
                ]
              }),

              activeDef.id === 'smtp' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)(p, {
                    label: 'SMTP Host *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.smtpHost || '',
                        placeholder: 'smtp.domain.com',
                        onChange: ev => updateField('smtp', 'smtpHost', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Outbound mail server address' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'SMTP Port *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.smtpPort || '',
                        placeholder: '587, 465, 25',
                        onChange: ev => updateField('smtp', 'smtpPort', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Server port (e.g. 587, 465, 25)' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'SMTP Username *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.smtpUser || '',
                        placeholder: 'Username or API key',
                        onChange: ev => updateField('smtp', 'smtpUser', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'SMTP authentication user or API key' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'SMTP Password *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        type: 'password',
                        value: curData.smtpPass || '',
                        placeholder: '••••••••',
                        onChange: ev => updateField('smtp', 'smtpPass', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'SMTP password or secure secret key' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'From Email *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        type: 'email',
                        value: curData.smtpFromEmail || '',
                        placeholder: 'noreply@domain.com',
                        onChange: ev => updateField('smtp', 'smtpFromEmail', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Verified sender address shown in inboxes' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Sender Name *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.smtpFromName || '',
                        placeholder: 'Calder & Moss Notifications',
                        onChange: ev => updateField('smtp', 'smtpFromName', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Display name of the sending organization' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Encryption Protocol',
                    className: 'span-2',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: curData.smtpEncryption || '',
                        onChange: ev => updateField('smtp', 'smtpEncryption', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select encryption...' }),
                          (0, w.jsx)('option', { value: 'TLS', children: 'TLS' }),
                          (0, w.jsx)('option', { value: 'SSL', children: 'SSL' }),
                          (0, w.jsx)('option', { value: 'STARTTLS', children: 'STARTTLS' }),
                          (0, w.jsx)('option', { value: 'None', children: 'None' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: TLS, SSL, STARTTLS, None' })
                    ]
                  })
                ]
              }),

              activeDef.id === 'msg91' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)('div', {
                    className: 'span-2 admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Gateway Active Status' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Master toggle to activate MSG91 SMS dispatch' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.msg91Status),
                        label: 'Gateway Active Status',
                        onChange: val => updateField('msg91', 'msg91Status', val)
                      })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Auth Key *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        type: 'password',
                        value: curData.msg91AuthKey || '',
                        placeholder: 'Secure MSG91 authorization token',
                        onChange: ev => updateField('msg91', 'msg91AuthKey', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Secure API authorization token from MSG91' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Sender ID *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.msg91SenderId || '',
                        placeholder: '6-char TRAI header (e.g. CALDER)',
                        onChange: ev => updateField('msg91', 'msg91SenderId', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: '6-character TRAI/DLT-approved sender header' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Route / Channel',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.msg91AppRoute || '',
                        placeholder: 'e.g. 4 (Transactional)',
                        onChange: ev => updateField('msg91', 'msg91AppRoute', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Delivery channel route' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Template ID *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.msg91TemplateId || '',
                        placeholder: 'DLT-registered template ID',
                        onChange: ev => updateField('msg91', 'msg91TemplateId', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'DLT-registered SMS template identifier' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Template Variable',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.msg91TemplateVariable || '',
                        placeholder: 'e.g. OTP',
                        onChange: ev => updateField('msg91', 'msg91TemplateVariable', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Variable identifier token in template' })
                    ]
                  })
                ]
              }),

              activeDef.id === 'otp' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)(p, {
                    label: 'OTP Digits Length *',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: curData.otpLength || '',
                        onChange: ev => updateField('otp', 'otpLength', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select length...' }),
                          (0, w.jsx)('option', { value: '6', children: '6 Digits (High Security)' }),
                          (0, w.jsx)('option', { value: '4', children: '4 Digits (Quick)' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: 6 (High Security), 4 (Quick)' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Expiry Duration (Minutes) *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        type: 'number',
                        value: curData.expiryMinutes ?? '',
                        placeholder: '5',
                        onChange: ev => updateField('otp', 'expiryMinutes', ev.target.value === '' ? null : Number(ev.target.value))
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Validity window before OTP expires' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Max Resend Attempts',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        type: 'number',
                        value: curData.maxResendAttempts ?? '',
                        placeholder: '3',
                        onChange: ev => updateField('otp', 'maxResendAttempts', ev.target.value === '' ? null : Number(ev.target.value))
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Max allowable request attempts before rate lockout' })
                    ]
                  })
                ]
              }),

              activeDef.id === 'firebase' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)(p, {
                    label: 'Firebase API Key *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        type: 'password',
                        value: curData.firebaseApiKey || '',
                        placeholder: 'Google Firebase client Web API key',
                        onChange: ev => updateField('firebase', 'firebaseApiKey', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Google Firebase client Web API key' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Firebase Project ID *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.firebaseProjectId || '',
                        placeholder: 'e.g. aedentek-crm-prod',
                        onChange: ev => updateField('firebase', 'firebaseProjectId', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Firebase console project identifier' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'VAPID Key *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.vapidKey || '',
                        placeholder: 'Public VAPID key string',
                        onChange: ev => updateField('firebase', 'vapidKey', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Web Push voluntary application server identity key' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Firebase App ID',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.firebaseAppId || '',
                        placeholder: '1:123456789:web:abcdef',
                        onChange: ev => updateField('firebase', 'firebaseAppId', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Firebase unique application identifier' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Service Account JSON Credentials',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('textarea', {
                        className: 'input font-mono',
                        rows: 4,
                        value: curData.serviceAccountJson || '',
                        placeholder: '{\n  "type": "service_account",\n  "project_id": "..."\n}',
                        onChange: ev => updateField('firebase', 'serviceAccountJson', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Full credentials JSON for Admin SDK initialization' })
                    ]
                  })
                ]
              }),

              activeDef.id === 'mobileapp' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)(p, {
                    label: 'App Title *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.mobileAppName || '',
                        placeholder: 'Tessly Mobile Desk',
                        onChange: ev => updateField('mobileapp', 'mobileAppName', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Application display name' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Build Version *',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.mobileBuildVersion || '',
                        placeholder: '1.0.0',
                        onChange: ev => updateField('mobileapp', 'mobileBuildVersion', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Current semantic release version string (e.g. 1.0.0)' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Mobile App Icon URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.mobileAppIcon || '',
                        placeholder: 'https://...',
                        onChange: ev => updateField('mobileapp', 'mobileAppIcon', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Icon path or public asset URL' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Direct APK Download URL',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.apkDownloadUrl || '',
                        placeholder: 'https://.../app-release.apk',
                        onChange: ev => updateField('mobileapp', 'apkDownloadUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Direct link to Android APK download' })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'span-2 admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Update Enforcement' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Force users to update before accessing the app' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.updateEnforcement),
                        label: 'Update Enforcement',
                        onChange: val => updateField('mobileapp', 'updateEnforcement', val)
                      })
                    ]
                  })
                ]
              }),

              activeDef.id === 'navigation' && (0, w.jsxs)('div', {
                className: 'stack admin-toggle-grid',
                children: [
                  ['home', 'Home Landing Page', 'Controls visibility of homepage'],
                  ['courses', 'Courses & Programs', 'Controls visibility of courses catalog'],
                  ['gallery', 'Media Gallery', 'Controls visibility of media/photo gallery'],
                  ['videos', 'Video Archive', 'Controls visibility of video streaming library'],
                  ['blogs', 'Blogs & Articles', 'Controls visibility of blog/insights feed'],
                  ['about', 'About Organization', 'Controls visibility of company profile page'],
                  ['contact', 'Contact & Inquiries', 'Controls visibility of contact/inquiry page']
                ].map(([k, lbl, desc]) => (0, w.jsxs)('div', {
                  key: k,
                  className: 'admin-toggle-row',
                  children: [
                    (0, w.jsxs)('div', {
                      className: 'admin-toggle-info',
                      children: [
                        (0, w.jsx)('b', { children: lbl }),
                        (0, w.jsx)('small', { className: 'admin-field-desc', children: desc })
                      ]
                    }),
                    (0, w.jsx)(_, {
                      on: Boolean(curData[k]),
                      label: lbl,
                      onChange: val => updateField('navigation', k, val)
                    })
                  ]
                }))
              }),

              activeDef.id === 'desktop' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)(p, {
                    label: 'Desktop App Channel',
                    children: [
                      (0, w.jsx)('select', {
                        className: 'select',
                        value: curData.channel || 'Stable / Production',
                        onChange: ev => updateField('desktop', 'channel', ev.target.value),
                        children: ['Stable / Production', 'Beta Release', 'Canary Developer'].map(opt => (0, w.jsx)('option', { value: opt, children: opt }, opt))
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Release channel for desktop binaries' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Latest Version Tag',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.version || 'v1.4.2',
                        placeholder: 'e.g. v1.4.2',
                        onChange: ev => updateField('desktop', 'version', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Target update version string' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Auto-Update Binary Download URL',
                    className: 'span-2',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input',
                        value: curData.downloadUrl || '',
                        placeholder: 'https://releases.company.com/desktop/macos/latest.dmg',
                        onChange: ev => updateField('desktop', 'downloadUrl', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Direct URL for desktop app installer and delta patch' })
                    ]
                  })
                ]
              }),
              activeDef.id === 'razorpay' && (0, w.jsxs)('div', {
                className: 'form-grid',
                children: [
                  (0, w.jsxs)('div', {
                    className: 'span-2 admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Gateway Active Status' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Master toggle to enable Razorpay payment gateway' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.razorpayStatus),
                        label: 'Razorpay Gateway Active',
                        onChange: val => updateField('razorpay', 'razorpayStatus', val)
                      })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Razorpay Key ID',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        value: curData.razorpayKeyId || '',
                        placeholder: 'rzp_live_...',
                        onChange: ev => updateField('razorpay', 'razorpayKeyId', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Merchant Public Key ID' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Razorpay Key Secret',
                    children: [
                      (0, w.jsx)('input', {
                        className: 'input font-mono',
                        type: 'password',
                        value: curData.razorpayKeySecret || '',
                        placeholder: '••••••••',
                        onChange: ev => updateField('razorpay', 'razorpayKeySecret', ev.target.value)
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Merchant Secret Key' })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Enable iOS In-App Payment' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Activates payments inside iOS mobile app' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.enableIosInAppPayment),
                        label: 'Enable iOS Payment',
                        onChange: val => updateField('razorpay', 'enableIosInAppPayment', val)
                      })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Enable Android In-App Payment' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Activates payments inside Android mobile app' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.enableAndroidInAppPayment),
                        label: 'Enable Android Payment',
                        onChange: val => updateField('razorpay', 'enableAndroidInAppPayment', val)
                      })
                    ]
                  })
                ]
              }),

              activeDef.id === 'security' && (0, w.jsxs)('div', {
                className: 'stack',
                children: [
                  (0, w.jsxs)('div', {
                    className: 'admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'DevTools Blocker Protection' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Disables browser developer tools and console access' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.devModeProtection),
                        label: 'DevTools Blocker',
                        onChange: val => updateField('security', 'devModeProtection', val)
                      })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Screenshot Guard' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Blurs sensitive client & pricing content when window loses focus' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.screenshotProtection),
                        label: 'Screenshot Guard',
                        onChange: val => updateField('security', 'screenshotProtection', val)
                      })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Google reCAPTCHA Protection' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Activates Google reCAPTCHA v2/v3 on public forms' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(curData.recaptchaEnabled),
                        label: 'reCAPTCHA Active',
                        onChange: val => updateField('security', 'recaptchaEnabled', val)
                      })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'form-grid',
                    children: [
                      (0, w.jsxs)(p, {
                        label: 'reCAPTCHA Site Key',
                        children: [
                          (0, w.jsx)('input', {
                            className: 'input font-mono',
                            value: curData.recaptchaSiteKey || '',
                            placeholder: 'Public reCAPTCHA client key',
                            onChange: ev => updateField('security', 'recaptchaSiteKey', ev.target.value)
                          }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Public reCAPTCHA client key' })
                        ]
                      }),
                      (0, w.jsxs)(p, {
                        label: 'reCAPTCHA Secret Key',
                        children: [
                          (0, w.jsx)('input', {
                            className: 'input font-mono',
                            type: 'password',
                            value: curData.recaptchaSecretKey || '',
                            placeholder: 'Private reCAPTCHA backend verification secret',
                            onChange: ev => updateField('security', 'recaptchaSecretKey', ev.target.value)
                          }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Private reCAPTCHA backend verification secret' })
                        ]
                      })
                    ]
                  })
                ]
              }),

              // ACTION BUTTONS
              (0, w.jsxs)('div', {
                className: 'st-actions',
                children: [
                  (0, w.jsx)('button', {
                    className: 'btn btn--ghost',
                    type: 'button',
                    onClick: loadSettings,
                    children: 'Discard'
                  }),
                  (0, w.jsx)('button', {
                    className: 'btn btn--primary',
                    type: 'submit',
                    disabled: saving,
                    children: saving ? 'Saving to MongoDB...' : `Save ${activeDef.label} Changes`
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

// Retain profile and team views
function O(){let n=l(u()),init={name:n.name,email:n.email,username:n.username||(n.email||``).split(`@`)[0],phone:n.phone||``,password:``,confirm:``},r=e(init),i=r.v.name!==n.name||r.v.email!==n.email||r.v.username!==init.username||r.v.phone!==init.phone||!!r.v.password||!!r.v.confirm,a=()=>{if(!r.check({name:`required`,email:`email`,username:`required`}))return;let v=r.v;if(v.phone&&!/^[+()\-\s\d]{7,18}$/.test(v.phone.trim())){t(`Enter a valid phone number`,{icon:`phone`});return}if(v.password||v.confirm){if(v.password.length<6){t(`Password must be at least 6 characters`,{icon:`lock`});return}if(v.password!==v.confirm){t(`Password and confirm password do not match`,{icon:`lock`});return}}s(e=>{let t=e.users.find(t=>t.id===e.settings.me);t.name=v.name.trim(),t.email=v.email.trim(),t.username=v.username.trim(),t.phone=v.phone.trim(),v.password&&(t.passwordChangedAt=Date.now())}),r.setV({...v,password:``,confirm:``}),t(v.password?`Profile saved · password updated`:`Profile saved`,{icon:`user`})};return(0,w.jsxs)(`div`,{className:`st-grid`,children:[(0,w.jsx)(h,{title:`Your profile`,sub:`How teammates and clients see you`,children:(0,w.jsxs)(`form`,{noValidate:!0,id:`profile-form`,onSubmit:e=>{e.preventDefault(),a()},children:[(0,w.jsxs)(`div`,{className:`st-me`,"data-row":``,children:[(0,w.jsx)(g,{name:r.v.name||n.name,tone:n.tone,size:64,status:`online`}),(0,w.jsxs)(`span`,{className:`li__main`,children:[(0,w.jsx)(`b`,{children:r.v.name||`—`}),(0,w.jsx)(`small`,{children:n.role})]})]}),(0,w.jsxs)(`div`,{className:`form-grid form-grid--3`,children:[(0,w.jsx)(p,{label:`Full name`,err:r.err.name,children:(0,w.jsx)(`input`,{className:`input`,name:`name`,value:r.v.name,onChange:r.set(`name`)})}),(0,w.jsx)(p,{label:`Username`,err:r.err.username,children:(0,w.jsx)(`input`,{className:`input`,name:`username`,autoComplete:`username`,value:r.v.username,onChange:r.set(`username`)})}),(0,w.jsx)(p,{label:`Email`,err:r.err.email,children:(0,w.jsx)(`input`,{className:`input`,name:`email`,type:`email`,value:r.v.email,onChange:r.set(`email`)})}),(0,w.jsx)(p,{label:`Phone number`,children:(0,w.jsx)(`input`,{className:`input`,name:`phone`,type:`tel`,placeholder:`+91 98200 00000`,value:r.v.phone,onChange:r.set(`phone`)})}),(0,w.jsx)(p,{label:`Role (view only)`,children:(0,w.jsx)(`input`,{className:`input`,name:`role`,value:n.role,readOnly:!0,disabled:!0,"aria-readonly":`true`})}),(0,w.jsx)(`span`,{}),(0,w.jsx)(p,{label:`Password`,children:(0,w.jsx)(`input`,{className:`input`,name:`password`,type:`password`,autoComplete:`new-password`,placeholder:`Leave blank to keep current`,value:r.v.password,onChange:r.set(`password`)})}),(0,w.jsx)(p,{label:`Confirm password`,children:(0,w.jsx)(`input`,{className:`input`,name:`confirm`,type:`password`,autoComplete:`new-password`,placeholder:`Re-enter the password`,value:r.v.confirm,onChange:r.set(`confirm`)})})]}),(0,w.jsxs)(`div`,{className:`st-actions`,children:[(0,w.jsx)(`button`,{className:`btn btn--ghost`,type:`button`,disabled:!i,onClick:()=>r.setV(init),children:`Discard`}),(0,w.jsx)(`button`,{className:`btn btn--primary`,type:`submit`,disabled:!i,children:`Save changes`})]})]})}),(0,w.jsx)(h,{title:`Sign-in`,sub:`Security for your account`,children:(0,w.jsxs)(`div`,{className:`list`,children:[(0,w.jsxs)(`div`,{className:`li`,"data-row":``,children:[(0,w.jsx)(`span`,{className:`tico`,children:(0,w.jsx)(v,{name:`lock`})}),(0,w.jsxs)(`span`,{className:`li__main`,children:[(0,w.jsx)(`b`,{children:`Password`}),(0,w.jsx)(`small`,{children:n.passwordChangedAt?`Changed `+new Date(n.passwordChangedAt).toLocaleDateString():`Changed 3 months ago`})]}),(0,w.jsx)(`button`,{className:`btn btn--sm`,type:`button`,onClick:()=>t(`Reset link sent to your email`,{icon:`mail`}),children:`Change`})]}),(0,w.jsxs)(`div`,{className:`li`,"data-row":``,children:[(0,w.jsx)(`span`,{className:`tico`,children:(0,w.jsx)(v,{name:`phone`})}),(0,w.jsxs)(`span`,{className:`li__main`,children:[(0,w.jsx)(`b`,{children:`Two-step sign-in`}),(0,w.jsx)(`small`,{children:`Codes by text to •••• 2977`})]}),(0,w.jsx)(f,{kind:`good`,children:`On`})]}),(0,w.jsxs)(`div`,{className:`li`,"data-row":``,children:[(0,w.jsx)(`span`,{className:`tico`,children:(0,w.jsx)(v,{name:`globe`})}),(0,w.jsxs)(`span`,{className:`li__main`,children:[(0,w.jsx)(`b`,{children:`Sessions`}),(0,w.jsx)(`small`,{children:`This Mac · Chicago, IL · now`})]})]})]})})]})}

function k(){let e=u(),[n,r]=(0,C.useState)(e.settings.company),[i,a]=(0,C.useState)(e.settings.currency),[o,c]=(0,C.useState)(e.settings.weekStart),[l,f]=(0,C.useState)(``),m=n!==e.settings.company||i!==e.settings.currency||o!==e.settings.weekStart;return(0,w.jsxs)(`div`,{className:`st-grid`,children:[(0,w.jsx)(h,{title:`Company`,sub:`Shown on invoices and in emails`,children:(0,w.jsxs)(`form`,{noValidate:!0,onSubmit:e=>{if(e.preventDefault(),!n.trim()){f(`Required`);return}s(e=>{e.settings.company=n.trim(),e.settings.currency=i,e.settings.weekStart=o}),t(`Company settings saved`,{icon:`building`})},children:[(0,w.jsxs)(`div`,{className:`form-grid`,children:[(0,w.jsx)(p,{label:`Company name`,err:l,className:`span-2`,children:(0,w.jsx)(`input`,{className:`input`,value:n,onChange:e=>{r(e.target.value),f(``)}})}),(0,w.jsx)(p,{label:`Currency`,children:(0,w.jsx)(`select`,{className:`select`,value:i,onChange:e=>a(e.target.value),children:[`USD`,`EUR`,`GBP`,`CAD`].map(e=>(0,w.jsx)(`option`,{children:e},e))})}),(0,w.jsxs)(`div`,{className:`field`,children:[(0,w.jsx)(`span`,{children:`Week starts on`}),(0,w.jsx)(d,{label:`Week starts on`,value:o,onChange:c,options:[{id:`Mon`,label:`Monday`},{id:`Sun`,label:`Sunday`}]})]})]}),(0,w.jsx)(`div`,{className:`st-actions`,children:(0,w.jsx)(`button`,{className:`btn btn--primary`,type:`submit`,disabled:!m,children:`Save changes`})})]})}),(0,w.jsx)(h,{title:`On file`,sub:`Read from your account`,children:(0,w.jsxs)(`dl`,{className:`dl`,children:[(0,w.jsx)(`dt`,{children:`Plan`}),(0,w.jsx)(`dd`,{children:`Studio · 10 seats`}),(0,w.jsx)(`dt`,{children:`Seats used`}),(0,w.jsxs)(`dd`,{children:[e.users.length,` of 10`]}),(0,w.jsx)(`dt`,{children:`Billing email`}),(0,w.jsx)(`dd`,{children:`accounts@caldermoss.co`}),(0,w.jsx)(`dt`,{children:`Address`}),(0,w.jsx)(`dd`,{children:`212 Kent Ave, Brooklyn`})]})})]})}var A=[`Admin`,`Manager`,`Sales`,`Read only`];function j(){let e=u(),[n,r]=(0,C.useState)(()=>Object.fromEntries(e.users.map(e=>[e.id,e.id===`u1`?`Admin`:e.quota===0?`Manager`:`Sales`])));return(0,w.jsx)(h,{flush:!0,title:`Users & roles`,sub:`${e.users.length} people · admins can change billing and reset data`,children:(0,w.jsx)(`div`,{className:`table-wrap`,children:(0,w.jsxs)(`table`,{className:`table table--stack`,children:[(0,w.jsx)(`thead`,{children:(0,w.jsxs)(`tr`,{children:[(0,w.jsx)(`th`,{children:`Person`}),(0,w.jsx)(`th`,{children:`Title`}),(0,w.jsx)(`th`,{children:`Region`}),(0,w.jsx)(`th`,{children:`Access`})]})}),(0,w.jsx)(`tbody`,{children:e.users.map(i=>(0,w.jsxs)(`tr`,{"data-row":``,children:[(0,w.jsx)(`td`,{children:(0,w.jsxs)(`span`,{className:`row`,children:[(0,w.jsx)(g,{name:i.name,tone:i.tone,size:32,status:i.status}),(0,w.jsxs)(`span`,{className:`li__main`,children:[(0,w.jsx)(`b`,{children:i.name}),(0,w.jsx)(`small`,{children:i.email})]})]})}),(0,w.jsx)(`td`,{"data-hide-phone":``,children:i.role.includes(`invited`)?(0,w.jsx)(f,{kind:`warn`,children:`Invited`}):i.role}),(0,w.jsx)(`td`,{"data-hide-phone":``,children:i.region}),(0,w.jsx)(`td`,{children:(0,w.jsx)(`select`,{className:`select st-role`,"aria-label":`Access for ${i.name}`,value:n[i.id]??`Sales`,disabled:i.id===e.settings.me,onChange:e=>{r(t=>({...t,[i.id]:e.target.value})),t(`${i.name.split(` `)[0]} is now ${e.target.value}`,{icon:`lock`})},children:A.map(e=>(0,w.jsx)(`option`,{children:e},e))})})]},i.id))})]})})})}var M=[{key:`deals`,title:`Deal changes`,text:`When a deal you own moves stage, is won or lost.`,icon:`deals`},{key:`tasks`,title:`Tasks due`,text:`A reminder at 8am for what is due today.`,icon:`calendar`},{key:`invoices`,title:`Invoices`,text:`When an invoice is paid or goes overdue.`,icon:`finance`},{key:`mentions`,title:`Mentions & replies`,text:`When a client replies or a teammate mentions you.`,icon:`inbox`},{key:`digest`,title:`Weekly digest`,text:`A Monday email with last week’s numbers.`,icon:`mail`}];function N(){let e=u();return(0,w.jsx)(h,{title:`Notifications`,sub:`Choose what reaches you`,children:(0,w.jsx)(`div`,{className:`list`,children:M.map(n=>(0,w.jsxs)(`div`,{className:`li st-note`,"data-row":``,children:[(0,w.jsx)(`span`,{className:`tico`,children:(0,w.jsx)(v,{name:n.icon})}),(0,w.jsxs)(`span`,{className:`li__main`,children:[(0,w.jsx)(`b`,{children:n.title}),(0,w.jsx)(`small`,{style:{whiteSpace:`normal`},children:n.text})]}),(0,w.jsx)(_,{on:e.settings.notify[n.key],label:n.title,onChange:e=>{s(t=>{t.settings.notify[n.key]=e}),t(`${n.title} ${e?`on`:`off`}`,{icon:`bell`})}})]},n.key))})})}function P(){try{let e=JSON.parse(localStorage.getItem(`tessly:theme`)||`"light"`);return e===`dark`||e===`system`?e:`light`}catch{return`light`}}
// Theme & Typography: lives on the Appearance tab (Settings & Platform Configuration)
function ThemeTypographyCard() {
  let [thd, setThd] = (0, C.useState)({});
  let [saving, setSaving] = (0, C.useState)(false);
  (0, C.useEffect)(() => {
    let alive = true;
    (async () => { try { let r = await fetch('/api/settings'); let j = await r.json(); if (alive && j.data) setThd(j.data.theme || {}); } catch (e) {} })();
    return () => { alive = false; };
  }, []);
  let updateField = (section, field, value) => setThd((prev) => ({ ...prev, [field]: value }));
  let save = async () => {
    try {
      setSaving(true);
      let res = await fetch('/api/settings/theme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(thd) });
      let j = await res.json();
      if (j.success) t('Theme & Typography saved', { icon: 'check' }); else t(j.message || 'Error saving theme', { icon: 'x' });
    } catch (e) { t('Failed to save theme', { icon: 'x' }); } finally { setSaving(false); }
  };
  return (0, w.jsx)('div', {
    className: 'admin-hub admin-groups',
    children: (0, w.jsx)(AdminGroup, {
      icon: 'sun',
      title: 'Theme & Typography',
      desc: 'Brand colours, light / dark mode and the fonts used across the web app',
      children: [

                  (0, w.jsxs)(p, {
                    label: 'Primary Theme Color (Hex)',
                    children: [
                      (0, w.jsx)(ColorPalette, { name: 'Primary', value: thd.primaryColor || '', onChange: (v2) => updateField('theme', 'primaryColor', v2) }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Primary brand accent color (e.g. #4d33b6)' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Secondary Theme Color (Hex)',
                    children: [
                      (0, w.jsx)(ColorPalette, { name: 'Secondary', value: thd.secondaryColor || '', onChange: (v2) => updateField('theme', 'secondaryColor', v2) }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Secondary supporting color token' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Theme Mode',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: thd.mode || '',
                        onChange: ev => updateField('theme', 'mode', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select mode...' }),
                          (0, w.jsx)('option', { value: 'Day', children: 'Day' }),
                          (0, w.jsx)('option', { value: 'Night', children: 'Night' }),
                          (0, w.jsx)('option', { value: 'Auto', children: 'Auto' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: Day, Night, Auto' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Theme Type',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: thd.type || '',
                        onChange: ev => updateField('theme', 'type', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select type...' }),
                          (0, w.jsx)('option', { value: 'Lite', children: 'Lite' }),
                          (0, w.jsx)('option', { value: 'Dark', children: 'Dark' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: Lite, Dark' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Header Font Family',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: thd.headerFont || '',
                        onChange: ev => updateField('theme', 'headerFont', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select header font...' }),
                          (0, w.jsx)('option', { value: 'Outfit', children: 'Outfit' }),
                          (0, w.jsx)('option', { value: 'Plus Jakarta Sans', children: 'Plus Jakarta Sans' }),
                          (0, w.jsx)('option', { value: 'Inter', children: 'Inter' }),
                          (0, w.jsx)('option', { value: 'Cabinet Grotesk', children: 'Cabinet Grotesk' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: Outfit, Plus Jakarta Sans, Inter, Cabinet Grotesk' })
                    ]
                  }),
                  (0, w.jsxs)(p, {
                    label: 'Paragraph Font Family',
                    children: [
                      (0, w.jsxs)('select', {
                        className: 'select',
                        value: thd.paragraphFont || '',
                        onChange: ev => updateField('theme', 'paragraphFont', ev.target.value),
                        children: [
                          (0, w.jsx)('option', { value: '', children: 'Select paragraph font...' }),
                          (0, w.jsx)('option', { value: 'Inter', children: 'Inter' }),
                          (0, w.jsx)('option', { value: 'Plus Jakarta Sans', children: 'Plus Jakarta Sans' }),
                          (0, w.jsx)('option', { value: 'Roboto', children: 'Roboto' })
                        ]
                      }),
                      (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Options: Inter, Plus Jakarta Sans, Roboto' })
                    ]
                  }),
                  (0, w.jsxs)('div', {
                    className: 'span-2 admin-toggle-row',
                    children: [
                      (0, w.jsxs)('div', {
                        className: 'admin-toggle-info',
                        children: [
                          (0, w.jsx)('b', { children: 'Show Public Theme Switcher' }),
                          (0, w.jsx)('small', { className: 'admin-field-desc', children: 'Allows visitors/users to toggle light and dark mode' })
                        ]
                      }),
                      (0, w.jsx)(_, {
                        on: Boolean(thd.showThemeToggle),
                        label: 'Show Public Theme Switcher',
                        onChange: val => updateField('theme', 'showThemeToggle', val)
                      })
                    ]
                  }),
        (0, w.jsxs)('div', {
          className: 'span-3 admin-theme-actions',
          children: [
            (0, w.jsx)('button', { type: 'button', className: 'btn btn--primary', disabled: saving, onClick: save, children: saving ? 'Saving...' : 'Save Theme & Typography' })
          ]
        })
      ]
    })
  });
}

function F(){let[e,t]=(0,C.useState)(o?document.documentElement.dataset.theme===`dark`?`dark`:`light`:P()),[n,r]=(0,C.useState)(document.documentElement.classList.contains(`is-rail`)),[a,s]=(0,C.useState)(matchMedia(`(min-width: 1280px)`).matches);(0,C.useEffect)(()=>{let e=matchMedia(`(min-width: 1280px)`),t=()=>s(e.matches),n=()=>r(document.documentElement.classList.contains(`is-rail`));return e.addEventListener(`change`,t),addEventListener(`tessly:rail`,n),()=>{e.removeEventListener(`change`,t),removeEventListener(`tessly:rail`,n)}},[]);let c=(e,n)=>{i(n),t(e);let r=e===`system`?matchMedia(`(prefers-color-scheme: dark)`).matches?`dark`:`light`:e;if(document.documentElement.dataset.theme===r){if(!o)try{localStorage.setItem(`tessly:theme`,JSON.stringify(e))}catch{}}else S(r,n);if(e===`system`&&!o)try{localStorage.setItem(`tessly:theme`,JSON.stringify(`system`))}catch{}};return(0,w.jsxs)(`div`,{className:`stack`,children:[(0,w.jsx)(h,{title:`Theme`,sub:`Light and dark are both designed; System follows your device`,children:(0,w.jsx)(`div`,{className:`st-themes`,role:`radiogroup`,"aria-label":`Theme`,children:[`light`,`dark`,`system`].map(t=>(0,w.jsxs)(`button`,{type:`button`,role:`radio`,"aria-checked":e===t,className:`st-theme${e===t?` is-on`:``}`,onClick:e=>c(t,e.currentTarget),"data-tile":``,children:[(0,w.jsxs)(`span`,{className:`st-theme__prev st-theme__prev--${t}`,"aria-hidden":`true`,children:[(0,w.jsx)(`i`,{}),(0,w.jsx)(`i`,{}),(0,w.jsx)(`i`,{})]}),(0,w.jsxs)(`span`,{className:`st-theme__lbl`,children:[(0,w.jsx)(v,{name:t===`light`?`sun`:t===`dark`?`moon`:`globe`}),t===`light`?`Light`:t===`dark`?`Dark`:`System`,e===t&&(0,w.jsx)(v,{name:`check`,className:`st-theme__ok`})]})]},t))})}),(0,w.jsx)(ThemeTypographyCard,{})]})}function I(){return(0,w.jsxs)(`div`,{className:`st-grid`,children:[(0,w.jsxs)(h,{title:`Demo data`,sub:`Everything here is fictional and saved in this browser`,children:[(0,w.jsx)(`p`,{className:`muted`,style:{marginBottom:14},children:`Resetting puts back every client, deal, invoice and task as it was on first open. Your theme and sidebar choice stay.`}),(0,w.jsxs)(`button`,{className:`btn st-danger`,type:`button`,onClick:async e=>{await c({title:`Reset demo data?`,text:`All changes you made — new deals, moved cards, sent messages — will be replaced with the original data.`,ok:`Reset data`,danger:!0},e.currentTarget)&&(r(),t(`Demo data reset`,{icon:`reset`}))},children:[(0,w.jsx)(v,{name:`reset`}),`Reset demo data`]})]}),(0,w.jsxs)(h,{title:`Session`,sub:`Signed in as Ines Okafor`,children:[(0,w.jsx)(`p`,{className:`muted`,style:{marginBottom:14},children:`Signing out returns you to the sign-in screen. Any password of four characters signs you back in.`}),(0,w.jsxs)(`button`,{className:`btn btn--ink`,type:`button`,onClick:()=>s(e=>{e.settings.signedIn=!1}),children:[(0,w.jsx)(v,{name:`logout`}),`Sign out`]})]})]})}export{E as default};
