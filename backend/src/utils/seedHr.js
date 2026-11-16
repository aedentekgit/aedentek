import Branch from '../models/Branch.js';
import Shift from '../models/Shift.js';
import LeaveType from '../models/LeaveType.js';
import Staff from '../models/Staff.js';
import StaffAttendance from '../models/StaffAttendance.js';
import PayrollAdjustment from '../models/PayrollAdjustment.js';
import { toPeriodKey } from './hrEngine.js';

export const SEED_SHIFTS = [
  {
    name: 'Morning Shift',
    startTime: '06:00',
    endTime: '14:00',
    lateAfter: '06:15',
    lateDeduction: 50,
    lateDeductionPerMin: 5,
    shiftAllowance: 0,
    status: 'Active'
  },
  {
    name: 'General Day Shift',
    startTime: '09:00',
    endTime: '18:00',
    lateAfter: '09:15',
    lateDeduction: 50,
    lateDeductionPerMin: 0,
    shiftAllowance: 0,
    status: 'Active'
  },
  {
    name: 'Night Operations',
    startTime: '18:00',
    endTime: '02:00',
    lateAfter: '18:20',
    lateDeduction: 100,
    lateDeductionPerMin: 10,
    shiftAllowance: 2000,
    status: 'Active'
  },
  {
    name: 'Weekend Maintenance',
    startTime: '10:00',
    endTime: '16:00',
    lateAfter: '10:30',
    lateDeduction: 0,
    lateDeductionPerMin: 0,
    shiftAllowance: 500,
    status: 'Inactive'
  }
];

export const SEED_LEAVE_TYPES = [
  { name: 'Casual Leave', code: 'CL', monthlyQuota: 1.5, annualQuota: 12, paid: true, branch: 'All Branches', status: 'Active' },
  { name: 'Sick Leave', code: 'SL', monthlyQuota: 1, annualQuota: 12, paid: true, branch: 'All Branches', status: 'Active' },
  { name: 'Annual Privilege Leave', code: 'APL', monthlyQuota: 1.5, annualQuota: 18, paid: true, branch: 'All Branches', status: 'Active' },
  { name: 'Maternity Leave', code: 'ML', monthlyQuota: 0, annualQuota: 182, paid: true, branch: 'All Branches', status: 'Active' },
  { name: 'Bereavement Leave', code: 'BL', monthlyQuota: 0, annualQuota: 5, paid: true, branch: 'All Branches', status: 'Active' },
  { name: 'Unpaid Leave', code: 'UL', monthlyQuota: 0, annualQuota: 0, paid: false, branch: 'All Branches', status: 'Active' }
];

