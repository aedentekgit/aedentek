import mongoose from 'mongoose';

const contactSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `contact-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  clientId: { type: String },
  name: { type: String, required: true },
  role: { type: String, default: 'Primary Contact' },
  email: { type: String, required: true },
  phone: { type: String },
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const websiteSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `web-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  clientId: { type: String },
  domain: { type: String, required: true },
  status: { type: String, default: 'Live' }, // Live | Staging | Development | Maintenance
  hostingProvider: { type: String, default: 'AWS Cloud (ap-south-1)' },
  sslExpiry: { type: String },
  domainExpiry: { type: String },
  hostingExpiry: { type: String }
}, { _id: false });

const socialSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `soc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  clientId: { type: String },
  key: { type: String, default: 'web' },
  name: { type: String, required: true },
  handle: { type: String, default: '' },
  desc: { type: String, default: '' },
  status: { type: String, default: 'Active' }, // Active | Connected | Verified
  kind: { type: String, default: 'good' }, // good | info | warn
  href: { type: String, default: '#' },
  cta: { type: String, default: 'View Channel' },
  icon: { type: String, default: 'globe' },
  tone: { type: String, default: 'blue' } // blue | ink | violet | amber | green
}, { _id: false });

const credentialSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `cred-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  clientId: { type: String },
  type: { type: String, default: 'Cloud Console' }, // AWS Cloud | GitHub | Vercel | MySQL | cPanel | API Key
  label: { type: String, required: true },
  loginUrl: { type: String },
  username: { type: String, required: true },
  password: { type: String, required: true },
  notes: { type: String }
}, { _id: false });

const projectStageEntrySchema = new mongoose.Schema({
  id: { type: String },
  stageId: { type: String }, // ProjectStage _id (master)
  name: { type: String, required: true },
  order: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' }, // Pending | In Progress | Completed
  startDate: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  completedDate: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

const projectSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  clientId: { type: String },
  title: { type: String, required: true },
  contractValue: { type: Number, default: 0 },
  milestonesCompleted: { type: Number, default: 0 },
  totalMilestones: { type: Number, default: 1 },
  progress: { type: Number, default: 0 },
  targetDate: { type: String },
  leadEngineer: { type: String, default: 'Hanna Lindqvist' },
  description: { type: String, default: '' },
  startDate: { type: String, default: '' },
  status: { type: String, default: 'In Progress' }, // Planning | In Progress | On Hold | Completed
  stages: { type: [projectStageEntrySchema], default: [] } // completion timeline picked per project
}, { _id: false });

const invoiceRefSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  invoiceNumber: { type: String, required: true },
  projectId: { type: String, default: '' },
  issueDate: { type: String },
  dueDate: { type: String },
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'Sent' }, // Draft | Sent | Partially Paid | Paid | Overdue
  taxMode: { type: String, default: 'B2B Registered' } // B2B Registered | B2C Retail | Export LUT
}, { _id: false });

const paymentSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  receiptId: { type: String, required: true },
  paymentDate: { type: String },
  amount: { type: Number, required: true },
  paymentChannel: { type: String, default: 'Bank Wire / NEFT' },
  bankReference: { type: String }
}, { _id: false });

const ticketSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `tkt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  ticketId: { type: String, required: true },
  subject: { type: String, required: true },
  priority: { type: String, default: 'Medium' }, // Urgent | High | Medium | Low
  status: { type: String, default: 'Open' }, // Open | In Progress | Resolved | Closed
  assignedEngineer: { type: String, default: 'Rahul Sen' },
  createdAt: { type: String }
}, { _id: false });

const documentSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  name: { type: String, required: true },
  type: { type: String, default: 'PDF' }, // PDF | DOCX | ZIP
  size: { type: String, default: '1.2 MB' },
  uploadedAt: { type: String },
  url: { type: String, default: '#' },
  category: { type: String, default: 'MSA' }, // MSA | SOW | NDA | LOU | Other
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  notes: { type: String, default: '' },
  fileName: { type: String, default: '' },
  data: { type: String, default: '' } // base64 data URL of the uploaded file
}, { _id: false });

const agreementDocSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  type: { type: String, default: '' },
  size: { type: String, default: '' },
  uploadedAt: { type: String, default: '' },
  data: { type: String, default: '' }
}, { _id: false });

const timelineSubSchema = new mongoose.Schema({
  id: { type: String, default: () => `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
  title: { type: String, required: true },
  description: { type: String },
  timestamp: { type: String },
  operator: { type: String, default: 'System' },
  icon: { type: String, default: 'activity' }
}, { _id: false });

