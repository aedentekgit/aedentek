import StaffAttendance from '../models/StaffAttendance.js';
import Staff from '../models/Staff.js';
import Shift from '../models/Shift.js';
import { resolvePunch, workingHoursBetween, toDateKey } from '../utils/hrEngine.js';
import { safeContains as contains } from '../utils/hrCrud.js';

/** Split an ISO timestamp into its date key and "HH:MM" time (UTC). */
const splitTimestamp = (timestamp) => {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  return { date: toDateKey(d), time: d.toISOString().slice(11, 16) };
};

// ---------------------------------------------------------------------------
// GET /api/hr/staff-attendance
// ---------------------------------------------------------------------------
export const getAllAttendance = async (req, res, next) => {
  try {
    const { month, status, q, staffId, branch } = req.query;
    const query = {};
    if (month) query.date = new RegExp(`^${month}`);
    if (status && status !== 'All') query.status = status;
    if (staffId) query.staffId = staffId;
    if (branch && branch !== 'All Branches') query.branch = branch;
    if (q && q.trim()) {
      const rx = contains(q.trim());
      query.$or = [{ staffName: rx }, { staffId: rx }, { role: rx }];
    }

    const records = await StaffAttendance.find(query).sort({ date: -1, staffName: 1 });
    const count = (s) => records.filter((r) => r.status === s).length;
    const totalMinutes = records.reduce((sum, r) => {
      const m = /(\d+)h\s*(\d+)m/.exec(r.workingHours || '');
      return sum + (m ? Number(m[1]) * 60 + Number(m[2]) : 0);
    }, 0);

    return res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: records,
      kpis: {
        totalLogs: records.length,
        present: count('Present'),
        late: count('Late'),
        absent: count('Absent'),
        halfDay: count('Half Day'),
        onLeave: count('On Leave'),
        workingHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/hr/staff-attendance/:id
// ---------------------------------------------------------------------------
export const getAttendanceById = async (req, res, next) => {
  try {
    const record = await StaffAttendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Attendance record retrieved successfully',
      data: record
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/staff-attendance  — manual log
// ---------------------------------------------------------------------------
export const createAttendance = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.staffRef) {
      return res.status(400).json({ success: false, message: 'Staff member is required' });
    }
    if (!body.date) {
      return res.status(400).json({ success: false, message: 'Attendance date is required' });
    }
    const valid = ['Present', 'Late', 'Absent', 'Half Day', 'On Leave'];
    if (body.status && !valid.includes(body.status)) {
      return res.status(400).json({ success: false, message: `Status must be one of ${valid.join(', ')}` });
    }

    const staff = await Staff.findById(body.staffRef);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const existing = await StaffAttendance.findOne({ staffRef: staff._id, date: body.date });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Attendance for ${staff.name} on ${body.date} already exists`
      });
    }

    const status = body.status || 'Present';
    const checkIn = body.checkIn || '';
    const checkOut = body.checkOut || '';

    const record = await StaffAttendance.create({
      staffRef: staff._id,
      staffId: staff.staffCode,
      staffName: staff.name,
      role: staff.role,
      branch: staff.branch,
      date: body.date,
      status,
      checkIn: status === 'Absent' || status === 'On Leave' ? '—' : checkIn,
      checkOut: status === 'Absent' || status === 'On Leave' ? '—' : checkOut,
      workingHours: status === 'Absent' || status === 'On Leave'
        ? ''
        : workingHoursBetween(checkIn, checkOut),
      remarks: body.remarks || ''
    });

    return res.status(201).json({
      success: true,
      message: `Attendance logged for ${staff.name}`,
      data: record
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/hr/staff-attendance/punch  — biometric device webhook
// ---------------------------------------------------------------------------
export const punchAttendance = async (req, res, next) => {
  try {
    const { biometricId, deviceId, timestamp } = req.body || {};
    if (!biometricId) {
      return res.status(400).json({ success: false, message: 'biometricId is required' });
    }
    if (!timestamp) {
      return res.status(400).json({ success: false, message: 'timestamp is required' });
    }

    const staff = await Staff.findOne({ biometricId: String(biometricId) });
    if (!staff) {
      return res.status(404).json({ success: false, message: `No staff member enrolled with biometric ID ${biometricId}` });
    }

    const parts = splitTimestamp(timestamp);
    if (!parts) {
      return res.status(400).json({ success: false, message: 'timestamp is not a valid ISO date' });
    }

    const shift = staff.shift ? await Shift.findById(staff.shift) : null;
    let record = await StaffAttendance.findOne({ staffRef: staff._id, date: parts.date, isSynthetic: false });

    // ---- first punch of the day ----
    if (!record) {
      const resolved = resolvePunch({ shift, checkIn: null, time: parts.time });
      record = await StaffAttendance.create({
        staffRef: staff._id,
        staffId: staff.staffCode,
        staffName: staff.name,
        role: staff.role,
        branch: staff.branch,
        date: parts.date,
        checkIn: parts.time,
        checkOut: '',
        workingHours: '',
        status: resolved.status,
        lateMinutes: resolved.lateMinutes,
        lateFine: resolved.lateFine,
        deviceId: deviceId || ''
      });

      return res.status(201).json({
        success: true,
        message: `Punch recorded for ${staff.name} at ${parts.time}`,
        data: record
      });
    }

    // ---- subsequent punch of the day: checkout ----
    record.checkOut = parts.time;
    record.workingHours = workingHoursBetween(record.checkIn, parts.time);
    if (record.deviceId === '' && deviceId) record.deviceId = deviceId;
    await record.save();

    return res.status(200).json({
      success: true,
      message: `Checkout recorded for ${staff.name} at ${parts.time}`,
      data: record
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/hr/staff-attendance/:id
// ---------------------------------------------------------------------------
export const updateAttendance = async (req, res, next) => {
  try {
    const record = await StaffAttendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const body = req.body || {};
    const valid = ['Present', 'Late', 'Absent', 'Half Day', 'On Leave'];

    if (body.status !== undefined) {
      if (!valid.includes(body.status)) {
        return res.status(400).json({ success: false, message: `Status must be one of ${valid.join(', ')}` });
      }
      record.status = body.status;
    }
    if (body.checkIn !== undefined) record.checkIn = body.checkIn;
    if (body.checkOut !== undefined) record.checkOut = body.checkOut;
    if (body.remarks !== undefined) record.remarks = body.remarks;

    const blank = record.status === 'Absent' || record.status === 'On Leave';
    if (blank) {
      record.checkIn = '—';
      record.checkOut = '—';
      record.workingHours = '';
    } else {
      record.workingHours = workingHoursBetween(record.checkIn, record.checkOut);
    }

    await record.save();
    return res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: record
    });
  } catch (error) {
    return next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/hr/staff-attendance/:id
// ---------------------------------------------------------------------------
export const deleteAttendance = async (req, res, next) => {
  try {
    const record = await StaffAttendance.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    return next(error);
  }
};
