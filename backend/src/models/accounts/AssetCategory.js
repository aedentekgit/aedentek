import mongoose from 'mongoose';

const assetCategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  branch: { type: String, default: 'All Branches', index: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('AcctAssetCategory', assetCategorySchema);
