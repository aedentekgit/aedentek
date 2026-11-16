import Client from '../models/Client.js';
import ServiceType from '../models/ServiceType.js';
import { regenerateSchedule, validateBillingSettings, validateDocumentRows, syncDocumentRows } from './clientSubController.js';

// Default Seed Clients matching clean specification data
export const SEED_CLIENTS = [
  {
    clientId: 'client-omni-retail',
    agreementFrom: '2026-04-12',
    agreementTo: '2027-04-11',
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
    createdDate: new Date('2026-04-12'),
    contacts: [
      {
        id: 'contact-omni-1',
        clientId: 'client-omni-retail',
        name: 'Rajesh Kothari',
        role: 'Chief Commercial Officer',
        email: 'r.kothari@omniretail.com',
        phone: '+91 98200 44332',
        isPrimary: true
      },
      {
        id: 'contact-omni-2',
        clientId: 'client-omni-retail',
        name: 'Sneha Patel',
        role: 'Chief Technology Officer',
        email: 'sneha.p@omniretail.com',
        phone: '+91 98200 99881',
        isPrimary: false
      },
      {
        id: 'contact-omni-3',
        clientId: 'client-omni-retail',
        name: 'Alok Gupta',
        role: 'Head of Billing & Procurement',
        email: 'billing@omniretail.com',
        phone: '+91 98200 77665',
        isPrimary: false
      }
    ],
    websites: [
      {
        id: 'web-omni-1',
        clientId: 'client-omni-retail',
        domain: 'portal.omniretail.com',
        status: 'Live',
        hostingProvider: 'AWS Mumbai (ap-south-1)',
        sslExpiry: '2027-04-10',
        domainExpiry: '2028-02-15',
        hostingExpiry: '2027-05-01'
      },
      {
        id: 'web-omni-2',
        clientId: 'client-omni-retail',
        domain: 'staging.omniretail.com',
        status: 'Staging',
        hostingProvider: 'Vercel Enterprise',
        sslExpiry: '2026-12-31',
        domainExpiry: '2028-02-15',
        hostingExpiry: '2027-01-15'
      }
    ],
    social: [
      {
        id: 'soc-omni-1',
        clientId: 'client-omni-retail',
        key: 'li',
        name: 'LinkedIn Corporate',
        handle: 'linkedin.com/company/omni-retail-solutions',
        desc: 'Institutional retail logistics & commerce announcements',
        status: 'Connected',
        kind: 'good',
        href: 'https://linkedin.com',
        cta: 'View Page',
        icon: 'globe',
        tone: 'blue'
      },
      {
        id: 'soc-omni-2',
        clientId: 'client-omni-retail',
        key: 'x',
        name: 'Twitter / X Commerce Feed',
        handle: '@omni_retail',
        desc: 'Public catalog rollouts and logistics notices',
        status: 'Active',
        kind: 'info',
        href: 'https://twitter.com',
        cta: 'View Channel',
        icon: 'globe',
        tone: 'ink'
      },
      {
        id: 'soc-omni-3',
        clientId: 'client-omni-retail',
        key: 'gh',
        name: 'GitHub Organization',
        handle: 'github.com/omni-retail',
        desc: 'Source repos for vendor catalog microservices',
        status: 'Verified',
        kind: 'good',
        href: 'https://github.com',
        cta: 'Open Repo',
        icon: 'globe',
        tone: 'violet'
      }
    ],
    credentials: [
      {
        id: 'cred-omni-1',
        clientId: 'client-omni-retail',
        type: 'AWS Cloud',
        label: 'AWS Production IAM Admin Console',
        loginUrl: 'https://omniretail.signin.aws.amazon.com/console',
        username: 'aedentek-ops',
        password: 'EncryptedSecretString123!',
        notes: 'IAM Role with restricted CloudFront and S3 bucket access'
      },
      {
        id: 'cred-omni-2',
        clientId: 'client-omni-retail',
        type: 'MySQL',
        label: 'Aurora DB Cluster Replica Primary',
        loginUrl: 'mysql://cluster.omni.internal:3306',
        username: 'app_master_rw',
        password: 'OmniSecure$Key9921',
        notes: 'Production read-write instance in private VPC subnet'
      }
    ],
    projects: [
      {
        id: 'proj-omni-1',
        clientId: 'client-omni-retail',
        title: 'Vendor Mobile App Extension Phase 2',
        contractValue: 350000,
        milestonesCompleted: 3,
        totalMilestones: 4,
        progress: 75,
        targetDate: '2026-11-30',
        leadEngineer: 'Hanna Lindqvist'
      },
      {
        id: 'proj-omni-2',
        clientId: 'client-omni-retail',
        title: 'Omni Architecture & API Modernization',
        contractValue: 476000,
        milestonesCompleted: 5,
        totalMilestones: 5,
        progress: 100,
        targetDate: '2026-08-15',
        leadEngineer: 'Tomás Reyes'
      }
    ],
    invoices: [
      {
        id: 'inv-omni-1',
        projectId: 'proj-omni-2',
        invoiceNumber: 'INV-2026-0081',
        issueDate: '2026-08-15',
        dueDate: '2026-08-30',
        subtotal: 400000,
        taxAmount: 72000,
        totalAmount: 472000,
        status: 'Paid',
        taxMode: 'B2B Registered'
      },
      {
        id: 'inv-omni-2',
        projectId: 'proj-omni-1',
        invoiceNumber: 'INV-2026-0094',
        issueDate: '2026-09-01',
        dueDate: '2026-09-15',
        subtotal: 300000,
        taxAmount: 54000,
        totalAmount: 354000,
        status: 'Partially Paid',
        taxMode: 'B2B Registered'
      }
    ],
    payments: [
      {
        id: 'pay-omni-1',
        receiptId: 'REC-2026-0038',
        paymentDate: '2026-08-28',
        amount: 472000,
        paymentChannel: 'RTGS Inter-Bank',
        bankReference: 'HDFCR20260828001928'
      },
      {
        id: 'pay-omni-2',
        receiptId: 'REC-2026-0045',
        paymentDate: '2026-09-12',
        amount: 200000,
        paymentChannel: 'NEFT Clearing',
        bankReference: 'HDFCN20260912008472'
      }
    ],
    tickets: [
      {
        id: 'tkt-omni-1',
        ticketId: 'HD-2026-018',
        subject: 'VPC Peering Gateway Latency in AP-South-1',
        priority: 'High',
        status: 'Resolved',
        assignedEngineer: 'Rahul Sen',
        createdAt: '2026-09-20'
      }
    ],
    documents: [
      {
        id: 'doc-omni-1',
        name: 'Master Services Agreement (MSA) — 2026',
        type: 'PDF',
        size: '1.8 MB',
        uploadedAt: '2026-04-12',
        url: '#'
      },
      {
        id: 'doc-omni-2',
        name: 'Statement of Work (SOW-04) — Mobile APIs',
        type: 'PDF',
        size: '940 KB',
        uploadedAt: '2026-09-05',
        url: '#'
      }
    ],
    timeline: [
      {
        id: 'act-omni-1',
        title: 'Partial Payment Reconciled',
        description: 'Received ₹ 2,00,000 for invoice INV-2026-0094 via NEFT',
        timestamp: '2026-09-12 14:32',
        operator: 'Accounting Desk',
        icon: 'credit-card'
      },
      {
        id: 'act-omni-2',
        title: 'Tax Invoice INV-2026-0094 Issued',
        description: 'Statutory GST B2B invoice generated for Sprint Milestone 3',
        timestamp: '2026-09-01 10:15',
        operator: 'Rahul Sen',
        icon: 'receipt'
      },
      {
        id: 'act-omni-3',
        title: 'Invoice Settled in Full',
        description: 'Invoice INV-2026-0081 cleared with ₹ 4,72,000 RTGS transfer',
        timestamp: '2026-08-28 16:40',
        operator: 'Accounting Desk',
        icon: 'check'
      },
      {
        id: 'act-omni-4',
        title: 'Client Onboarding Complete',
        description: 'Corporate coordinates and statutory GSTIN 27AAFCO1234F1Z8 verified',
        timestamp: '2026-04-12 09:00',
        operator: 'System',
        icon: 'user'
      }
    ],
    compliance: {
      gstinValid: true,
      stateCode: '27 (Maharashtra)',
      taxRegime: 'CGST + SGST (Intra-State 18%)',
      lutReference: 'N/A (Domestic B2B)',
      tdsRate: '2.0% (Section 194C / 194J)',
      itcEligible: true
    },
    monthlyBilling: {
      amount: 50000,
      gstMode: 'With GST',
      gstRate: 18
    },
    monthlySchedule: [
      { id: 'bill-omni-1', month: '2026-08', dueDate: '2026-08-15', baseAmount: 50000, gstAmount: 9000, totalAmount: 59000, status: 'Paid', paidDate: '2026-08-14', notes: 'Monthly Retainer Cloud Support' },
      { id: 'bill-omni-2', month: '2026-09', dueDate: '2026-09-15', baseAmount: 50000, gstAmount: 9000, totalAmount: 59000, status: 'Paid', paidDate: '2026-09-12', notes: 'Monthly Retainer Cloud Support' },
      { id: 'bill-omni-3', month: '2026-10', dueDate: '2026-10-15', baseAmount: 50000, gstAmount: 9000, totalAmount: 59000, status: 'Pending', paidDate: '', notes: 'Monthly Retainer Cloud Support' }
    ],
    financialSummary: {
      totalBilled: 826000,
      totalPaid: 672000,
      totalOutstanding: 154000
    }
  },
  {
    clientId: 'client-kavita-edu',
    agreementFrom: '2026-05-20',
    agreementTo: '2027-05-19',
    name: 'Kavita Krishnamurthy',
    company: 'Kavita Edutech',
    email: 'kavita@edutech.io',
    phone: '+91 99880 11223',
    category: 'Startup',
    status: 'Active',
    industry: 'Digital Learning & Video Streaming Platforms',
    accountManager: 'Ines Okafor',
    gstNumber: '33AABCA9988C1Z4',
    panNumber: 'AABCA9988C',
    address: 'Plot 48, Guindy Industrial Estate, Chennai, Tamil Nadu - 600032',
    city: 'Chennai',
    website: 'https://kavitaedutech.io',
    logo: '',
    notes: 'Fast-growing edutech startup using offline DRM video encryption modules.',
    createdDate: new Date('2026-05-20'),
    contacts: [
      {
        id: 'contact-kavita-1',
        clientId: 'client-kavita-edu',
        name: 'Kavita Krishnamurthy',
        role: 'Founder & CEO',
        email: 'kavita@edutech.io',
        phone: '+91 99880 11223',
        isPrimary: true
      }
    ],
    websites: [
      {
        id: 'web-kavita-1',
        clientId: 'client-kavita-edu',
        domain: 'app.kavitaedutech.io',
        status: 'Live',
        hostingProvider: 'DigitalOcean Bangalore',
        sslExpiry: '2027-06-15',
        domainExpiry: '2028-05-20',
        hostingExpiry: '2027-06-01'
      }
    ],
    social: [
      {
        id: 'soc-kavita-1',
        clientId: 'client-kavita-edu',
        key: 'li',
        name: 'LinkedIn Corporate',
        handle: 'linkedin.com/company/kavitaedutech',
        desc: 'Edutech leadership & learning technology announcements',
        status: 'Connected',
        kind: 'good',
        href: 'https://linkedin.com/company/kavitaedutech',
        cta: 'View Page',
        icon: 'globe',
        tone: 'blue'
      },
      {
        id: 'soc-kavita-2',
        clientId: 'client-kavita-edu',
        key: 'x',
        name: 'Twitter / X Feed',
        handle: '@kavita_edu',
        desc: 'Student video streaming announcements & app updates',
        status: 'Active',
        kind: 'info',
        href: 'https://twitter.com/kavita_edu',
        cta: 'View Channel',
        icon: 'globe',
        tone: 'ink'
      },
      {
        id: 'soc-kavita-3',
        clientId: 'client-kavita-edu',
        key: 'yt',
        name: 'YouTube Masterclass Channel',
        handle: 'youtube.com/@kavitaedutech',
        desc: 'Video lecture portal channel & masterclass demos',
        status: 'Active',
        kind: 'good',
        href: 'https://youtube.com',
        cta: 'Watch Stream',
        icon: 'globe',
        tone: 'amber'
      },
      {
        id: 'soc-kavita-4',
        clientId: 'client-kavita-edu',
        key: 'gh',
        name: 'GitHub Organization',
        handle: 'github.com/kavita-edutech',
        desc: 'DRM video encryption player SDK and native wrappers',
        status: 'Verified',
        kind: 'good',
        href: 'https://github.com/kavita-edutech',
        cta: 'Open Repo',
        icon: 'globe',
        tone: 'violet'
      }
    ],
    credentials: [
      {
        id: 'cred-kavita-1',
        clientId: 'client-kavita-edu',
        type: 'Vimeo Video',
        label: 'Vimeo Pro OTT Video API Channel',
        loginUrl: 'https://vimeo.com/manage',
        username: 'dev@edutech.io',
        password: 'VimeoEdutech$2026',
        notes: 'API tokens with video upload and domain restriction controls'
      }
    ],
    projects: [
      {
        id: 'proj-kavita-1',
        clientId: 'client-kavita-edu',
        title: 'Offline Video Encryption & Mobile DRM Module',
        contractValue: 180000,
        milestonesCompleted: 2,
        totalMilestones: 2,
        progress: 100,
        targetDate: '2026-10-15',
        leadEngineer: 'Tomás Reyes'
      }
    ],
    invoices: [
      {
        id: 'inv-kavita-1',
        projectId: 'proj-kavita-1',
        invoiceNumber: 'INV-2026-0118',
        issueDate: '2026-10-01',
        dueDate: '2026-10-16',
        subtotal: 150000,
        taxAmount: 27000,
        totalAmount: 177000,
        status: 'Sent',
        taxMode: 'B2C Retail'
      }
    ],
    payments: [],
    tickets: [],
    documents: [
      {
        id: 'doc-kavita-1',
        name: 'Non-Disclosure Agreement (NDA) Signed',
        type: 'PDF',
        size: '520 KB',
        uploadedAt: '2026-05-20',
        url: '#'
      }
    ],
    timeline: [
      {
        id: 'act-kavita-1',
        title: 'Tax Invoice INV-2026-0118 Sent',
        description: 'Invoice dispatched for Project Kickoff & UI Prototype',
        timestamp: '2026-10-01 11:20',
        operator: 'Ines Okafor',
        icon: 'receipt'
      }
    ],
    compliance: {
      gstinValid: true,
      stateCode: '33 (Tamil Nadu)',
      taxRegime: 'IGST (Inter-State 18%)',
      lutReference: 'N/A (Domestic)',
      tdsRate: '2.0% (Standard)',
      itcEligible: true
    },
    monthlyBilling: {
      amount: 25000,
      gstMode: 'With GST',
      gstRate: 18
    },
    monthlySchedule: [
      { id: 'bill-kavita-1', month: '2026-09', dueDate: '2026-09-10', baseAmount: 25000, gstAmount: 4500, totalAmount: 29500, status: 'Paid', paidDate: '2026-09-08', notes: 'Monthly Retainer DRM Maintenance' },
      { id: 'bill-kavita-2', month: '2026-10', dueDate: '2026-10-10', baseAmount: 25000, gstAmount: 4500, totalAmount: 29500, status: 'Pending', paidDate: '', notes: 'Monthly Retainer DRM Maintenance' }
    ],
    financialSummary: {
      totalBilled: 177000,
      totalPaid: 0,
      totalOutstanding: 177000
    }
  },
  {
    clientId: 'client-hyperion-media',
    agreementFrom: '2026-03-01',
    agreementTo: '2026-12-31',
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
    createdDate: new Date('2026-03-10'),
    contacts: [
      {
        id: 'contact-hyp-1',
        clientId: 'client-hyperion-media',
        name: 'Alexander Sterling',
        role: 'Managing Director',
        email: 'sterling@hyperionmedia.co.uk',
        phone: '+44 20 7946 0912',
        isPrimary: true
      }
    ],
    websites: [
      {
        id: 'web-hyp-1',
        clientId: 'client-hyperion-media',
        domain: 'cdn.hyperionmedia.co.uk',
        status: 'Live',
        hostingProvider: 'AWS Ireland (eu-west-1)',
        sslExpiry: '2027-08-30',
        domainExpiry: '2029-03-10',
        hostingExpiry: '2027-09-01'
      }
    ],
    social: [
      {
        id: 'soc-hyp-1',
        clientId: 'client-hyperion-media',
        key: 'li',
        name: 'LinkedIn Corporate',
        handle: 'linkedin.com/company/hyperion-media-group',
        desc: 'Global broadcasting network & corporate media press',
        status: 'Connected',
        kind: 'good',
        href: 'https://linkedin.com',
        cta: 'View Page',
        icon: 'globe',
        tone: 'blue'
      },
      {
        id: 'soc-hyp-2',
        clientId: 'client-hyperion-media',
        key: 'x',
        name: 'Twitter / X Media Feed',
        handle: '@hyperionmedia_uk',
        desc: 'Live broadcast alerts and transmission network updates',
        status: 'Active',
        kind: 'info',
        href: 'https://twitter.com',
        cta: 'View Channel',
        icon: 'globe',
        tone: 'ink'
      },
      {
        id: 'soc-hyp-3',
        clientId: 'client-hyperion-media',
        key: 'gh',
        name: 'GitHub Organization',
        handle: 'github.com/hyperion-media',
        desc: 'Video ingestion core pipeline repositories',
        status: 'Verified',
        kind: 'good',
        href: 'https://github.com',
        cta: 'Open Repo',
        icon: 'globe',
        tone: 'violet'
      }
    ],
    credentials: [
      {
        id: 'cred-hyp-1',
        clientId: 'client-hyperion-media',
        type: 'GitHub',
        label: 'Hyperion Video Ingestion Core Repo',
        loginUrl: 'https://github.com/hyperion-media',
        username: 'aedentek-ci',
        password: 'ghp_HyperionSecureToken99!',
        notes: 'Deploy keys for automatic video pipeline builds'
      }
    ],
    projects: [
      {
        id: 'proj-hyp-1',
        clientId: 'client-hyperion-media',
        title: 'Global Video Streaming & Transcoding Engine',
        contractValue: 750000,
        milestonesCompleted: 4,
        totalMilestones: 4,
        progress: 100,
        targetDate: '2026-09-20',
        leadEngineer: 'Rahul Sen'
      }
    ],
    invoices: [
      {
        id: 'inv-hyp-1',
        projectId: 'proj-hyp-1',
        invoiceNumber: 'INV-2026-0102',
        issueDate: '2026-09-10',
        dueDate: '2026-09-25',
        subtotal: 750000,
        taxAmount: 0,
        totalAmount: 750000,
        status: 'Paid',
        taxMode: 'Export LUT'
      }
    ],
    payments: [
      {
        id: 'pay-hyp-1',
        receiptId: 'REC-2026-0048',
        paymentDate: '2026-09-22',
        amount: 750000,
        paymentChannel: 'SWIFT International Wire',
        bankReference: 'BARCGB22XXXX098234'
      }
    ],
    tickets: [],
    documents: [
      {
        id: 'doc-hyp-1',
        name: 'Letter of Undertaking (LUT) Export Bond Reference',
        type: 'PDF',
        size: '1.1 MB',
        uploadedAt: '2026-03-10',
        url: '#'
      }
    ],
    timeline: [
      {
        id: 'act-hyp-1',
        title: 'Overseas SWIFT Wire Reconciled',
        description: 'Received ₹ 7,50,000 for invoice INV-2026-0102 via Barclays SWIFT',
        timestamp: '2026-09-22 17:10',
        operator: 'Accounting Desk',
        icon: 'check'
      }
    ],
    compliance: {
      gstinValid: true,
      stateCode: 'Overseas (UK)',
      taxRegime: 'Export LUT (0% Zero-Rated)',
      lutReference: 'ARN-AD270326001928K',
      tdsRate: '0.0% (Foreign Remittance)',
      itcEligible: true
    },
    monthlyBilling: {
      amount: 75000,
      gstMode: 'Without GST',
      gstRate: 0
    },
    monthlySchedule: [
      { id: 'bill-hyp-1', month: '2026-09', dueDate: '2026-09-15', baseAmount: 75000, gstAmount: 0, totalAmount: 75000, status: 'Paid', paidDate: '2026-09-15', notes: 'Monthly Retainer Overseas Streaming SLA' },
      { id: 'bill-hyp-2', month: '2026-10', dueDate: '2026-10-15', baseAmount: 75000, gstAmount: 0, totalAmount: 75000, status: 'Paid', paidDate: '2026-10-15', notes: 'Monthly Retainer Overseas Streaming SLA' }
    ],
    financialSummary: {
      totalBilled: 750000,
      totalPaid: 750000,
      totalOutstanding: 0
    }
  }
];