export const SEED_STAFF = [
  {
    staffCode: 'BA-S-0001', employeeCode: 'GG001', biometricId: '101',
    salutation: 'Ms.', firstName: 'Ines', lastName: 'Okafor',
    dob: '1992-04-18', gender: 'Female', maritalStatus: 'Single',
    nationality: 'India', bloodGroup: 'B+',
    department: 'Accounts', role: 'Accountant', branch: 'Bandra', branchRef: 'BA',
    shiftName: 'General Day Shift', employmentType: 'Full-time',
    joiningDate: '2024-02-05', status: 'Active',
    basic: 32000, hra: 16000, transportAllowance: 1600, telephoneAllowance: 800,
    foodAllowance: 2200, specialAllowance: 4500, otherEarnings: 1200, otherDeductions: 1500,
    bankName: 'HDFC Bank', accountNumber: '50200088192831', ifscCode: 'HDFC0000240',
    createLogin: true, username: 'ines.okafor', accessLevel: 'Staff'
  },
  {
    staffCode: 'BA-S-0002', employeeCode: 'GG002', biometricId: '102',
    salutation: 'Mr.', firstName: 'Rahul', lastName: 'Sen',
    dob: '1988-11-02', gender: 'Male', maritalStatus: 'Married',
    nationality: 'India', bloodGroup: 'O+',
    department: 'Operations', role: 'Branch Manager', branch: 'Bandra', branchRef: 'BA',
    shiftName: 'General Day Shift', employmentType: 'Full-time',
    joiningDate: '2021-08-16', status: 'Active',
    basic: 45000, hra: 22500, transportAllowance: 2200, telephoneAllowance: 1000,
    foodAllowance: 2600, specialAllowance: 8000, otherEarnings: 2000, otherDeductions: 2500,
    bankName: 'HDFC Bank', accountNumber: '50200088192832', ifscCode: 'HDFC0000240',
    createLogin: true, username: 'rahul.sen', accessLevel: 'Admin'
  },
  {
    staffCode: 'BA-S-0003', employeeCode: 'GG003', biometricId: '103',
    salutation: 'Mr.', firstName: 'Aarav', lastName: 'Nair',
    dob: '1996-07-29', gender: 'Male', maritalStatus: 'Single',
    nationality: 'India', bloodGroup: 'A+',
    department: 'Trainers', role: 'Trainer', branch: 'Bandra', branchRef: 'BA',
    shiftName: 'Morning Shift', employmentType: 'Full-time',
    joiningDate: '2023-01-09', status: 'Active',
    basic: 26000, hra: 13000, transportAllowance: 1600, telephoneAllowance: 700,
    foodAllowance: 2200, specialAllowance: 3000, otherEarnings: 800, otherDeductions: 1200,
    bankName: 'ICICI Bank', accountNumber: '004501112233', ifscCode: 'ICIC0000045',
    createLogin: true, username: 'aarav.nair', accessLevel: 'Trainer'
  },
  {
    staffCode: 'AN-S-0001', employeeCode: 'GG004', biometricId: '104',
    salutation: 'Ms.', firstName: 'Meera', lastName: 'Iyer',
    dob: '1999-03-11', gender: 'Female', maritalStatus: 'Single',
    nationality: 'India', bloodGroup: 'AB+',
    department: 'Reception', role: 'Receptionist', branch: 'Andheri', branchRef: 'AN',
    shiftName: 'General Day Shift', employmentType: 'Full-time',
    joiningDate: '2024-06-03', status: 'Active',
    basic: 22000, hra: 11000, transportAllowance: 1600, telephoneAllowance: 700,
    foodAllowance: 2200, specialAllowance: 2000, otherEarnings: 500, otherDeductions: 1000,
    bankName: 'Axis Bank', accountNumber: '918020001234', ifscCode: 'UTIB0000456',
    createLogin: false, username: '', accessLevel: 'Staff'
  },
  {
    staffCode: 'AN-S-0002', employeeCode: 'GG005', biometricId: '105',
    salutation: 'Mr.', firstName: 'Tarun', lastName: 'Mehta',
    dob: '1990-12-23', gender: 'Male', maritalStatus: 'Married',
    nationality: 'India', bloodGroup: 'A-',
    department: 'Housekeeping', role: 'Staff', branch: 'Andheri', branchRef: 'AN',
    shiftName: 'Night Operations', employmentType: 'Full-time',
    joiningDate: '2022-10-17', status: 'Active',
    basic: 18000, hra: 9000, transportAllowance: 1200, telephoneAllowance: 500,
    foodAllowance: 2000, specialAllowance: 3500, otherEarnings: 400, otherDeductions: 900,
    bankName: 'ICICI Bank', accountNumber: '004501112299', ifscCode: 'ICIC0000045',
    createLogin: false, username: '', accessLevel: 'Staff'
  },
  {
    staffCode: 'BA-S-0004', employeeCode: 'GG006', biometricId: '106',
    salutation: 'Dr.', firstName: 'Ananya', lastName: 'Rao',
    dob: '1985-09-07', gender: 'Female', maritalStatus: 'Married',
    nationality: 'India', bloodGroup: 'O-',
    department: 'Operations', role: 'Trainer', branch: 'Bandra', branchRef: 'BA',
    shiftName: 'General Day Shift', employmentType: 'Part-time',
    joiningDate: '2020-05-25', status: 'On Leave',
    basic: 38000, hra: 19000, transportAllowance: 2000, telephoneAllowance: 900,
    foodAllowance: 2400, specialAllowance: 6000, otherEarnings: 1500, otherDeductions: 2000,
    bankName: 'HDFC Bank', accountNumber: '50200088192844', ifscCode: 'HDFC0000240',
    createLogin: true, username: 'ananya.rao', accessLevel: 'Trainer'
  }
];

