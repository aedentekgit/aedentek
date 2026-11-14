import Propagation from '../models/Propagation.js';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import { SEED_CLIENTS } from '../controllers/clientController.js';

export const livePropagations = [
  {
    propagationNumber: 'PRP-2026-0042',
    quotationNumber: 'PRP-2026-0042',
    clientId: 'client-1',
    clientName: 'Omni Retail Solutions Ltd',
    title: 'Vendor Mobile App Extension Phase 2',
    issueDate: '2026-08-10',
    date: new Date('2026-08-10'),
    validUntil: '2026-09-10',
    items: [
      {
        description: 'React Native iOS & Android Vendor Application',
        qty: 1,
        quantity: 1,
        rate: 250000,
        amount: 250000,
      },
      {
        description: 'Push Notification Integration & Offline Sync',
        qty: 1,
        quantity: 1,
        rate: 100000,
        amount: 100000,
      },
    ],
    subtotal: 350000,
    tax: 0,
    total: 350000,
    status: 'Accepted',
    notes: 'Formal proposal for Mobile App Phase 2. Validity 30 days.',
  },
  {
    propagationNumber: 'PRP-2026-0045',
    quotationNumber: 'PRP-2026-0045',
    clientId: 'client-3',
    clientName: 'Kavita Edutech',
    title: 'Offline Video Encryption Module',
    issueDate: '2026-08-24',
    date: new Date('2026-08-24'),
    validUntil: '2026-09-24',
    items: [
      {
        description: 'DRM License Server & Local Storage Encryptor',
        qty: 1,
        quantity: 1,
        rate: 180000,
        amount: 180000,
      },
    ],
    subtotal: 180000,
    tax: 0,
    total: 180000,
    status: 'Sent',
    notes: 'Proposal under active evaluation by Kavita Edutech executive committee.',
  },
];

