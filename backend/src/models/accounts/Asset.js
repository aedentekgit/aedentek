import mongoose from 'mongoose';
import { attachmentSubSchema } from './attachmentSchema.js';

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true, index: true },
  assetName: { type: String, required: true },
  category: { type: String, required: true, index: true },
  quantity: { type: Number, default: 1, min: 1 },

  purchaseDate: { type: String, required: true },
  purchaseCost: { type: Number, default: 0, min: 0 },
  currentValue: { type: Number, default: 0, min: 0 },
  accumulatedDepreciation: { type: Number, default: 0, min: 0 },

  usefulLifeYears: { type: Number, default: 5, min: 0 },
  depreciationMethod: {
    type: String,
    enum: ['Straight Line', 'Reducing Balance'],
    default: 'Straight Line'
  },
  depreciationRate: { type: Number, default: 20, min: 0 },
  salvageValue: { type: Number, default: 0, min: 0 },

  location: { type: String, default: '' },
  assignedEmployee: { type: String, default: '' },
  paymentType: { type: String, enum: ['Single', 'Split Payment'], default: 'Single' },
  paymentMode: { type: String, default: 'Cash' },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Under Maintenance', 'Transferred', 'Disposed', 'Sold'],
    default: 'Active',
    index: true
  },
  branch: { type: String, default: 'All Branches', index: true },
  notes: { type: String, default: '' },
  attachments: { type: [attachmentSubSchema], default: [] }
}, { timestamps: true });

// Book value never falls below the salvage value.
assetSchema.pre('save', function (next) {
  const cost = Number(this.purchaseCost) || 0;
  const salvage = Math.min(Number(this.salvageValue) || 0, cost);
  this.salvageValue = salvage;
  this.accumulatedDepreciation = Math.max(0, Number(this.accumulatedDepreciation) || 0);
  this.currentValue = Math.max(salvage, Math.round((cost - this.accumulatedDepreciation) * 100) / 100);
  next();
});

export default mongoose.model('AcctAsset', assetSchema);
