import BankAccount from '../../models/accounts/BankAccount.js';
import BankTransfer from '../../models/accounts/BankTransfer.js';
import JournalEntry from '../../models/accounts/JournalEntry.js';
import {
  postJournal, removeJournalForSource, nextEntryNumber, round2
} from '../../utils/accountsEngine.js';

const CASH_ACCOUNTS = ['1010', '1020'];

// ---------------------------------------------------------------------------
// Tab 1 — unified cash book
// ---------------------------------------------------------------------------
export const getBankingTransactions = async (req, res, next) => {
  try {
    const { branch, from, to, q } = req.query;
    const query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const entries = await JournalEntry.find(query).sort({ date: 1, entryNumber: 1 });
    const scoped = entries.filter((e) =>
      !branch || branch === 'All Branches' || e.branch === branch
    );

    let running = 0;
    const rows = [];
    for (const entry of scoped) {
      const cashLines = (entry.lines || []).filter((l) => CASH_ACCOUNTS.includes(l.accountCode));
      if (!cashLines.length) continue;

      const cashDebit = round2(cashLines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
      const cashCredit = round2(cashLines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
      const inflow = round2(Math.max(0, cashCredit - cashDebit));
      const outflow = round2(Math.max(0, cashDebit - cashCredit));
      running = round2(running + inflow - outflow);

      rows.push({
        date: entry.date,
        reference: entry.reference || entry.entryNumber,
        entryNumber: entry.entryNumber,
        category: entry.sourceModule,
        description: entry.description,
        paymentMode: cashLines[0]?.accountCode === '1010' ? 'Cash' : 'Bank',
        inflow,
        outflow,
        balance: running,
        branch: entry.branch
      });
    }

    const filtered = q && q.trim()
      ? rows.filter((r) => `${r.reference} ${r.description} ${r.category}`.toLowerCase().includes(q.trim().toLowerCase()))
      : rows;

    const totalInflows = round2(filtered.reduce((s, r) => s + r.inflow, 0));
    const totalOutflows = round2(filtered.reduce((s, r) => s + r.outflow, 0));

    const accounts = await BankAccount.find();
    const cashBalance = round2(accounts
      .filter((a) => a.accountType === 'Petty Cash')
      .reduce((s, a) => s + (Number(a.currentBalance) || 0), 0));
    const bankBalance = round2(accounts
      .filter((a) => a.accountType !== 'Petty Cash')
      .reduce((s, a) => s + (Number(a.currentBalance) || 0), 0));

    return res.status(200).json({
      success: true,
      message: 'Banking transactions retrieved successfully',
      data: filtered,
      kpis: {
        totalInflows,
        totalOutflows,
        netCashFlow: round2(totalInflows - totalOutflows),
        cashBalance,
        bankBalance,
        transactionCount: filtered.length
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// Tab 3 — bank accounts & petty cash master
// ---------------------------------------------------------------------------
export const getAllBankAccounts = async (req, res, next) => {
  try {
    const accounts = await BankAccount.find().sort({ createdAt: 1 });
    return res.status(200).json({
      success: true,
      message: 'Bank accounts retrieved successfully',
      data: accounts,
      kpis: {
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter((a) => a.status === 'Active').length,
        totalBalance: round2(accounts.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createBankAccount = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.accountName || !String(body.accountName).trim()) {
      return res.status(400).json({ success: false, message: 'Account name is required' });
    }
    if (!body.accountNumber || !String(body.accountNumber).trim()) {
      return res.status(400).json({ success: false, message: 'Account number is required' });
    }
    const account = await BankAccount.create(body);
    return res.status(201).json({
      success: true,
      message: `Bank account "${account.accountName}" created successfully`,
      data: account
    });
  } catch (error) {
    return next(error);
  }
};

export const updateBankAccount = async (req, res, next) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    const allowed = [
      'accountNumber', 'accountName', 'accountType', 'bankName', 'ifsc',
      'openingBalance', 'status', 'branch'
    ];
    for (const field of allowed) {
      if (req.body?.[field] !== undefined) account[field] = req.body[field];
    }
    // A balance can only be edited directly while the account has no movement.
    if (req.body?.currentBalance !== undefined) {
      const moved = account.currentBalance !== account.openingBalance;
      if (moved) {
        return res.status(409).json({
          success: false,
          message: 'This account has recorded transfers — adjust the balance through a transfer instead'
        });
      }
      account.currentBalance = Number(req.body.currentBalance) || 0;
    }
    await account.save();
    return res.status(200).json({
      success: true,
      message: `Bank account "${account.accountName}" updated successfully`,
      data: account
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteBankAccount = async (req, res, next) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    const transfers = await BankTransfer.countDocuments({
      $or: [{ fromAccount: account._id }, { toAccount: account._id }],
      status: 'Completed'
    });
    if (transfers > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${account.accountName}" — ${transfers} completed transfer(s) reference this account`
      });
    }
    await BankAccount.findByIdAndDelete(account._id);
    return res.status(200).json({
      success: true,
      message: `Bank account "${account.accountName}" deleted successfully`,
      data: { id: account._id }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// Tab 2 — inter-account transfers
// ---------------------------------------------------------------------------
export const getAllBankTransfers = async (req, res, next) => {
  try {
    const { branch, q } = req.query;
    const query = {};
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ transferNumber: rx }, { referenceNumber: rx }];
    }
    const transfers = await BankTransfer.find(query).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: 'Bank transfers retrieved successfully',
      data: transfers,
      kpis: {
        total: transfers.length,
        completed: transfers.filter((t) => t.status === 'Completed').length,
        totalMoved: round2(transfers.filter((t) => t.status === 'Completed').reduce((s, t) => s + (Number(t.amount) || 0), 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const createBankTransfer = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.fromAccount || !body.toAccount) {
      return res.status(400).json({ success: false, message: 'Both a source and a destination account are required' });
    }
    if (String(body.fromAccount) === String(body.toAccount)) {
      return res.status(400).json({ success: false, message: 'The source and destination accounts must be different' });
    }
    if (!(Number(body.amount) > 0)) {
      return res.status(400).json({ success: false, message: 'Transfer amount must be greater than zero' });
    }

    const [from, to] = await Promise.all([
      BankAccount.findById(body.fromAccount),
      BankAccount.findById(body.toAccount)
    ]);
    if (!from) return res.status(404).json({ success: false, message: 'Source account not found' });
    if (!to) return res.status(404).json({ success: false, message: 'Destination account not found' });
    if (from.currentBalance < body.amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds — "${from.accountName}" holds ${from.currentBalance}`
      });
    }

    const transferNumber = await nextEntryNumber(BankTransfer, 'TRF', 'transferNumber');
    const transfer = await BankTransfer.create({
      ...body,
      transferNumber,
      fromAccountName: from.accountName,
      toAccountName: to.accountName,
      status: 'Completed'
    });

    from.currentBalance = round2(from.currentBalance - body.amount);
    await from.save();
    to.currentBalance = round2(to.currentBalance + body.amount);
    await to.save();

    const fromCode = from.accountType === 'Petty Cash' ? '1010' : '1020';
    const toCode = to.accountType === 'Petty Cash' ? '1010' : '1020';

    await postJournal({
      date: new Date().toISOString().slice(0, 10),
      description: `Transfer ${transfer.transferNumber} — ${from.accountName} to ${to.accountName}`,
      sourceModule: 'Banking',
      sourceId: transfer._id.toString(),
      reference: transfer.transferNumber,
      branch: transfer.branch,
      lines: [
        { accountCode: toCode, debit: transfer.amount, credit: 0 },
        { accountCode: fromCode, debit: 0, credit: transfer.amount }
      ]
    });

    return res.status(201).json({
      success: true,
      message: `Transfer ${transfer.transferNumber} completed successfully`,
      data: transfer
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteBankTransfer = async (req, res, next) => {
  try {
    const transfer = await BankTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Bank transfer not found' });
    }
    if (transfer.status === 'Reversed') {
      return res.status(409).json({ success: false, message: 'This transfer is already reversed' });
    }

    const [from, to] = await Promise.all([
      BankAccount.findById(transfer.fromAccount),
      BankAccount.findById(transfer.toAccount)
    ]);
    if (from) {
      from.currentBalance = round2(from.currentBalance + transfer.amount);
      await from.save();
    }
    if (to) {
      to.currentBalance = round2(to.currentBalance - transfer.amount);
      await to.save();
    }

    await removeJournalForSource('Banking', transfer._id.toString());
    transfer.status = 'Reversed';
    await transfer.save();

    return res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transferNumber} reversed successfully`,
      data: transfer
    });
  } catch (error) {
    return next(error);
  }
};