/**
 * Seed the HR master data. Mirrors the finance seed convention: only seed
 * when a collection is completely empty, so restart never overwrites real data.
 */
export const SEED_BRANCHES = [
  { name: 'Bandra', code: 'BA', city: 'Mumbai', address: 'Linking Road, Bandra West', manager: '', status: 'Active', isDefault: true },
  { name: 'Andheri', code: 'AN', city: 'Mumbai', address: 'Veera Desai Road, Andheri West', manager: '', status: 'Active', isDefault: false }
];

export const seedHrData = async () => {
  try {
    if ((await Branch.countDocuments()) === 0) {
      await Branch.insertMany(SEED_BRANCHES);
      console.log(`[Seed] Seeded ${SEED_BRANCHES.length} branches.`);
    } else {
      const hasDefault = await Branch.findOne({ isDefault: true });
      if (!hasDefault) {
        await Branch.updateOne({ name: 'Bandra' }, { isDefault: true });
      }
    }

    if ((await Shift.countDocuments()) === 0) {
      await Shift.insertMany(SEED_SHIFTS);
      console.log(`[Seed] Seeded ${SEED_SHIFTS.length} shift definitions.`);
    }

    if ((await LeaveType.countDocuments()) === 0) {
      await LeaveType.insertMany(SEED_LEAVE_TYPES);
      console.log(`[Seed] Seeded ${SEED_LEAVE_TYPES.length} leave types.`);
    }

    // Resolve shift references by name so the payroll engine can apply the
    // shift allowance and the late-penalty rules.
    const shifts = await Shift.find();
    const shiftByName = new Map(shifts.map((s) => [s.name, s]));

    if ((await Staff.countDocuments()) === 0) {
      // Model.create() is used instead of insertMany() because insertMany
      // bypasses pre('save') hooks, which is where the derived name, gross
      // salary and net salary are computed.
      for (const member of SEED_STAFF) {
        const shift = shiftByName.get(member.shiftName);
        await Staff.create({ ...member, shift: shift ? shift._id : null });
      }
      console.log(`[Seed] Seeded ${SEED_STAFF.length} staff records.`);
    } else {
      // Backfill shift references for staff seeded before shifts were linked.
      for (const member of await Staff.find({ shift: null })) {
        const shift = shiftByName.get(member.shiftName);
        if (shift) {
          member.shift = shift._id;
          await member.save();
        }
      }
    }

    if ((await StaffAttendance.countDocuments()) === 0) {
      const staff = await Staff.find();
      const period = toPeriodKey(new Date());
      const rows = [];
      for (const member of staff) {
        for (let day = 1; day <= 6; day += 1) {
          const date = `${period}-${String(day).padStart(2, '0')}`;
          rows.push({
            staffRef: member._id,
            staffId: member.staffCode,
            staffName: member.name,
            role: member.role,
            branch: member.branch,
            date,
            checkIn: day === 3 ? '09:28' : '09:02',
            checkOut: '18:04',
            workingHours: day === 3 ? '8h 36m' : '9h 2m',
            status: day === 3 ? 'Late' : 'Present',
            lateMinutes: day === 3 ? 13 : 0,
            lateFine: day === 3 ? 50 : 0
          });
        }
      }
      await StaffAttendance.insertMany(rows);
      console.log(`[Seed] Seeded ${rows.length} attendance records.`);
    }

    if ((await PayrollAdjustment.countDocuments()) === 0) {
      const staff = await Staff.find();
      const period = toPeriodKey(new Date());
      const rows = [];
      if (staff[0]) {
        rows.push({
          staffRef: staff[0]._id, staffId: staff[0].staffCode, staffName: staff[0].name,
          branch: staff[0].branch, period, type: 'credit', label: 'Performance Bonus', amount: 7500
        });
      }
      if (staff[1]) {
        rows.push({
          staffRef: staff[1]._id, staffId: staff[1].staffCode, staffName: staff[1].name,
          branch: staff[1].branch, period, type: 'deduction', label: 'Equipment Damage Recovery', amount: 1200
        });
      }
      if (rows.length) await PayrollAdjustment.insertMany(rows);
      console.log(`[Seed] Seeded ${rows.length} payroll adjustments.`);
    }
  } catch (error) {
    console.error('[Seed] Error seeding HR data:', error.message);
  }
};
