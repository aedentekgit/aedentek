/**
 * Clean Non-Static Initial Admin Settings Object
 */
export const cleanNonStaticSettings = {
  invoiceSender: {
    companyName: "",
    companyTagline: "",
    status: "",
    companyContactPerson: "",
    companyEmail: "",
    companyPhone: "",
    companyGst: "",
    companyPan: "",
    companyLogo: "",
    companyAddress: "",
    signatoryName: "",
    signatoryDesignation: "",
    signatorySeal: ""
  },
  bankDetails: {
    bankName: "",
    accountName: "",
    accountType: "",
    accountNumber: "",
    ifsc: "",
    swiftCode: "",
    status: "",
    branch: "",
    upiId: "",
    qrCode: "",
    bankAddress: ""
  },
  gstSettings: {
    defaultHsn: "",
    defaultGstRate: null,
    defaultTaxType: "",
    enableGst: false,
    lutNumber: ""
  },
  theme: {
    primaryColor: "",
    secondaryColor: "",
    mode: "",
    type: "",
    showThemeToggle: false,
    headerFont: "",
    paragraphFont: ""
  },
  smtp: {
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "",
    smtpFromEmail: "",
    smtpFromName: "",
    smtpEncryption: ""
  },
  msg91: {
    msg91AuthKey: "",
    msg91SenderId: "",
    msg91AppRoute: "",
    msg91TemplateId: "",
    msg91TemplateVariable: "",
    msg91Status: false
  },
  otp: {
    otpLength: "",
    expiryMinutes: null,
    maxResendAttempts: null
  },
  firebase: {
    firebaseApiKey: "",
    firebaseProjectId: "",
    vapidKey: "",
    firebaseAppId: "",
    serviceAccountJson: ""
  },
  mobileapp: {
    mobileAppName: "",
    mobileAppIcon: "",
    mobileBuildVersion: "",
    apkDownloadUrl: "",
    updateEnforcement: false
  },
  navigation: {
    home: false,
    courses: false,
    gallery: false,
    videos: false,
    blogs: false,
    about: false,
    contact: false
  },
  general: {
    logo: "",
    siteName: "",
    siteEmail: "",
    sitePhone: "",
    currency: "",
    showContactForm: false,
    androidAppUrl: "",
    iosAppUrl: "",
    macAppUrl: "",
    windowsAppUrl: ""
  },
  social: {
    instagramUrl: "",
    facebookUrl: "",
    linkedinUrl: "",
    twitterUrl: "",
    whatsappNumber: "",
    youtubeUrl: ""
  },
  razorpay: {
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayStatus: false,
    enableIosInAppPayment: false,
    enableAndroidInAppPayment: false
  },
  security: {
    devModeProtection: false,
    screenshotProtection: false,
    recaptchaEnabled: false,
    recaptchaSiteKey: "",
    recaptchaSecretKey: ""
  }
};

export const SETTING_SECTIONS = Object.keys(cleanNonStaticSettings);
