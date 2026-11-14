import Account from '../models/accounts/Account.js';
import AssetCategory from '../models/accounts/AssetCategory.js';
import ExpenseCategory from '../models/accounts/ExpenseCategory.js';
import BankAccount from '../models/accounts/BankAccount.js';
import SalesInvoice from '../models/accounts/SalesInvoice.js';
import Expense from '../models/accounts/Expense.js';
import StockInward from '../models/accounts/StockInward.js';
import Emi from '../models/accounts/Emi.js';
import { computeEmi } from './emiEngine.js';
import Asset from '../models/accounts/Asset.js';
import JournalEntry from '../models/accounts/JournalEntry.js';
import { CHART_OF_ACCOUNTS, postJournal, round2 } from './accountsEngine.js';

export const SEED_ASSET_CATEGORIES = [
  { code: 'AC-001', name: 'Gym Equipment', description: 'Weight machines, treadmills, free weights, ellipticals, dumbbells.', branch: 'All Branches', status: 'Active' },
  { code: 'AC-002', name: 'IT & Electronics', description: 'Biometric terminals, computers, POS displays, audio systems, CCTV.', branch: 'All Branches', status: 'Active' },
  { code: 'AC-003', name: 'Furniture & Fixtures', description: 'Reception counters, locker room benches, lockers, office desks.', branch: 'All Branches', status: 'Active' },
  { code: 'AC-004', name: 'Vehicles', description: 'Club shuttle vans, transport vehicles.', branch: 'All Branches', status: 'Active' },
  { code: 'AC-005', name: 'Buildings', description: 'Structural leasehold improvements, real estate, interior build-outs.', branch: 'All Branches', status: 'Active' },
  { code: 'AC-006', name: 'Other Assets', description: 'Miscellaneous capitalized equipment.', branch: 'All Branches', status: 'Active' }
];

export const SEED_EXPENSE_CATEGORIES = [
  { code: 'EXP-001', name: 'Facility Rent', description: 'Monthly lease for the gym floor and studio space.', accountCode: '5100', branch: 'All Branches', status: 'Active' },
  { code: 'EXP-002', name: 'Electricity & Power', description: 'Utility bills, generator fuel, power backup.', accountCode: '5200', branch: 'All Branches', status: 'Active' },
  { code: 'EXP-003', name: 'Maintenance & Repairs', description: 'Equipment servicing, HVAC, plumbing, annual contracts.', accountCode: '5300', branch: 'All Branches', status: 'Active' },
  { code: 'EXP-004', name: 'Marketing & Advertising', description: 'Campaigns, signage, local promotions, sponsorships.', accountCode: '5400', branch: 'All Branches', status: 'Active' },
  { code: 'EXP-005', name: 'Staff Salaries & Payroll', description: 'Wages, bonuses, overtime, statutory contributions.', accountCode: '5500', branch: 'All Branches', status: 'Active' },
  { code: 'EXP-006', name: 'Software Subscriptions', description: 'CRM, accounting SaaS, payroll tooling.', accountCode: '5000', branch: 'All Branches', status: 'Active' },
  { code: 'EXP-007', name: 'Sanitation & Housekeeping', description: 'Cleaning consumables, hygiene services, waste disposal.', accountCode: '5000', branch: 'All Branches', status: 'Active' },
  { code: 'EXP-008', name: 'Professional Fees', description: 'Accountancy, audit, legal and consultancy.', accountCode: '5000', branch: 'All Branches', status: 'Inactive' }
];

export const SEED_BANK_ACCOUNTS = [
  {
    accountNumber: '50200088192831', accountName: 'HDFC Bank Operating A/c',
    accountType: 'Checking / Current', bankName: 'HDFC Bank', ifsc: 'HDFC0000240',
    openingBalance: 850000, currentBalance: 850000, status: 'Active', branch: 'Bandra'
  },
  {
    accountNumber: '004501112233', accountName: 'SBI Current A/c',
    accountType: 'Checking / Current', bankName: 'State Bank of India', ifsc: 'SBIN0000456',
    openingBalance: 425000, currentBalance: 425000, status: 'Active', branch: 'Andheri'
  },
  {
    accountNumber: 'PETTY-001', accountName: 'Main Reception Petty Cash',
    accountType: 'Petty Cash', bankName: 'Front Desk', ifsc: '',
    openingBalance: 25000, currentBalance: 25000, status: 'Active', branch: 'Bandra'
  }
];