export const liveInvoices = [
  {
    invoiceNumber: 'INV-2026-0081',
    clientId: 'client-1',
    clientName: 'Omni Retail Solutions Ltd',
    title: 'Sprint Milestone 1 & 2 - Architecture',
    hsn: '998314',
    issueDate: '2026-06-15',
    dueDate: '2026-07-05',
    items: [
      {
        sNo: 1,
        description: 'Sprint Milestone 1 & 2 - Architecture',
        hsn: '998314',
        price: 400000,
        qty: 1,
        gstPercent: 18,
        gstRate: 18,
        total: 400000,
      },
    ],
    isGst: true,
    gstCategory: 'B2B',
    clientGstNumber: '27AAFCO1234F1Z8',
    buyerGstin: '27AAFCO1234F1Z8',
    buyerPan: 'AAFCO1234F',
    buyerAddress: 'Trade Centre, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    gstRate: 18,
    gstAmount: 72000,
    gstType: 'CGST+SGST',
    cgstAmount: 36000,
    sgstAmount: 36000,
    igstAmount: 0,
    subtotal: 400000,
    tax: 72000,
    totalAmount: 472000,
    paidAmount: 472000,
    balance: 0,
    status: 'Paid',
    paymentRef: 'REC-2026-041 (Bank Transfer NEFT/RTGS: HDFC000024098172)',
    paymentMode: 'Bank Transfer (NEFT/RTGS)',
    notes: 'Domestic B2B supply. Input tax credit eligible.',
  },
  {
    invoiceNumber: 'INV-2026-0094',
    clientId: 'client-1',
    clientName: 'Omni Retail Solutions Ltd',
    title: 'Sprint Milestone 3 - Vendor Catalog',
    hsn: '998314',
    issueDate: '2026-08-10',
    dueDate: '2026-09-10',
    items: [
      {
        sNo: 1,
        description: 'Sprint Milestone 3 - Vendor Catalog',
        hsn: '998314',
        price: 300000,
        qty: 1,
        gstPercent: 18,
        gstRate: 18,
        total: 300000,
      },
    ],
    isGst: true,
    gstCategory: 'B2B',
    clientGstNumber: '27AAFCO1234F1Z8',
    buyerGstin: '27AAFCO1234F1Z8',
    buyerPan: 'AAFCO1234F',
    buyerAddress: 'Trade Centre, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    gstRate: 18,
    gstAmount: 54000,
    gstType: 'IGST',
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 54000,
    subtotal: 300000,
    tax: 54000,
    totalAmount: 354000,
    paidAmount: 200000,
    balance: 154000,
    status: 'Partially Paid',
    paymentRef: 'REC-2026-062 (Bank Transfer: HDFC000098231140)',
    paymentMode: 'Bank Transfer (NEFT)',
    notes: 'Inter-State B2B supply. Partial payment received.',
  },
  {
    invoiceNumber: 'INV-2026-0102',
    clientId: 'client-2',
    clientName: 'Hyperion Media Group',
    title: 'Milestone 2 - Streaming Engine',
    hsn: '998314',
    issueDate: '2026-07-20',
    dueDate: '2026-08-15',
    items: [
      {
        sNo: 1,
        description: 'Milestone 2 - Streaming Engine',
        hsn: '998314',
        price: 750000,
        qty: 1,
        gstPercent: 0,
        gstRate: 0,
        total: 750000,
      },
    ],
    isGst: false,
    gstCategory: 'Export LUT',
    clientGstNumber: '',
    buyerGstin: '',
    buyerAddress: '550 Madison Ave, New York, NY 10022, United States',
    lutNumber: 'AD330224001928K',
    gstRate: 0,
    gstAmount: 0,
    gstType: 'Export LUT',
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    subtotal: 750000,
    tax: 0,
    totalAmount: 750000,
    paidAmount: 750000,
    balance: 0,
    status: 'Paid',
    paymentRef: 'REC-2026-055 (International SWIFT Wire: CHASUS33XX98104)',
    paymentMode: 'International SWIFT Wire',
    notes: 'Supply meant for export under bond or letter of undertaking without payment of integrated tax.',
  },
  {
    invoiceNumber: 'INV-2026-0118',
    clientId: 'client-3',
    clientName: 'Kavita Edutech',
    title: 'Project Kickoff & UI Prototype',
    hsn: '998314',
    issueDate: '2026-08-25',
    dueDate: '2026-09-15',
    items: [
      {
        sNo: 1,
        description: 'Project Kickoff & UI Prototype',
        hsn: '998314',
        price: 150000,
        qty: 1,
        gstPercent: 18,
        gstRate: 18,
        total: 150000,
      },
    ],
    isGst: true,
    gstCategory: 'B2C',
    clientGstNumber: '',
    buyerGstin: '',
    buyerAddress: '24 Anna Salai, Chennai, Tamil Nadu 600002',
    gstRate: 18,
    gstAmount: 27000,
    gstType: 'IGST',
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 27000,
    subtotal: 150000,
    tax: 27000,
    totalAmount: 177000,
    paidAmount: 0,
    balance: 177000,
    status: 'Sent',
    paymentRef: '',
    paymentMode: '',
    notes: 'B2C retail billing. Unsettled.',
  },
];

export const seedFinanceData = async () => {
  try {
    const propCount = await Propagation.countDocuments();
    if (propCount === 0) {
      for (const p of livePropagations) {
        await Propagation.create(p);
      }
      console.log(`[Seed] Seeded ${livePropagations.length} live commercial propagations.`);
    }

    const invCount = await Invoice.countDocuments();
    if (invCount === 0) {
      for (const inv of liveInvoices) {
        await Invoice.create(inv);
      }
      console.log(`[Seed] Seeded ${liveInvoices.length} live tax invoices.`);
    }

    const clientCount = await Client.countDocuments();
    if (clientCount === 0) {
      await Client.insertMany(SEED_CLIENTS);
      console.log(`[Seed] Seeded ${SEED_CLIENTS.length} client 360 portfolio records.`);
    }
  } catch (error) {
    console.error('[Seed] Error seeding finance data:', error.message);
  }
};

