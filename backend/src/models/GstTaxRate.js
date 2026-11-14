import mongoose from 'mongoose';

const gstTaxRateSchema = new mongoose.Schema(
  {
    hsnCode: {
      type: String,
      required: [true, 'HSN / SAC Code is required'],
      trim: true,
      default: '',
    },
    gstRate: {
      type: Number,
      required: [true, 'GST Rate is required'],
      min: [0, 'GST Rate cannot be negative'],
      max: [100, 'GST Rate cannot exceed 100%'],
      default: null,
    },
    taxType: {
      type: String,
      enum: ['Standard', 'Zero-Rated', 'Exempted', ''],
      default: 'Standard',
    },
    serviceName: {
      type: String,
      required: [true, 'Service or Item Description is required'],
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', ''],
      default: 'Active',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    cgst: {
      type: Number,
      default: null,
    },
    sgst: {
      type: Number,
      default: null,
    },
    igst: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: auto-compute CGST, SGST, IGST based on gstRate
gstTaxRateSchema.pre('save', function (next) {
  if (typeof this.gstRate === 'number' && !isNaN(this.gstRate)) {
    this.cgst = Number((this.gstRate / 2).toFixed(2));
    this.sgst = Number((this.gstRate / 2).toFixed(2));
    this.igst = Number(this.gstRate.toFixed(2));
  } else {
    this.cgst = null;
    this.sgst = null;
    this.igst = null;
  }
  next();
});

export const GstTaxRate = mongoose.model('GstTaxRate', gstTaxRateSchema);