const period = (monthsAgo = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
};
const dayIn = (monthsAgo, day) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.toISOString().slice(0, 7)}-${String(day).padStart(2, '0')}`;
};

/**
 * Seed the Accounts & Finance module.
 * Mirrors the finance seed convention: only seed when a collection is empty,
 * so a restart never overwrites real data.
 */
export const seedAccountsData = async () => {
  try {
    // --- Chart of accounts ---------------------------------------------------
    if ((await Account.countDocuments()) === 0) {
      await Account.insertMany(CHART_OF_ACCOUNTS.map((a) => ({ ...a, active: true })));
      console.log(`[Seed] Seeded ${CHART_OF_ACCOUNTS.length} chart-of-accounts entries.`);
    }

    if ((await Emi.countDocuments()) === 0) {
      const plans = [
        { productName: 'Commercial Treadmill Pro X', category: 'Gym Equipment', principal: 240000, emiCount: 12, interestRate: 10, startDate: '2026-09-05', paidCount: 2, processingCharges: 2400, transactionFee: 99, branch: 'Bandra', notes: 'Supplier finance — 12 months' },
        { productName: 'Biometric Access Terminals (4)', category: 'IT & Electronics', principal: 96000, emiCount: 6, interestRate: 0, startDate: '2026-10-10', paidCount: 1, processingCharges: 960, transactionFee: 0, branch: 'Andheri', notes: 'No-cost EMI offer' },
        { productName: 'Studio Sound System', category: 'Appliances', principal: 180000, emiCount: 18, interestRate: 12, startDate: '2026-11-15', paidCount: 0, processingCharges: 1800, transactionFee: 50, branch: 'All Branches', notes: '' }
      ];
      for (let i = 0; i < plans.length; i += 1) {
        const { schedule, ...d } = computeEmi(plans[i]); // eslint-disable-line no-unused-vars
        await Emi.create({ ...plans[i], emiNumber: `EMI-${String(i + 1).padStart(6, '0')}`, ...d });
      }
      console.log(`[Seed] Seeded ${plans.length} EMI plans.`);
    }

    if ((await AssetCategory.countDocuments()) === 0) {
      await AssetCategory.insertMany(SEED_ASSET_CATEGORIES);
      console.log(`[Seed] Seeded ${SEED_ASSET_CATEGORIES.length} asset categories.`);
    }

    if ((await ExpenseCategory.countDocuments()) === 0) {
      await ExpenseCategory.insertMany(SEED_EXPENSE_CATEGORIES);
      console.log(`[Seed] Seeded ${SEED_EXPENSE_CATEGORIES.length} expense categories.`);
    }

    if ((await BankAccount.countDocuments()) === 0) {
      await BankAccount.insertMany(SEED_BANK_ACCOUNTS);
      console.log(`[Seed] Seeded ${SEED_BANK_ACCOUNTS.length} bank accounts.`);
    }

    // --- Transactions (only when the ledger is empty) ------------------------
    if ((await JournalEntry.countDocuments()) === 0 && (await SalesInvoice.countDocuments()) === 0) {
      // --- Opening balances --------------------------------------------------
      // Without an opening entry the books cannot tie: cash would be credited
      // by every expense and asset purchase but never debited into, so the
      // balance sheet would not balance.
      await postJournal({
        date: dayIn(12, 1),
        description: 'Opening balances — cash and bank brought forward',
        sourceModule: 'AdjustmentEntry',
        sourceId: 'opening-balances',
        reference: 'OPEN-000001',
        branch: 'All Branches',
        lines: [
          { accountCode: '1010', debit: 25000, credit: 0 },
          { accountCode: '1020', debit: 1275000, credit: 0 },
          { accountCode: '3000', debit: 0, credit: 1300000 }
        ]
      });

      // --- Stock inward (creates the sellable inventory) --------------------
      const inward = await StockInward.create({
        inwardNumber: 'SI-000001',
        supplier: 'FitPro Distribution Pvt Ltd',
        supplierInvoice: 'FPD/2026/1187',
        date: dayIn(1, 6),
        category: 'Supplements',
        branch: 'Bandra',
        items: [
          { sku: 'SKU-WHEY-01', description: 'Whey Protein Isolate 1kg', quantity: 40, unitCost: 1800, sellingPrice: 2500, lineTotal: 72000, availableQuantity: 40 },
          { sku: 'SKU-BCAA-01', description: 'BCAA 500g Tub', quantity: 25, unitCost: 1100, sellingPrice: 1600, lineTotal: 27500, availableQuantity: 25 },
          { sku: 'SKU-CREA-01', description: 'Creatine Monohydrate 300g', quantity: 30, unitCost: 950, sellingPrice: 1400, lineTotal: 28500, availableQuantity: 30 },
          { sku: 'SKU-TSHIRT-01', description: 'Branded Training Tee', quantity: 60, unitCost: 420, sellingPrice: 900, lineTotal: 25200, availableQuantity: 60 }
        ],
        payments: [
          { mode: 'Cash', amount: 50000, reference: 'Cash receipt CR-4471' },
          { mode: 'Bank Transfer', amount: 73200, utrReference: 'UTR99812' }
        ],
        status: 'Paid',
        notes: 'Quarterly consumables restock.'
      });
      await postJournal({
        date: inward.date,
        description: `Stock inward ${inward.inwardNumber} — ${inward.supplier}`,
        sourceModule: 'StockInward',
        sourceId: inward._id.toString(),
        reference: inward.inwardNumber,
        branch: inward.branch,
        lines: [
          { accountCode: '1300', debit: inward.totalAmount, credit: 0 },
          { accountCode: '1020', debit: 0, credit: inward.paidAmount },
          { accountCode: '2000', debit: 0, credit: inward.balanceDue }
        ]
      });

      // --- Sales invoices -----------------------------------------------------
      const invoices = [
        {
          invoiceNumber: 'INV-000001', customer: 'Meera Iyer', invoiceDate: dayIn(2, 8),
          dueDate: dayIn(1, 8), paymentTerms: 'Net 30',
          items: [{ productService: 'Personal Training — 12 Session Pack', quantity: 1, rate: 24000, subtotal: 24000 }],
          discount: 2000, tax: 4320, grandTotal: 26320, paidAmount: 13160, outstandingAmount: 13160,
          paymentMode: 'Bank Transfer', status: 'Partially Paid', branch: 'Bandra',
          notes: 'Balance on the 15th.'
        },
        {
          invoiceNumber: 'INV-000002', customer: 'Zenith Cloudworks Ltd', invoiceDate: dayIn(1, 14),
          dueDate: dayIn(0, 14), paymentTerms: 'Net 30',
          items: [
            { productService: 'Whey Protein Isolate 1kg', quantity: 6, rate: 2500, subtotal: 15000, stockRef: 'SKU-WHEY-01' },
            { productService: 'Branded Training Tee', quantity: 8, rate: 900, subtotal: 7200, stockRef: 'SKU-TSHIRT-01' }
          ],
          discount: 0, tax: 3996, grandTotal: 26196, paidAmount: 26196, outstandingAmount: 0,
          paymentMode: 'UPI', status: 'Paid', branch: 'Bandra', notes: ''
        },
        {
          invoiceNumber: 'INV-000003', customer: 'Aarav Nair', invoiceDate: dayIn(0, 3),
          dueDate: dayIn(0, 3), paymentTerms: 'Due on Receipt',
          items: [{ productService: 'Guest Day Pass', quantity: 4, rate: 800, subtotal: 3200 }],
          discount: 200, tax: 600, grandTotal: 3600, paidAmount: 0, outstandingAmount: 3600,
          paymentMode: 'Cash', status: 'Approved', branch: 'Andheri',
          notes: 'Corporate guest passes.'
        },
        {
          invoiceNumber: 'INV-000004', customer: 'Hyperion Media Group', invoiceDate: dayIn(3, 20),
          dueDate: dayIn(2, 20), paymentTerms: 'Net 15',
          items: [{ productService: 'Membership — Annual Premium', quantity: 2, rate: 45000, subtotal: 90000 }],
          discount: 0, tax: 16200, grandTotal: 106200, paidAmount: 106200, outstandingAmount: 0,
          paymentMode: 'Bank Transfer', status: 'Paid', branch: 'Bandra', notes: ''
        }
      ];

      // Cost of goods sold is derived from the stocked unit costs so the
      // seeded invoice posts the same way a live sale would.
      const costBySku = new Map();
      for (const item of inward.items || []) {
        if (item.sku) costBySku.set(item.sku, Number(item.unitCost) || 0);
      }

      for (const inv of invoices) {
        const invoice = await SalesInvoice.create(inv);
        let cogs = 0;
        for (const line of invoice.items || []) {
          if (!line.stockRef) continue;
          cogs += (costBySku.get(line.stockRef) || 0) * (Number(line.quantity) || 0);
        }
        cogs = round2(cogs);
        await postJournal({
          date: invoice.invoiceDate,
          description: `Sales invoice ${invoice.invoiceNumber} — ${invoice.customer}`,
          sourceModule: 'Sales',
          sourceId: invoice._id.toString(),
          reference: invoice.invoiceNumber,
          branch: invoice.branch,
          lines: [
            { accountCode: '1100', debit: invoice.grandTotal, credit: 0 },
            { accountCode: '4000', debit: 0, credit: round2(invoice.grandTotal - invoice.tax) },
            { accountCode: '2200', debit: 0, credit: invoice.tax },
            ...(invoice.paidAmount > 0
              ? [
                  { accountCode: invoice.paymentMode === 'Cash' ? '1010' : '1020', debit: invoice.paidAmount, credit: 0 },
                  { accountCode: '1100', debit: 0, credit: invoice.paidAmount }
                ]
              : []),
            ...(cogs > 0
              ? [
                  { accountCode: '4050', debit: cogs, credit: 0 },
                  { accountCode: '1300', debit: 0, credit: cogs }
                ]
              : [])
          ]
        });
      }

      // --- Expenses ----------------------------------------------------------
      const expenses = [
        { title: 'October Facility Rent', category: 'Facility Rent', amount: 185000, paymentMode: 'Bank Transfer', branch: 'Bandra', date: dayIn(1, 2), notes: 'Lease INV/2026/10' },
        { title: 'Electricity & Water Bill', category: 'Electricity & Power', amount: 42800, paymentMode: 'Bank Transfer', branch: 'Bandra', date: dayIn(1, 9), notes: 'Utility provider' },
        { title: 'Treadmill Servicing', category: 'Maintenance & Repairs', amount: 18500, paymentMode: 'Cheque', branch: 'Andheri', date: dayIn(0, 5), notes: 'Quarterly service contract' },
        { title: 'October Digital Campaign', category: 'Marketing & Advertising', amount: 32000, paymentMode: 'Credit Card', branch: 'Bandra', date: dayIn(0, 7), notes: 'Local gym promotion' },
        { title: 'CRM & Accounting Subscriptions', category: 'Software Subscriptions', amount: 12400, paymentMode: 'Cash', branch: 'Bandra', date: dayIn(0, 9), notes: 'Monthly SaaS' }
      ];
      for (const exp of expenses) {
        const category = await ExpenseCategory.findOne({ name: exp.category });
        const expense = await Expense.create({ ...exp, accountCode: category?.accountCode || '5000' });
        await postJournal({
          date: expense.date,
          description: `Expense — ${expense.title}`,
          sourceModule: 'Expenses',
          sourceId: expense._id.toString(),
          reference: expense.title,
          branch: expense.branch,
          lines: [
            { accountCode: expense.accountCode, debit: expense.amount, credit: 0 },
            { accountCode: expense.paymentMode === 'Cash' ? '1010' : '1020', debit: 0, credit: expense.amount }
          ]
        });
      }

      // --- Assets -------------------------------------------------------------
      const assets = [
        { assetId: 'AST-000001', assetName: 'LifeFitness Treadmill 95T', category: 'Gym Equipment', quantity: 4, purchaseDate: dayIn(10, 12), purchaseCost: 480000, currentValue: 480000, accumulatedDepreciation: 0, usefulLifeYears: 5, depreciationMethod: 'Straight Line', depreciationRate: 20, salvageValue: 48000, location: 'Cardio Zone', assignedEmployee: 'Rahul Sen', paymentType: 'Single', paymentMode: 'Bank Transfer', status: 'Active', branch: 'Bandra' },
        { assetId: 'AST-000002', assetName: 'Dumbbell Set 2.5–50kg', category: 'Gym Equipment', quantity: 2, purchaseDate: dayIn(8, 4), purchaseCost: 180000, currentValue: 180000, accumulatedDepreciation: 0, usefulLifeYears: 7, depreciationMethod: 'Straight Line', depreciationRate: 15, salvageValue: 18000, location: 'Main Gym', assignedEmployee: 'Aarav Nair', paymentType: 'Single', paymentMode: 'Bank Transfer', status: 'Active', branch: 'Bandra' },
        { assetId: 'AST-000003', assetName: 'Reception Counter & Lockers', category: 'Furniture & Fixtures', quantity: 1, purchaseDate: dayIn(14, 20), purchaseCost: 320000, currentValue: 320000, accumulatedDepreciation: 0, usefulLifeYears: 10, depreciationMethod: 'Straight Line', depreciationRate: 10, salvageValue: 32000, location: 'Reception', assignedEmployee: 'Meera Iyer', paymentType: 'Split Payment', paymentMode: 'Bank Transfer', status: 'Active', branch: 'Andheri' }
      ];
      for (const a of assets) {
        const asset = await Asset.create(a);
        await postJournal({
          date: asset.purchaseDate,
          description: `Asset purchase ${asset.assetId} — ${asset.assetName}`,
          sourceModule: 'Assets',
          sourceId: asset._id.toString(),
          reference: asset.assetId,
          branch: asset.branch,
          lines: [
            { accountCode: '1500', debit: asset.purchaseCost, credit: 0 },
            { accountCode: asset.paymentMode === 'Cash' ? '1010' : '1020', debit: 0, credit: asset.purchaseCost }
          ]
        });
      }

      console.log('[Seed] Seeded accounts transactions (1 stock inward, 4 invoices, 5 expenses, 3 assets) with ledger postings.');
    }
  } catch (error) {
    console.error('[Seed] Error seeding accounts data:', error.message);
  }
};
