// One-off, idempotent: link seeded invoices to projects and add agreement dates to seeded clients.
import mongoose from 'mongoose';
import Client from '../src/models/Client.js';
import { SEED_CLIENTS } from '../src/controllers/clientController.js';
import 'dotenv/config';
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aedentek_crm';
await mongoose.connect(uri);
for (const seed of SEED_CLIENTS) {
  const c = await Client.findOne({ clientId: seed.clientId });
  if (!c) continue;
  if (!c.agreementFrom) { c.agreementFrom = seed.agreementFrom; c.agreementTo = seed.agreementTo; }
  for (const si of seed.invoices) {
    const inv = c.invoices.find((i) => i.id === si.id);
    if (inv && !inv.projectId) inv.projectId = si.projectId;
  }
  c.markModified('invoices');
  await c.save();
  console.log('migrated', c.clientId);
}
await mongoose.disconnect();
