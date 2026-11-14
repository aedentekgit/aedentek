import mongoose from 'mongoose';

export const attachmentSubSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
  },
  name: { type: String, required: true, trim: true },
  type: { type: String, default: 'FILE' }, // PDF, PNG, JPG, JPEG, WEBP, etc.
  size: { type: String, default: '' },
  uploadedAt: {
    type: String,
    default: () => new Date().toISOString().slice(0, 10)
  },
  data: { type: String, default: '' } // Base64 data URL
}, { _id: false });

export default attachmentSubSchema;
