import mongoose from 'mongoose';

const documentSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  name: { type: String, required: true },
  type: { type: String, default: 'PDF' },
  size: { type: String, default: '1.0 MB' },
  uploadedAt: { type: String, default: '' },
  url: { type: String, default: '#' },
  data: { type: String, default: '' }
}, { _id: false });

const staffSchema = new mongoose.Schema({
  // ---- System IDs ----
  staffCode: { type: String, unique: true, index: true, default: '' },
  employeeCode: { type: String, unique: true, index: true, default: '' },
  biometricId: { type: String, default: '', index: true },

  // ---- Personal info ----
  salutation: { type: String, default: '' },
  firstName: { type: String, required: true },
  middleName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  dob: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed', ''], default: '' },
  nationality: { type: String, default: 'India' },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: '' },

  // ---- Employment ----
  department: { type: String, default: 'Operations' },
  role: { type: String, default: 'Staff' },
  branch: { type: String, required: true, index: true },
  branchRef: { type: String, default: '' },
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
  shiftName: { type: String, default: '' },
  employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Intern', ''], default: 'Full-time' },
  joiningDate: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave', 'Terminated'], default: 'Active', index: true },

  // ---- Salary elements ----
  basic: { type: Number, default: 0, min: 0 },
  hra: { type: Number, default: 0, min: 0 },
  transportAllowance: { type: Number, default: 0, min: 0 },
  telephoneAllowance: { type: Number, default: 0, min: 0 },
  foodAllowance: { type: Number, default: 0, min: 0 },
  specialAllowance: { type: Number, default: 0, min: 0 },
  otherEarnings: { type: Number, default: 0, min: 0 },
  otherDeductions: { type: Number, default: 0, min: 0 },
  salary: { type: Number, default: 0, min: 0 },
  netSalary: { type: Number, default: 0, min: 0 },

  // ---- Bank settlement ----
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  iban: { type: String, default: '' },

  // ---- Credentials ----
  createLogin: { type: Boolean, default: false },
  username: { type: String, default: '' },
  password: { type: String, default: '' },
  accessLevel: { type: String, default: 'Staff' },

  photo: { type: String, default: '' },
  documents: [documentSubSchema]
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.password; delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.password; delete ret.__v; return ret; } }
});

// Derived name, gross salary and net salary — computed server-side, never trusted from the client.
staffSchema.pre('save', function (next) {
  this.name = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ').trim();
  const gross = (this.basic || 0) + (this.hra || 0) + (this.transportAllowance || 0)
    + (this.telephoneAllowance || 0) + (this.foodAllowance || 0) + (this.specialAllowance || 0)
    + (this.otherEarnings || 0);
  this.salary = Math.max(0, gross);
  this.netSalary = Math.max(0, this.salary - (this.otherDeductions || 0));
  next();
});

export default mongoose.model('Staff', staffSchema);
