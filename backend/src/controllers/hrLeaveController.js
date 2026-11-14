import LeaveRequest from '../models/LeaveRequest.js';
import LeaveType from '../models/LeaveType.js';
import Staff from '../models/Staff.js';
import StaffAttendance from '../models/StaffAttendance.js';
import {
  inclusiveDays,
  computeLeaveImpact,
  computeAvailableBalance,
  datesInPeriod
} from '../utils/hrEngine.js';
import { safeContains } from '../utils/hrCrud.js';

/** Every date in an inclusive [fromDate, toDate] range. */
const eachDate = (fromDate, toDate) => {
  const out = [];
  const total = inclusiveDays(fromDate, toDate);
  const start = new Date(`${fromDate}T00:00:00.000Z`);
  for (let i = 0; i < total; i += 1) {
    out.push(new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
  }
  return out;
};

/** Total paid days already consumed by an employee for a leave type. */
const usedPaidDays = async (staffRef, leaveTypeId, excludeId = null) => {
  const query = {
    staffRef,
    leaveType: leaveTypeId,
    status: { $in: ['Pending', 'Approved'] }
  };
  if (excludeId) query._id = { $ne: excludeId };
  const rows = await LeaveRequest.find(query);
  return rows.reduce((sum, r) => sum + (Number(r.paidDays) || 0), 0);
};

// ---------------------------------------------------------------------------
// GET /api/hr/leave
// ---------------------------------------------------------------------------
export const getAllLeaveRequests = async (req, res, next) => {
  try {
    const { status, staffRef, q } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (staffRef) query.staffRef = staffRef;
    if (q && q.trim()) {
      const rx = safeContains(q.trim());
      query.$or = [{ staffName: rx }, { staffId: rx }, { leaveTypeName: rx }];
    }

    const requests = await LeaveRequest.find(query).sort({ createdAt: -1 });
    const count = (s) => requests.filter((r) => r.status === s).length;

    return res.status(200).json({
      success: true,
      message: 'Leave requests retrieved successfully',
      data: requests,
      kpis: {
        pending: count('Pending'),
        approved: count('Approved'),
        rejected: count('Rejected')
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/hr/leave/balance/:staffRef
// ---------------------------------------------------------------------------
export const getLeaveBalance = async (req, res, next) => {
  try {
    const { staffRef } = req.params;
    const types = await LeaveType.find({ status: 'Active' }).sort({ name: 1 });

    const balances = [];
    for (const type of types) {
      const used = await usedPaidDays(staffRef, type._id);
      const entitlement = Number(type.annualQuota || 0) > 0
        ? Number(type.annualQuota)
        : Number(type.monthlyQuota || 0) * 12;
      balances.push({
        leaveType: type._id,
        name: type.name,
        code: type.code,
        paid: type.paid,
        monthlyQuota: type.monthlyQuota,
        annualQuota: type.annualQuota,
        entitled: entitlement,
        used,
        available: computeAvailableBalance({ leaveType: type, usedDays: used })
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Leave balances retrieved successfully',
      data: balances
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/leave
// ---------------------------------------------------------------------------
export const createLeaveRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.staffRef) {
      return res.status(400).json({ success: false, message: 'Staff member is required' });
    }
    if (!body.leaveType) {
      return res.status(400).json({ success: false, message: 'Leave type is required' });
    }
    if (!body.fromDate || !body.toDate) {
      return res.status(400).json({ success: false, message: 'From date and to date are required' });
    }

    const staff = await Staff.findById(body.staffRef);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    const leaveType = await LeaveType.findById(body.leaveType);
    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    const days = inclusiveDays(body.fromDate, body.toDate);
    if (days <= 0) {
      return res.status(400).json({ success: false, message: 'To date must not be before the from date' });
    }

    // Overlap prevention against Pending / Approved requests for the same person.
    const clash = await LeaveRequest.findOne({
      staffRef: staff._id,
      status: { $in: ['Pending', 'Approved'] },
      fromDate: { $lte: body.toDate },
      toDate: { $gte: body.fromDate }
    });
    if (clash) {
      return res.status(409).json({
        success: false,
        message: `This overlaps an existing ${clash.status.toLowerCase()} leave request (${clash.fromDate} to ${clash.toDate})`
      });
    }

    const used = await usedPaidDays(staff._id, leaveType._id);
    const available = computeAvailableBalance({ leaveType, usedDays: used });
    const { paidDays, lopDays } = computeLeaveImpact({
      days,
      paid: leaveType.paid,
      availableBalance: available
    });

    const request = await LeaveRequest.create({
      staffRef: staff._id,
      staffId: staff.staffCode,
      staffName: staff.name,
      branch: staff.branch,
      leaveType: leaveType._id,
      leaveTypeName: leaveType.name,
      leaveTypeCode: leaveType.code,
      paid: leaveType.paid,
      fromDate: body.fromDate,
      toDate: body.toDate,
      days,
      paidDays,
      lopDays,
      reason: body.reason || '',
      status: 'Pending',
      appliedAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: `Leave request submitted for ${staff.name}`,
      data: request
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/hr/leave/:id
// ---------------------------------------------------------------------------
export const updateLeaveRequest = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (request.status !== 'Pending') {
      return res.status(409).json({
        success: false,
        message: `Only pending leave requests can be edited (this one is ${request.status.toLowerCase()})`
      });
    }

    const body = req.body || {};
    const fromDate = body.fromDate || request.fromDate;
    const toDate = body.toDate || request.toDate;

    const days = inclusiveDays(fromDate, toDate);
    if (days <= 0) {
      return res.status(400).json({ success: false, message: 'To date must not be before the from date' });
    }

    const clash = await LeaveRequest.findOne({
      staffRef: request.staffRef,
      _id: { $ne: request._id },
      status: { $in: ['Pending', 'Approved'] },
      fromDate: { $lte: toDate },
      toDate: { $gte: fromDate }
    });
    if (clash) {
      return res.status(409).json({
        success: false,
        message: `This overlaps an existing ${clash.status.toLowerCase()} leave request`
      });
    }

    const leaveType = await LeaveType.findById(request.leaveType);
    const used = await usedPaidDays(request.staffRef, request.leaveType, request._id);
    const available = computeAvailableBalance({ leaveType, usedDays: used });
    const { paidDays, lopDays } = computeLeaveImpact({
      days,
      paid: leaveType?.paid ?? request.paid,
      availableBalance: available
    });

    request.fromDate = fromDate;
    request.toDate = toDate;
    request.days = days;
    request.paidDays = paidDays;
    request.lopDays = lopDays;
    if (body.reason !== undefined) request.reason = body.reason;

    await request.save();
    return res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: request
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/leave/:id/approve
// ---------------------------------------------------------------------------
export const approveLeaveRequest = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (request.status !== 'Pending') {
      return res.status(409).json({
        success: false,
        message: `Only pending leave requests can be approved (this one is ${request.status.toLowerCase()})`
      });
    }

    request.status = 'Approved';
    request.decidedAt = new Date().toISOString();
    request.decidedBy = req.body?.operator || 'HR Admin';
    await request.save();

    // Attendance synchronisation — inject one "On Leave" row per date in the span.
    const staff = await Staff.findById(request.staffRef);
    const dates = eachDate(request.fromDate, request.toDate);
    const rows = dates.map((date) => ({
      staffRef: request.staffRef,
      staffId: request.staffId,
      staffName: request.staffName,
      role: staff?.role || '',
      branch: request.branch,
      date,
      checkIn: '—',
      checkOut: '—',
      workingHours: '',
      status: 'On Leave',
      lateMinutes: 0,
      lateFine: 0,
      remarks: `Approved ${request.leaveTypeName} (${request.fromDate} to ${request.toDate})`,
      isSynthetic: true
    }));
    await StaffAttendance.insertMany(rows, { ordered: false });

    return res.status(200).json({
      success: true,
      message: `Leave request approved and ${rows.length} attendance day(s) marked as On Leave`,
      data: request
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/leave/:id/reject
// ---------------------------------------------------------------------------
export const rejectLeaveRequest = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (request.status !== 'Pending') {
      return res.status(409).json({
        success: false,
        message: `Only pending leave requests can be rejected (this one is ${request.status.toLowerCase()})`
      });
    }

    request.status = 'Rejected';
    request.decidedAt = new Date().toISOString();
    request.decidedBy = req.body?.operator || 'HR Admin';
    request.decisionReason = req.body?.reason || '';
    await request.save();

    // Remove any synthetic "On Leave" attendance rows that belong to this request.
    const removed = await StaffAttendance.deleteMany({
      staffRef: request.staffRef,
      isSynthetic: true,
      date: { $gte: request.fromDate, $lte: request.toDate }
    });

    return res.status(200).json({
      success: true,
      message: `Leave request rejected and ${removed.deletedCount || 0} attendance day(s) released`,
      data: request
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/hr/leave/:id
// ---------------------------------------------------------------------------
export const deleteLeaveRequest = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const removed = await StaffAttendance.deleteMany({
      staffRef: request.staffRef,
      isSynthetic: true,
      date: { $gte: request.fromDate, $lte: request.toDate }
    });
    await LeaveRequest.findByIdAndDelete(request._id);

    return res.status(200).json({
      success: true,
      message: `Leave request deleted and ${removed.deletedCount || 0} attendance day(s) released`,
      data: { id: request._id }
    });
  } catch (error) {
    return next(error);
  }
};
