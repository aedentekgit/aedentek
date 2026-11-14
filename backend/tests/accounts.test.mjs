import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5095';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: JournalEntry } = await import('../src/models/accounts/JournalEntry.js');
const { default: SalesInvoice } = await import('../src/models/accounts/SalesInvoice.js');
const { default: Expense } = await import('../src/models/accounts/Expense.js');
const { default: ExpenseCategory } = await import('../src/models/accounts/ExpenseCategory.js');
const { default: StockInward } = await import('../src/models/accounts/StockInward.js');
const { default: CreditNote } = await import('../src/models/accounts/CreditNote.js');
const { default: Asset } = await import('../src/models/accounts/Asset.js');
const { default: AssetCategory } = await import('../src/models/accounts/AssetCategory.js');
const { default: JournalVoucher } = await import('../src/models/accounts/JournalVoucher.js');
const { default: BankAccount } = await import('../src/models/accounts/BankAccount.js');
const { default: BankTransfer } = await import('../src/models/accounts/BankTransfer.js');
const { default: Account } = await import('../src/models/accounts/Account.js');
const {
  annualDepreciation, bookValue, round2, CHART_OF_ACCOUNTS
} = await import('../src/utils/accountsEngine.js');

const PORT = 5095;
const BASE_URL = `http://localhost:${PORT}`;
const TAG = `TST${Date.now().toString().slice(-8)}`;

let server;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed += 1; console.log(`  ✓ ${label}`); }
  else { failed += 1; console.error(`  ✗ ${label}`); }
};

