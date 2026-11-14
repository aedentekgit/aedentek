import mongoose from 'mongoose';
import { cleanNonStaticSettings } from '../utils/defaultSettings.js';

const invoiceSenderSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "" },
    companyTagline: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Secondary", ""], default: "" },
    companyContactPerson: { type: String, default: "" },
    companyEmail: { type: String, default: "" },
    companyPhone: { type: String, default: "" },
    companyGst: { type: String, default: "" },
    companyPan: { type: String, default: "" },
    companyLogo: { type: String, default: "" },
    companyAddress: { type: String, default: "" },
    signatoryName: { type: String, default: "" },
    signatoryDesignation: { type: String, default: "" },
    signatorySeal: { type: String, default: "" }
  },
  { _id: false }
);

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: { type: String, default: "" },
    accountName: { type: String, default: "" },
    accountType: { type: String, enum: ["Current", "Savings", ""], default: "" },
    accountNumber: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    swiftCode: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Secondary", ""], default: "" },
    branch: { type: String, default: "" },
    upiId: { type: String, default: "" },
    qrCode: { type: String, default: "" },
    bankAddress: { type: String, default: "" }
  },
  { _id: false }
);

const gstSettingsSchema = new mongoose.Schema(
  {
    defaultHsn: { type: String, default: "" },
    defaultGstRate: { type: Number, default: null },
    defaultTaxType: { type: String, default: "" },
    enableGst: { type: Boolean, default: false },
    lutNumber: { type: String, default: "" }
  },
  { _id: false }
);

const themeSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: "" },
    secondaryColor: { type: String, default: "" },
    mode: { type: String, enum: ["Day", "Night", "Auto", ""], default: "" },
    type: { type: String, enum: ["Lite", "Dark", ""], default: "" },
    headerFont: {
      type: String,
      enum: ["Outfit", "Plus Jakarta Sans", "Inter", "Cabinet Grotesk", ""],
      default: ""
    },
    paragraphFont: {
      type: String,
      enum: ["Inter", "Plus Jakarta Sans", "Roboto", ""],
      default: ""
    },
    showThemeToggle: { type: Boolean, default: false }
  },
  { _id: false }
);

const smtpSchema = new mongoose.Schema(
  {
    smtpHost: { type: String, default: "" },
    smtpPort: { type: String, default: "" },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "" },
    smtpFromEmail: { type: String, default: "" },
    smtpFromName: { type: String, default: "" },
    smtpEncryption: {
      type: String,
      enum: ["TLS", "SSL", "STARTTLS", "None", ""],
      default: ""
    }
  },
  { _id: false }
);

const msg91Schema = new mongoose.Schema(
  {
    msg91AuthKey: { type: String, default: "" },
    msg91SenderId: { type: String, default: "" },
    msg91AppRoute: { type: String, default: "" },
    msg91TemplateId: { type: String, default: "" },
    msg91TemplateVariable: { type: String, default: "" },
    msg91Status: { type: Boolean, default: false }
  },
  { _id: false }
);

const otpSchema = new mongoose.Schema(
  {
    otpLength: { type: String, enum: ["6", "4", ""], default: "" },
    expiryMinutes: { type: Number, default: null },
    maxResendAttempts: { type: Number, default: null }
  },
  { _id: false }
);

const firebaseSchema = new mongoose.Schema(
  {
    firebaseApiKey: { type: String, default: "" },
    firebaseProjectId: { type: String, default: "" },
    vapidKey: { type: String, default: "" },
    firebaseAppId: { type: String, default: "" },
    serviceAccountJson: { type: String, default: "" }
  },
  { _id: false }
);

const mobileappSchema = new mongoose.Schema(
  {
    mobileAppName: { type: String, default: "" },
    mobileAppIcon: { type: String, default: "" },
    mobileBuildVersion: { type: String, default: "" },
    apkDownloadUrl: { type: String, default: "" },
    updateEnforcement: { type: Boolean, default: false }
  },
  { _id: false }
);

const navigationSchema = new mongoose.Schema(
  {
    home: { type: Boolean, default: false },
    courses: { type: Boolean, default: false },
    gallery: { type: Boolean, default: false },
    videos: { type: Boolean, default: false },
    blogs: { type: Boolean, default: false },
    about: { type: Boolean, default: false },
    contact: { type: Boolean, default: false }
  },
  { _id: false }
);

const generalSchema = new mongoose.Schema(
  {
    logo: { type: String, default: "" },
    siteName: { type: String, default: "" },
    siteEmail: { type: String, default: "" },
    sitePhone: { type: String, default: "" },
    currency: { type: String, default: "" },
    showContactForm: { type: Boolean, default: false },
    androidAppUrl: { type: String, default: "" },
    iosAppUrl: { type: String, default: "" },
    macAppUrl: { type: String, default: "" },
    windowsAppUrl: { type: String, default: "" }
  },
  { _id: false }
);

const socialSchema = new mongoose.Schema(
  {
    instagramUrl: { type: String, default: "" },
    facebookUrl: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    twitterUrl: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    youtubeUrl: { type: String, default: "" }
  },
  { _id: false }
);

const razorpaySchema = new mongoose.Schema(
  {
    razorpayKeyId: { type: String, default: "" },
    razorpayKeySecret: { type: String, default: "" },
    razorpayStatus: { type: Boolean, default: false },
    enableIosInAppPayment: { type: Boolean, default: false },
    enableAndroidInAppPayment: { type: Boolean, default: false }
  },
  { _id: false }
);

const securitySchema = new mongoose.Schema(
  {
    devModeProtection: { type: Boolean, default: false },
    screenshotProtection: { type: Boolean, default: false },
    recaptchaEnabled: { type: Boolean, default: false },
    recaptchaSiteKey: { type: String, default: "" },
    recaptchaSecretKey: { type: String, default: "" }
  },
  { _id: false }
);

const adminSettingsSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      default: 'master_admin_settings',
    },
    invoiceSender: { type: invoiceSenderSchema, default: () => ({ ...cleanNonStaticSettings.invoiceSender }) },
    bankDetails: { type: bankDetailsSchema, default: () => ({ ...cleanNonStaticSettings.bankDetails }) },
    gstSettings: { type: gstSettingsSchema, default: () => ({ ...cleanNonStaticSettings.gstSettings }) },
    theme: { type: themeSchema, default: () => ({ ...cleanNonStaticSettings.theme }) },
    smtp: { type: smtpSchema, default: () => ({ ...cleanNonStaticSettings.smtp }) },
    msg91: { type: msg91Schema, default: () => ({ ...cleanNonStaticSettings.msg91 }) },
    otp: { type: otpSchema, default: () => ({ ...cleanNonStaticSettings.otp }) },
    firebase: { type: firebaseSchema, default: () => ({ ...cleanNonStaticSettings.firebase }) },
    mobileapp: { type: mobileappSchema, default: () => ({ ...cleanNonStaticSettings.mobileapp }) },
    navigation: { type: navigationSchema, default: () => ({ ...cleanNonStaticSettings.navigation }) },
    general: { type: generalSchema, default: () => ({ ...cleanNonStaticSettings.general }) },
    social: { type: socialSchema, default: () => ({ ...cleanNonStaticSettings.social }) },
    razorpay: { type: razorpaySchema, default: () => ({ ...cleanNonStaticSettings.razorpay }) },
    security: { type: securitySchema, default: () => ({ ...cleanNonStaticSettings.security }) },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.identifier;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

export const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