// GET /api/clients
export const getAllClients = async (req, res, next) => {
  try {
    const { category, q } = req.query;
    let query = {};

    if (category && category !== 'All' && category !== 'all') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { company: regex },
        { name: regex },
        { email: regex },
        { gstNumber: regex },
        { city: regex }
      ];
    }

    let clients = await Client.find(query).select('-documents.data -agreementDocument.data').sort({ createdAt: -1 });

    // Auto-seed if empty
    if (clients.length === 0 && !category && !q) {
      await Client.insertMany(SEED_CLIENTS);
      clients = await Client.find().select('-documents.data -agreementDocument.data').sort({ createdAt: -1 });
    }

    // Portfolio KPI Telemetry
    const all = await Client.find();
    const totalCount = all.length;
    const activeCount = all.filter(c => c.status === 'Active').length;
    const enterpriseCount = all.filter(c => c.category === 'Enterprise').length;
    const smbCount = all.filter(c => c.category === 'SMB' || c.category === 'Startup').length;

    res.status(200).json({
      success: true,
      message: 'Clients retrieved successfully',
      data: clients,
      kpis: {
        totalClients: totalCount,
        activeClients: activeCount,
        retentionRate: totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100,
        enterpriseAccounts: enterpriseCount,
        smbAccounts: smbCount,
        totalBilled: all.reduce((sum, c) => sum + ((c.financialSummary && c.financialSummary.totalBilled) || 0), 0),
        totalPaid: all.reduce((sum, c) => sum + ((c.financialSummary && c.financialSummary.totalPaid) || 0), 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/clients/:id
export const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let client = await Client.findOne({
      $or: [
        { clientId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client '${id}' not found`
      });
    }

    const clientData = client.toObject();
    [
      'contacts', 'websites', 'social', 'credentials', 'projects',
      'invoices', 'payments', 'tickets', 'documents', 'timeline', 'monthlySchedule'
    ].forEach((sec) => {
      if (!Array.isArray(clientData[sec])) clientData[sec] = [];
    });

    res.status(200).json({
      success: true,
      message: 'Client 360 profile retrieved successfully',
      data: clientData
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/clients
export const createClient = async (req, res, next) => {
  try {
    const {
      company,
      name,
      email,
      phone,
      category = 'Startup',
      status = 'Active',
      gstNumber = '',
      panNumber = '',
      address = '',
      city = 'Mumbai',
      accountManager = 'Rahul Sen',
      website = '',
      logo = '',
      notes = '',
      industry,
      agreementFrom = '',
      agreementTo = '',
      agreementDocument = {},
      monthlyBilling,
      documents: documentRows
    } = req.body;

    if (documentRows !== undefined) {
      const dErr = validateDocumentRows(documentRows);
      if (dErr) return res.status(400).json({ success: false, message: dErr });
    }

    if (monthlyBilling) {
      const bErr = validateBillingSettings(monthlyBilling);
      if (bErr) return res.status(400).json({ success: false, message: bErr });
    }

    if (agreementFrom && agreementTo && agreementTo < agreementFrom) {
      return res.status(400).json({ success: false, message: 'Agreement end date cannot be before the start date' });
    }

    if (!company || !name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company Name, Contact Person, and Email are required'
      });
    }

    const clientId = `client-${Date.now()}`;
    const primaryContact = {
      id: `contact-${Date.now()}`,
      clientId,
      name,
      role: 'Primary Contact',
      email,
      phone,
      isPrimary: true
    };

    const initialTimeline = [
      {
        id: `act-${Date.now()}`,
        title: 'Client Profile Created',
        description: `Direct registration for ${company} (${category})`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        operator: req.body.operator || 'Admin',
        icon: 'user'
      }
    ];

    const newClient = new Client({
      clientId,
      company,
      name,
      email,
      phone: phone || '+91 98200 00000',
      category,
      status,
      gstNumber,
      panNumber,
      address,
      city,
      accountManager,
      website,
      logo,
      notes,
      ...(industry ? { industry } : {}),
      agreementFrom,
      agreementTo,
      agreementDocument,
      contacts: [primaryContact],
      websites: website ? [{
        id: `web-${Date.now()}`,
        clientId,
        domain: website.replace(/^https?:\/\//, ''),
        status: 'Live',
        hostingProvider: 'AWS Cloud',
        sslExpiry: '2027-12-31'
      }] : [],
      social: [],
      credentials: [],
      projects: [],
      invoices: [],
      payments: [],
      tickets: [],
      documents: [],
      timeline: initialTimeline,
      financialSummary: { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 }
    });

    if (monthlyBilling && Number(monthlyBilling.amount) > 0 && agreementFrom && agreementTo) {
      newClient.monthlyBilling = { amount: Number(monthlyBilling.amount), gstMode: monthlyBilling.gstMode || 'Without GST', gstRate: monthlyBilling.gstRate !== undefined ? Number(monthlyBilling.gstRate) : 18 };
      regenerateSchedule(newClient);
    }

    if (Array.isArray(documentRows) && documentRows.length) syncDocumentRows(newClient, documentRows);

    const saved = await newClient.save();

    res.status(201).json({
      success: true,
      message: `Client '${company}' registered successfully`,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/clients/:id
export const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    let client = await Client.findOne({
      $or: [
        { clientId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client '${id}' not found`
      });
    }

    const allowedUpdates = [
      'company', 'name', 'email', 'phone', 'category', 'status',
      'industry', 'accountManager', 'gstNumber', 'panNumber',
      'address', 'city', 'website', 'logo', 'notes',
      'agreementFrom', 'agreementTo', 'agreementDocument'
    ];

    const nf = req.body.agreementFrom !== undefined ? req.body.agreementFrom : client.agreementFrom;
    const nt = req.body.agreementTo !== undefined ? req.body.agreementTo : client.agreementTo;
    if (nf && nt && nt < nf) {
      return res.status(400).json({ success: false, message: 'Agreement end date cannot be before the start date' });
    }

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        client[field] = req.body[field];
      }
    });

    if (req.body.monthlyBilling !== undefined) {
      const bErr = validateBillingSettings(req.body.monthlyBilling);
      if (bErr) return res.status(400).json({ success: false, message: bErr });
      const cur = client.monthlyBilling ? client.monthlyBilling.toObject() : {};
      client.monthlyBilling = { ...cur, ...req.body.monthlyBilling };
    }
    if ((req.body.monthlyBilling !== undefined || req.body.agreementFrom !== undefined || req.body.agreementTo !== undefined)
        && client.monthlyBilling && client.monthlyBilling.amount > 0 && client.agreementFrom && client.agreementTo) {
      regenerateSchedule(client);
    }

    if (req.body.documents !== undefined) {
      const dErr = validateDocumentRows(req.body.documents);
      if (dErr) return res.status(400).json({ success: false, message: dErr });
      syncDocumentRows(client, req.body.documents);
    }

    // Append update audit to timeline
    client.timeline.unshift({
      id: `act-${Date.now()}`,
      title: 'Profile Details Updated',
      description: `Corporate profile modified by ${req.body.operator || 'Account Manager'}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      operator: req.body.operator || 'Account Manager',
      icon: 'edit'
    });

    const updated = await client.save();

    res.status(200).json({
      success: true,
      message: `Client '${client.company}' updated successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/clients/:id
export const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Client.findOneAndDelete({
      $or: [
        { clientId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Client '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: `Client '${deleted.company}' deleted successfully`,
      data: { clientId: deleted.clientId, company: deleted.company }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/clients/:id/websites
export const addWebsite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { domain, status = 'Live', hostingProvider = 'AWS Cloud', sslExpiry, domainExpiry, hostingExpiry } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain is required' });
    }

    const client = await Client.findOne({
      $or: [
        { clientId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    });

    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const newWeb = {
      id: `web-${Date.now()}`,
      clientId: client.clientId,
      domain: domain.replace(/^https?:\/\//, ''),
      status,
      hostingProvider,
      sslExpiry: sslExpiry || '2027-12-31',
      domainExpiry: domainExpiry || '2028-06-30',
      hostingExpiry: hostingExpiry || '2027-12-31'
    };

    client.websites.push(newWeb);
    client.timeline.unshift({
      id: `act-${Date.now()}`,
      title: 'Domain Linked to Asset Catalog',
      description: `Domain ${newWeb.domain} added under ${newWeb.hostingProvider}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      operator: req.body.operator || 'Ops Admin',
      icon: 'globe'
    });

    await client.save();

    res.status(201).json({
      success: true,
      message: `Domain '${newWeb.domain}' added to client catalog`,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/clients/:id/websites/:webId
export const deleteWebsite = async (req, res, next) => {
  try {
    const { id, webId } = req.params;
    const client = await Client.findOne({
      $or: [
        { clientId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    });

    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    if (!client.websites.some(w => w.id === webId)) {
      return res.status(404).json({ success: false, message: 'Domain asset not found' });
    }
    client.websites = client.websites.filter(w => w.id !== webId);
    await client.save();

    res.status(200).json({
      success: true,
      message: 'Domain asset removed',
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/clients/:id/credentials
export const addCredential = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'Cloud Console', label, loginUrl, username, password, notes } = req.body;

    if (!label || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Label, Username, and Password are required'
      });
    }

    const client = await Client.findOne({
      $or: [
        { clientId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    });

    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const st = await ServiceType.findOne({ name: type }).collation({ locale: 'en', strength: 2 });
    if (st && st.status !== 'Active') {
      return res.status(400).json({ success: false, message: `Service type '${type}' is inactive` });
    }

    const newCred = {
      id: `cred-${Date.now()}`,
      clientId: client.clientId,
      type,
      label,
      loginUrl: loginUrl || '',
      username,
      password,
      notes: notes || ''
    };

    client.credentials.push(newCred);
    client.timeline.unshift({
      id: `act-${Date.now()}`,
      title: 'Secret Provisioned in Vault',
      description: `Encrypted credential for ${label} (${type}) added`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      operator: req.body.operator || 'Security Admin',
      icon: 'lock'
    });

    await client.save();

    res.status(201).json({
      success: true,
      message: `Credential '${label}' vaulted successfully`,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/clients/:id/credentials/:credId
export const deleteCredential = async (req, res, next) => {
  try {
    const { id, credId } = req.params;
    const client = await Client.findOne({
      $or: [
        { clientId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    });

    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    if (!client.credentials.some(c => c.id === credId)) {
      return res.status(404).json({ success: false, message: 'Credential not found' });
    }
    client.credentials = client.credentials.filter(c => c.id !== credId);
    await client.save();

    res.status(200).json({
      success: true,
      message: 'Credential removed from vault',
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/clients/reset
export const resetClients = async (req, res, next) => {
  try {
    await Client.deleteMany({});
    const inserted = await Client.insertMany(SEED_CLIENTS);

    res.status(200).json({
      success: true,
      message: 'Clients directory reset and seeded successfully',
      data: inserted
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/clients/:id/websites/:webId  |  PUT /api/clients/:id/credentials/:credId
// ---------------------------------------------------------------------------
const findClientByAnyId = (id) => Client.findOne({
  $or: [{ clientId: id }, ...(String(id).match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
});

export const updateWebsite = async (req, res, next) => {
  try {
    const { id, webId } = req.params;
    const client = await findClientByAnyId(id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const site = client.websites.find((w) => w.id === webId);
    if (!site) return res.status(404).json({ success: false, message: 'Domain asset not found' });
    const b = req.body || {};
    if ('domain' in b && !String(b.domain || '').trim()) {
      return res.status(400).json({ success: false, message: 'Domain is required' });
    }
    ['domain', 'status', 'hostingProvider', 'sslExpiry', 'domainExpiry', 'hostingExpiry'].forEach((k) => {
      if (b[k] !== undefined) site[k] = k === 'domain' ? String(b[k]).replace(/^https?:\/\//, '') : b[k];
    });
    client.markModified('websites');
    await client.save();
    return res.status(200).json({ success: true, message: 'Domain asset updated', data: client });
  } catch (error) {
    return next(error);
  }
};

export const updateCredential = async (req, res, next) => {
  try {
    const { id, credId } = req.params;
    const client = await findClientByAnyId(id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const cred = client.credentials.find((c) => c.id === credId);
    if (!cred) return res.status(404).json({ success: false, message: 'Credential not found' });
    const b = req.body || {};
    if (b.type !== undefined && b.type !== cred.type) {
      const st = await ServiceType.findOne({ name: b.type }).collation({ locale: 'en', strength: 2 });
      if (st && st.status !== 'Active') return res.status(400).json({ success: false, message: `Service type '${b.type}' is inactive` });
    }
    ['label', 'username'].forEach((k) => {
      if (k in b && !String(b[k] || '').trim()) { b.__bad = k; }
    });
    if (b.__bad) return res.status(400).json({ success: false, message: `${b.__bad} cannot be empty` });
    ['type', 'label', 'loginUrl', 'username', 'password', 'notes'].forEach((k) => {
      if (b[k] !== undefined && !(k === 'password' && !b[k])) cred[k] = b[k];
    });
    client.markModified('credentials');
    await client.save();
    return res.status(200).json({ success: true, message: 'Credential updated', data: client });
  } catch (error) {
    return next(error);
  }
};