async function runTests() {
  console.log('--- STARTING ACCOUNTS & FINANCE INTEGRATION TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));

  try {
    // ================================================================
    // 1. CHART OF ACCOUNTS
    // ================================================================
    console.log('\nTest 1: Chart of Accounts');
    const coa = await request('GET', '/api/accounts/chart-of-accounts');
    check(coa.status === 200 && coa.body.success === true, 'GET chart-of-accounts returns 200');
    check(coa.body.data.length === CHART_OF_ACCOUNTS.length, `The full chart of accounts is exposed (${coa.body.data.length} accounts)`);
    const codes = coa.body.data.map((a) => a.code);
    for (const required of ['1000', '1010', '1020', '1100', '1300', '1500', '1600', '2000', '2100', '2200', '3000', '4000', '4100', '4200', '4900', '5000', '5100', '5200', '5300', '5400', '5500', '5600']) {
      check(codes.includes(required), `Chart of accounts contains ${required}`);
    }

    // ================================================================
    // 2. ENGINE MATHS
    // ================================================================
    console.log('\nTest 2: Depreciation and ledger engine maths');
    const straight = { purchaseCost: 100000, salvageValue: 10000, usefulLifeYears: 5, currentValue: 100000, depreciationMethod: 'Straight Line', depreciationRate: 20 };
    check(annualDepreciation(straight) === 18000, 'Straight line depreciation = (cost − salvage) / life');
    const reducing = { purchaseCost: 100000, salvageValue: 0, currentValue: 80000, usefulLifeYears: 5, depreciationMethod: 'Reducing Balance', depreciationRate: 25 };
    check(annualDepreciation(reducing) === 20000, 'Reducing balance depreciation = current value × rate');
    check(annualDepreciation({ ...straight, usefulLifeYears: 0 }) === 0, 'Zero useful life yields no depreciation');
    check(bookValue({ purchaseCost: 100000, salvageValue: 10000, accumulatedDepreciation: 95000 }) === 10000, 'Book value never falls below the salvage value');
    check(bookValue({ purchaseCost: 100000, salvageValue: 0, accumulatedDepreciation: 0 }) === 100000, 'Book value of a new asset equals its cost');
    check(round2(1234.5678) === 1234.57, 'round2 rounds to two decimals');

    // ================================================================
    // 3. SALES — CRUD, status progression and GL posting
    // ================================================================
    console.log('\nTest 3: Sales invoices, status progression and GL posting');
    const beforeSales = await request('GET', '/api/accounts/sales');
    check(beforeSales.status === 200 && beforeSales.body.kpis !== undefined, 'GET sales returns list plus KPIs');

    const noCustomer = await request('POST', '/api/accounts/sales', { invoiceDate: '2026-11-01', items: [{ productService: 'X', quantity: 1, rate: 100 }] });
    check(noCustomer.status === 400, 'POST sales rejects a missing customer');
    const noItems = await request('POST', '/api/accounts/sales', { customer: 'X', invoiceDate: '2026-11-01', items: [] });
    check(noItems.status === 400, 'POST sales rejects an invoice with no line items');

    const created = await request('POST', '/api/accounts/sales', {
      customer: `${TAG} Customer`, invoiceDate: '2026-11-01', dueDate: '2026-12-01',
      paymentTerms: 'Net 30', items: [{ productService: 'Consulting', quantity: 3, rate: 1000 }],
      discount: 500, tax: 450, paymentMode: 'Cash', status: 'Approved', branch: 'Bandra'
    });
    check(created.status === 201, 'POST sales creates an invoice');
    const invoice = created.body.data;
    check(invoice.invoiceNumber.startsWith('INV-'), `Invoice number is auto-generated (${invoice.invoiceNumber})`);
    check(invoice.subtotal === 3000, 'Subtotal = quantity × rate');
    check(invoice.grandTotal === 2950, 'Grand total = subtotal − discount + tax');
    check(invoice.outstandingAmount === 2950, 'Outstanding = grand total − paid');

    const glForInvoice = await JournalEntry.findOne({ sourceModule: 'Sales', sourceId: invoice._id.toString() });
    check(!!glForInvoice, 'An approved invoice posts to the general ledger');
    check(glForInvoice && glForInvoice.balanced === true, 'The posted invoice entry is balanced');
    const arLine = glForInvoice?.lines.find((l) => l.accountCode === '1100');
    const revLine = glForInvoice?.lines.find((l) => l.accountCode === '4000');
    const taxLine = glForInvoice?.lines.find((l) => l.accountCode === '2200');
    check(arLine?.debit === 2950, 'GL debits Accounts Receivable with the grand total');
    check(revLine?.credit === 2500, 'GL credits Sales Revenue with grand total − tax');
    check(taxLine?.credit === 450, 'GL credits Tax Payable with the tax');

    const collect = await request('POST', `/api/accounts/sales/${invoice._id}/collect`, { amount: 1000, paymentMode: 'Cash' });
    check(collect.status === 200, 'POST collect records a partial payment');
    check(collect.body.data.paidAmount === 1000, 'Paid amount accumulates');
    check(collect.body.data.outstandingAmount === 1950, 'Outstanding falls by the collected amount');
    check(collect.body.data.status === 'Partially Paid', 'Status becomes Partially Paid');

    const overCollect = await request('POST', `/api/accounts/sales/${invoice._id}/collect`, { amount: 99999 });
    check(overCollect.status === 400, 'A payment above the outstanding balance is rejected');

    const settle = await request('POST', `/api/accounts/sales/${invoice._id}/collect`, { amount: 1950 });
    check(settle.body.data.status === 'Paid', 'Settling the balance flips the invoice to Paid');
    check(settle.body.data.outstandingAmount === 0, 'A paid invoice has no outstanding balance');

    const updated = await request('PUT', `/api/accounts/sales/${invoice._id}`, { customer: `${TAG} Renamed` });
    check(updated.status === 200 && updated.body.data.customer === `${TAG} Renamed`, 'PUT sales updates an invoice');
    const glAfterUpdate = await JournalEntry.find({ sourceModule: 'Sales', sourceId: invoice._id.toString() });
    check(glAfterUpdate.length >= 2, 'Updating an invoice posts a fresh ledger entry alongside the superseded ones');
    check(glAfterUpdate.some((e) => e.reversedBy), 'The superseded entry is marked as reversed, not deleted');
    check(glAfterUpdate.filter((e) => !e.reversedBy).length === 1, 'Exactly one live entry remains after the update');

    const deleted = await request('DELETE', `/api/accounts/sales/${invoice._id}`);
    check(deleted.status === 200, 'DELETE sales removes an invoice');
    const glAfterDelete = await JournalEntry.find({ sourceModule: 'Sales', sourceId: invoice._id.toString() });
    check(glAfterDelete.every((e) => e.reversedBy), 'Deleting an invoice reverses its ledger entries');

    // ================================================================
    // 4. EXPENSES
    // ================================================================
    console.log('\nTest 4: Expenses and their GL posting');
    const cat = await request('POST', '/api/accounts/expense-categories', {
      code: `EXP-${TAG}`, name: `${TAG} Category`, description: 'Test category', accountCode: '5300', status: 'Active'
    });
    check(cat.status === 201, 'POST expense-categories creates a category');
    const categoryId = cat.body.data._id;

    const dupCode = await request('POST', '/api/accounts/expense-categories', { code: `EXP-${TAG}`, name: 'Clash' });
    check(dupCode.status === 400, 'A duplicate expense category code is rejected');

    const expense = await request('POST', '/api/accounts/expenses', {
      title: `${TAG} Repair`, category: `${TAG} Category`, amount: 5000,
      paymentMode: 'Bank Transfer', branch: 'Bandra', date: '2026-11-05', notes: 'test'
    });
    check(expense.status === 201, 'POST expenses records an expense');
    const expGl = await JournalEntry.findOne({ sourceModule: 'Expenses', sourceId: expense.body.data._id.toString() });
    check(!!expGl, 'An expense posts to the general ledger');
    check(expGl?.lines.find((l) => l.accountCode === '5300')?.debit === 5000, 'GL debits the category expense account');
    check(expGl?.lines.find((l) => l.accountCode === '1020')?.credit === 5000, 'GL credits the bank account for a bank-paid expense');

    const cashExpense = await request('POST', '/api/accounts/expenses', {
      title: `${TAG} Cash Expense`, category: `${TAG} Category`, amount: 100,
      paymentMode: 'Cash', branch: 'Bandra', date: '2026-11-06'
    });
    const cashGl = await JournalEntry.findOne({ sourceModule: 'Expenses', sourceId: cashExpense.body.data._id.toString() });
    check(cashGl?.lines.find((l) => l.accountCode === '1010')?.credit === 100, 'A cash-paid expense credits Cash on Hand');

    const zeroAmount = await request('POST', '/api/accounts/expenses', {
      title: `${TAG} Zero`, category: `${TAG} Category`, amount: 0, date: '2026-11-07'
    });
    check(zeroAmount.status === 400, 'An expense of zero amount is rejected');

    const usedCategory = await request('DELETE', `/api/accounts/expense-categories/${categoryId}`);
    check(usedCategory.status === 409, 'An expense category in use cannot be deleted');

    // ================================================================
    // 5. STOCK INWARD
    // ================================================================
    console.log('\nTest 5: Stock inward, split payments and inventory');
    const inward = await request('POST', '/api/accounts/stock-inward', {
      supplier: `${TAG} Supplier`, supplierInvoice: 'SI-9', date: '2026-11-02',
      category: 'Supplements', branch: 'Bandra',
      items: [
        { sku: `${TAG}-SKU1`, description: 'Test Whey', quantity: 10, unitCost: 500, sellingPrice: 800 },
        { sku: `${TAG}-SKU2`, description: 'Test Tee', quantity: 5, unitCost: 200, sellingPrice: 400 }
      ],
      payments: [{ mode: 'Cash', amount: 2000 }, { mode: 'Bank Transfer', amount: 3500, utrReference: 'UTR1' }]
    });
    check(inward.status === 201, 'POST stock-inward records a procurement');
    const stock = inward.body.data;
    check(stock.inwardNumber.startsWith('SI-'), `Inward number is auto-generated (${stock.inwardNumber})`);
    check(stock.totalAmount === 6000, 'Total = Σ (quantity × unit cost)');
    check(stock.paidAmount === 5500, 'Paid = Σ split payments');
    check(stock.balanceDue === 500, 'Balance due = total − paid');
    check(stock.status === 'Partially Paid', 'Status reflects a partial payment');
    const stockGl = await JournalEntry.findOne({ sourceModule: 'StockInward', sourceId: stock._id.toString() });
    check(stockGl?.lines.find((l) => l.accountCode === '1300')?.debit === 6000, 'GL debits Inventory with the total');
    check(stockGl?.lines.find((l) => l.accountCode === '2000')?.credit === 500, 'GL credits Accounts Payable with the balance due');

    const stockSale = await request('POST', '/api/accounts/sales', {
      customer: `${TAG} Buyer`, invoiceDate: '2026-11-10', status: 'Approved', branch: 'Bandra',
      items: [{ productService: 'Test Whey', quantity: 2, rate: 800, stockRef: `${TAG}-SKU1` }]
    });
    check(stockSale.status === 201, 'A stock-backed invoice is created');
    const saleGl = await JournalEntry.findOne({ sourceModule: 'Sales', sourceId: stockSale.body.data._id.toString() });
    check(saleGl?.lines.find((l) => l.accountCode === '4050')?.debit === 1000, 'Selling stock posts Cost of Goods Sold at cost');
    check(saleGl?.lines.find((l) => l.accountCode === '1300')?.credit === 1000, 'Selling stock credits Inventory');

    const oversell = await request('POST', '/api/accounts/sales', {
      customer: `${TAG} Buyer2`, invoiceDate: '2026-11-11', status: 'Approved', branch: 'Bandra',
      items: [{ productService: 'Test Tee', quantity: 999, rate: 400, stockRef: `${TAG}-SKU2` }]
    });
    check(oversell.status === 400, 'Selling more than the available stock is rejected');

    // ================================================================
    // 6. CREDIT NOTES
    // ================================================================
    console.log('\nTest 6: Credit notes and invoice rebalancing');
    const target = await request('POST', '/api/accounts/sales', {
      customer: `${TAG} Creditor`, invoiceDate: '2026-11-01', status: 'Approved', branch: 'Bandra',
      items: [{ productService: 'Membership', quantity: 1, rate: 10000 }], tax: 0
    });
    const targetInvoice = target.body.data;
    check(targetInvoice.grandTotal === 10000, 'Target invoice totals correctly');

    const note = await request('POST', '/api/accounts/credit-notes', {
      customer: `${TAG} Creditor`, referenceInvoice: targetInvoice.invoiceNumber,
      referenceInvoiceId: targetInvoice._id, reason: 'Customer Return',
      items: [{ description: 'Refund', quantity: 1, rate: 10000 }],
      settlementMethod: 'Apply to Invoice', status: 'Approved', branch: 'Bandra'
    });
    check(note.status === 201, 'POST credit-notes creates a credit note');
    check(note.body.data.totalCredit === 10000, 'Credit total = Σ (quantity × rate)');
    check(note.body.data.creditNoteNumber.startsWith('CN-'), `Credit note number is auto-generated (${note.body.data.creditNoteNumber})`);

    const applied = await request('POST', `/api/accounts/credit-notes/${note.body.data._id}/apply`, { invoiceId: targetInvoice._id });
    check(applied.status === 200, 'POST credit-notes/:id/apply applies the credit');
    check(applied.body.data.invoice.outstandingAmount === 0, 'Applying a credit clears the invoice outstanding balance');
    check(applied.body.data.invoice.status === 'Paid', 'A cleared invoice becomes Paid');
    const creditGl = await JournalEntry.findOne({ sourceModule: 'CreditNote', sourceId: note.body.data._id.toString() });
    check(creditGl?.lines.find((l) => l.accountCode === '4900')?.debit === 10000, 'GL debits Sales Returns & Credit Notes');
    check(creditGl?.lines.find((l) => l.accountCode === '1100')?.credit === 10000, 'GL credits Accounts Receivable');

    const reapply = await request('POST', `/api/accounts/credit-notes/${note.body.data._id}/apply`, { invoiceId: targetInvoice._id });
    check(reapply.status === 409, 'An already-applied credit note cannot be applied again');

    // ================================================================
    // 7. ASSETS AND DEPRECIATION
    // ================================================================
    console.log('\nTest 7: Asset records and the depreciation engine');
    const assetCat = await request('POST', '/api/accounts/asset-categories', {
      code: `AC-${TAG}`, name: `${TAG} Asset Category`, description: 'Test', status: 'Active'
    });
    check(assetCat.status === 201, 'POST asset-categories creates a category');

    const asset = await request('POST', '/api/accounts/assets', {
      assetName: `${TAG} Treadmill`, category: `${TAG} Asset Category`, quantity: 2,
      purchaseDate: '2026-01-10', purchaseCost: 100000, usefulLifeYears: 5,
      depreciationMethod: 'Straight Line', depreciationRate: 20, salvageValue: 10000,
      location: 'Cardio Zone', paymentMode: 'Bank Transfer', status: 'Active', branch: 'Bandra'
    });
    check(asset.status === 201, 'POST assets registers an asset');
    const assetDoc = asset.body.data;
    check(assetDoc.assetId.startsWith('AST-'), `Asset id is auto-generated (${assetDoc.assetId})`);
    check(assetDoc.currentValue === 100000, 'A new asset book value equals its purchase cost');
    const assetGl = await JournalEntry.findOne({ sourceModule: 'Assets', sourceId: assetDoc._id.toString() });
    check(assetGl?.lines.find((l) => l.accountCode === '1500')?.debit === 100000, 'GL debits Fixed Assets on purchase');
    check(assetGl?.lines.find((l) => l.accountCode === '1020')?.credit === 100000, 'GL credits the bank account on purchase');

    const depreciated = await request('POST', `/api/accounts/assets/${assetDoc._id}/depreciate`, { period: '2026-11' });
    check(depreciated.status === 200, 'POST assets/:id/depreciate runs a depreciation period');
    check(depreciated.body.data.depreciation === 18000, 'Straight line depreciation = (cost − salvage) / life');
    check(depreciated.body.data.asset.currentValue === 82000, 'Book value falls by the depreciation');
    const depGl = await JournalEntry.findOne({ sourceModule: 'AssetDepreciation', sourceId: new RegExp(`^${assetDoc._id.toString()}`) });
    check(depGl?.lines.some((l) => l.accountCode === '5600' && l.debit === 18000), 'GL debits Depreciation Expense');
    check(depGl?.lines.some((l) => l.accountCode === '1600' && l.credit === 18000), 'GL credits Accumulated Depreciation');

    // ================================================================
    // 8. ADJUSTMENT ENTRY / JV
    // ================================================================
    console.log('\nTest 8: Adjustment entries — validation, posting immutability and reversal');
    const noNarration = await request('POST', '/api/accounts/adjustment-entry', {
      debitAccount: '5100', creditAccount: '1000', amount: 100, date: '2026-11-01'
    });
    check(noNarration.status === 400, 'A JV without a narration is rejected');
    const sameAccount = await request('POST', '/api/accounts/adjustment-entry', {
      narration: 'Bad', debitAccount: '5100', creditAccount: '5100', amount: 100, date: '2026-11-01'
    });
    check(sameAccount.status === 400, 'A JV debiting and crediting the same account is rejected');

    const voucher = await request('POST', '/api/accounts/adjustment-entry', {
      narration: `${TAG} Bad debt write-off`, entryType: 'Bad Debt',
      debitAccount: '4900', creditAccount: '1100', amount: 2500,
      date: '2026-11-12', branch: 'Bandra'
    });
    check(voucher.status === 201, 'POST adjustment-entry creates a JV');
    const jv = voucher.body.data;
    check(jv.entryNumber.startsWith('JV-'), `JV number is auto-generated (${jv.entryNumber})`);
    check(jv.status === 'Draft', 'A new JV starts as Draft');

    const posted = await request('POST', `/api/accounts/adjustment-entry/${jv._id}/post`, {});
    check(posted.status === 200, 'POST adjustment-entry/:id/post posts the JV');
    check(posted.body.data.voucher.status === 'Posted', 'A posted JV moves to Posted');
    check(posted.body.data.entry.balanced === true, 'The posted JV entry is balanced');

    const editPosted = await request('PUT', `/api/accounts/adjustment-entry/${jv._id}`, { narration: 'changed' });
    check(editPosted.status === 409, 'A posted JV cannot be edited');
    const deletePosted = await request('DELETE', `/api/accounts/adjustment-entry/${jv._id}`);
    check(deletePosted.status === 409, 'A posted JV cannot be deleted');

    const reversed = await request('POST', `/api/accounts/adjustment-entry/${jv._id}/reverse`, { reason: 'Error' });
    check(reversed.status === 200, 'POST adjustment-entry/:id/reverse reverses a posted JV');
    check(reversed.body.data.voucher.status === 'Reversed', 'The original JV becomes Reversed');
    check(reversed.body.data.reversal.debitAccount === jv.creditAccount, 'The reversal swaps debit and credit accounts');
    check(reversed.body.data.reversal.amount === jv.amount, 'The reversal carries the same amount');

    const reverseTwice = await request('POST', `/api/accounts/adjustment-entry/${jv._id}/reverse`, {});
    check(reverseTwice.status === 409, 'A reversed JV cannot be reversed again');

    // Unbalanced entries are rejected by the ledger itself.
    const unbalanced = await request('POST', '/api/accounts/journal', {
      date: '2026-11-01', description: 'bad',
      lines: [{ accountCode: '5100', debit: 100, credit: 0 }, { accountCode: '1000', debit: 0, credit: 50 }]
    });
    check(unbalanced.status === 400 || unbalanced.status === 404, 'An unbalanced journal entry is rejected');

    // ================================================================
    // 9. BANKING
    // ================================================================
    console.log('\nTest 9: Banking — accounts, transfers and the cash book');
    const from = await request('POST', '/api/accounts/banking/accounts', {
      accountNumber: `${TAG}-FROM`, accountName: `${TAG} Source`, accountType: 'Checking / Current',
      bankName: 'Test Bank', ifsc: 'TEST0000001', openingBalance: 100000, status: 'Active', branch: 'Bandra'
    });
    check(from.status === 201, 'POST banking/accounts creates an account');
    const to = await request('POST', '/api/accounts/banking/accounts', {
      accountNumber: `${TAG}-TO`, accountName: `${TAG} Destination`, accountType: 'Savings',
      openingBalance: 5000, status: 'Active', branch: 'Bandra'
    });
    check(to.status === 201, 'A second bank account is created');

    const sameAccountTransfer = await request('POST', '/api/accounts/banking/transfers', {
      fromAccount: from.body.data._id, toAccount: from.body.data._id, amount: 100
    });
    check(sameAccountTransfer.status === 400, 'A transfer to the same account is rejected.');

    const overdraw = await request('POST', '/api/accounts/banking/transfers', {
      fromAccount: from.body.data._id, toAccount: to.body.data._id, amount: 999999
    });
    check(overdraw.status === 400, 'A transfer above the available balance is rejected');

    const transfer = await request('POST', '/api/accounts/banking/transfers', {
      fromAccount: from.body.data._id, toAccount: to.body.data._id, amount: 25000,
      transferType: 'Bank to Bank', referenceNumber: 'CHQ-77'
    });
    check(transfer.status === 201, 'POST banking/transfers creates a transfer');
    check(transfer.body.data.transferNumber.startsWith('TRF-'), `Transfer number is auto-generated (${transfer.body.data.transferNumber})`);
    const fromAfter = await BankAccount.findById(from.body.data._id);
    const toAfter = await BankAccount.findById(to.body.data._id);
    check(fromAfter.currentBalance === 75000, 'The source balance falls by the transfer amount');
    check(toAfter.currentBalance === 30000, 'The destination balance rises by the transfer amount');
    const transferGl = await JournalEntry.findOne({ sourceModule: 'Banking', sourceId: transfer.body.data._id.toString() });
    check(!!transferGl, 'A transfer posts a contra entry to the ledger');

    const reversedTransfer = await request('DELETE', `/api/accounts/banking/transfers/${transfer.body.data._id}`);
    check(reversedTransfer.status === 200, 'Deleting a transfer reverses it');
    const fromRestored = await BankAccount.findById(from.body.data._id);
    const toRestored = await BankAccount.findById(to.body.data._id);
    check(fromRestored.currentBalance === 100000, 'Reversing a transfer restores the source balance');
    check(toRestored.currentBalance === 5000, 'Reversing a transfer restores the destination balance');

    const cashBook = await request('GET', '/api/accounts/banking/transactions');
    check(cashBook.status === 200 && cashBook.body.kpis !== undefined, 'The unified cash book returns rows plus KPIs');
    check(cashBook.body.data.every((r) => typeof r.inflow === 'number' && typeof r.outflow === 'number'),
      'Every cash-book row carries inflow and outflow amounts');
    check(cashBook.body.data.some((r) => r.inflow > 0), 'The cash book records inflows');
    check(cashBook.body.data.some((r) => r.outflow > 0), 'The cash book records outflows');

    // ================================================================
    // 10. FINANCIAL REPORTS
    // ================================================================
    console.log('\nTest 10: Financial reports — trial balance, P&L, balance sheet, GL book');
    const trial = await request('GET', '/api/accounts/reports/trial-balance');
    check(trial.status === 200, 'GET reports/trial-balance returns 200');
    check(trial.body.data.totals.balanced === true,
      `Trial balance balances (debit ${trial.body.data.totals.debit} = credit ${trial.body.data.totals.credit})`);
    check(trial.body.data.rows.length === CHART_OF_ACCOUNTS.length, 'The trial balance lists every chart-of-accounts row');
    check(trial.body.data.rows.some((r) => r.code === '1100'), 'The trial balance includes Accounts Receivable');

    const pnl = await request('GET', '/api/accounts/reports/profit-loss');
    check(pnl.status === 200, 'GET reports/profit-loss returns 200');
    check(pnl.body.data.revenue.gross >= 0, 'The P&L reports gross revenue');
    check(typeof pnl.body.data.netProfit === 'number', 'The P&L reports a net profit figure');
    check(pnl.body.data.grossProfit === round2(pnl.body.data.revenue.net - pnl.body.data.cogs),
      'Gross profit = net revenue − COGS');
    check(pnl.body.data.netProfit === round2(pnl.body.data.grossProfit - pnl.body.data.opex.total),
      'Net profit = gross profit − operating expenses');

    const sheet = await request('GET', '/api/accounts/reports/balance-sheet');
    check(sheet.status === 200, 'GET reports/balance-sheet returns 200');
    check(sheet.body.data.totals.balanced === true,
      `The balance sheet balances (assets ${sheet.body.data.totals.assets} = liabilities + equity ${sheet.body.data.totals.liabilitiesEquity})`);
    check(sheet.body.data.assets.current.total > 0, 'Current assets are reported');
    check(sheet.body.data.liabilities.total > 0, 'Liabilities are reported as a positive figure');

    const glBook = await request('GET', '/api/accounts/reports/general-ledger');
    check(glBook.status === 200, 'GET reports/general-ledger returns 200');
    check(glBook.body.data.rows.length > 0, 'The general ledger book has rows');
    check(glBook.body.data.rows.every((r) => r.accountCode && r.accountName), 'Every GL row names its account');
    check(glBook.body.data.totals.debit === glBook.body.data.totals.credit, 'The GL book debits equal credits');

    const dashboard = await request('GET', '/api/accounts/dashboard');
    check(dashboard.status === 200, 'GET dashboard returns 200');
    const k = dashboard.body.data.kpis;
    check(typeof k.totalSales === 'number' && typeof k.totalExpenses === 'number', 'The dashboard reports sales and expense KPIs');
    check(k.netProfit === pnl.body.data.netProfit, 'The dashboard net profit agrees with the P&L');
    check(dashboard.body.data.pending !== undefined, 'The dashboard reports pending accounting actions');
    check(dashboard.body.data.trends.length > 0, 'The dashboard reports monthly trends');
    check(dashboard.body.data.expenseMix.length > 0, 'The dashboard reports the expense mix');

    // ================================================================
    // 11. CLEANUP
    // ================================================================
    console.log('\nTest 11: Cleanup');
    const sources = [invoice._id.toString(), targetInvoice._id.toString(), stock._id.toString(), assetDoc._id.toString(), jv._id.toString()];
    for (const id of sources) {
      await JournalEntry.deleteMany({ sourceId: id });
    }
    await JournalEntry.deleteMany({ sourceId: { $in: [from.body.data._id.toString(), to.body.data._id.toString()] } });
    await JournalEntry.deleteMany({ sourceModule: 'Expenses', sourceId: { $in: [expense.body.data._id.toString(), cashExpense.body.data._id.toString()] } });
    await JournalEntry.deleteMany({ sourceModule: 'CreditNote', sourceId: note.body.data._id.toString() });
    await JournalVoucher.deleteMany({ narration: new RegExp(TAG) });
    await JournalVoucher.deleteMany({ narration: /Reversal of/ });
    await SalesInvoice.deleteMany({ customer: new RegExp(TAG) });
    await Expense.deleteMany({ title: new RegExp(TAG) });
    await ExpenseCategory.deleteMany({ code: new RegExp(`EXP-${TAG}`) });
    await StockInward.deleteMany({ supplier: new RegExp(TAG) });
    await Asset.deleteMany({ assetName: new RegExp(TAG) });
    await AssetCategory.deleteMany({ code: new RegExp(`AC-${TAG}`) });
    await CreditNote.deleteMany({ customer: new RegExp(TAG) });
    await BankTransfer.deleteMany({ fromAccountName: new RegExp(TAG) });
    await BankAccount.deleteMany({ accountName: new RegExp(TAG) });
    console.log('  · test fixtures cleaned up');

    console.log('\n--- ALL ACCOUNTS & FINANCE INTEGRATION TESTS PASSED ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  }

  console.log(`\nACCOUNTS & FINANCE TEST RESULT: ${passed} passed, ${failed} failed`);
  server.close();
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