const complianceSubSchema = new mongoose.Schema({
  gstinValid: { type: Boolean, default: true },
  stateCode: { type: String, default: '27' },
  taxRegime: { type: String, default: 'CGST + SGST (Intra-State 18%)' },
  lutReference: { type: String, default: 'LUT-2026-HQ-0081' },
  tdsRate: { type: String, default: '2.0% (Section 194C / 194J)' },
  itcEligible: { type: Boolean, default: true }
}, { _id: false });

const billingRowSchema = new mongoose.Schema({
  id: { type: String },
  month: { type: String }, // YYYY-MM
  dueDate: { type: String, default: '' },
  baseAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' }, // Pending | Paid
  paidDate: { type: String, default: '' },
  notes: { type: String, default: '' },
  manual: { type: Boolean, default: false }
}, { _id: false });

const billingSettingsSchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },
  gstMode: { type: String, default: 'Without GST' }, // Without GST | With GST
  gstRate: { type: Number, default: 18 }
}, { _id: false });

const clientSchema = new mongoose.Schema({
  clientId: { type: String, unique: true, index: true }, // e.g. client-1730528400000 or custom ID
  name: { type: String, required: true }, // Primary Contact Person
  company: { type: String, required: true, index: true }, // Corporate Business Name
  email: { type: String, required: true }, // Official Corporate Email
  phone: { type: String, required: true }, // Primary Contact Phone
  category: { type: String, default: 'Startup' }, // Enterprise | Startup | SMB
  status: { type: String, default: 'Active' }, // Active | Pending | Inactive
  industry: { type: String, default: 'Technology & Enterprise Solutions' },
  accountManager: { type: String, default: 'Rahul Sen' },
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: 'Mumbai' },
  website: { type: String, default: '' },
  logo: { type: String, default: '' },
  notes: { type: String, default: '' },
  agreementFrom: { type: String, default: '' },
  agreementTo: { type: String, default: '' },
  agreementDocument: { type: agreementDocSchema, default: () => ({}) },
  monthlyBilling: { type: billingSettingsSchema, default: () => ({}) },
  monthlySchedule: { type: [billingRowSchema], default: [] },
  createdDate: { type: Date, default: Date.now },

  // 12 Sub-Module Embedded Datasets (guaranteed array form collections)
  contacts: { type: [contactSubSchema], default: [] },
  websites: { type: [websiteSubSchema], default: [] },
  social: { type: [socialSubSchema], default: [] },
  credentials: { type: [credentialSubSchema], default: [] },
  projects: { type: [projectSubSchema], default: [] },
  invoices: { type: [invoiceRefSubSchema], default: [] },
  payments: { type: [paymentSubSchema], default: [] },
  tickets: { type: [ticketSubSchema], default: [] },
  documents: { type: [documentSubSchema], default: [] },
  timeline: { type: [timelineSubSchema], default: [] },
  monthlySchedule: { type: [billingRowSchema], default: [] },
  compliance: { type: complianceSubSchema, default: () => ({}) },

  // Live Financial Summary
  financialSummary: {
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-recalculate financial telemetry before saving
clientSchema.pre('save', function(next) {
  if (this.invoices && this.invoices.length > 0) {
    this.financialSummary.totalBilled = this.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  }
  if (this.payments && this.payments.length > 0) {
    this.financialSummary.totalPaid = this.payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
  }
  this.financialSummary.totalOutstanding = Math.max(0, (this.financialSummary.totalBilled || 0) - (this.financialSummary.totalPaid || 0));
  next();
});

export default mongoose.model('Client', clientSchema);

