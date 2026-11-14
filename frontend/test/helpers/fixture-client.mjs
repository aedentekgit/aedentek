// Creates a throw-away client (with projects + invoices) straight in MongoDB so UI tests never
// depend on — or touch — the user's real clients. Everything is tagged "ZZ" and removed afterwards.
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, '../../../backend');
const load = (rel) => import(pathToFileURL(path.join(backend, rel)).href);

export async function createFixtureClient(tag) {
  const dotenv = (await load('node_modules/dotenv/lib/main.js')).default;
  dotenv.config({ path: path.join(backend, '.env') });
  const mongoose = (await load('node_modules/mongoose/index.js')).default;
  const { default: Client } = await load('src/models/Client.js');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aedentek_crm');
  }
  const clientId = `client-zz${Date.now()}`;
  const doc = await Client.create({
    clientId, company: `${tag} Fixture Co`, name: 'Fixture Person', email: 'fx@zz.io', phone: '+91 90000 00000',
    projects: [
      { id: `${clientId}-p1`, clientId, title: 'Fixture Project A', contractValue: 300000, totalMilestones: 4, milestonesCompleted: 3, progress: 75, status: 'In Progress' },
      { id: `${clientId}-p2`, clientId, title: 'Fixture Project B', contractValue: 100000, totalMilestones: 2, milestonesCompleted: 2, progress: 100, status: 'Completed' }
    ],
    invoices: [
      { id: `${clientId}-i1`, invoiceNumber: 'ZZ-INV-1', issueDate: '2026-08-15', dueDate: '2026-08-30', totalAmount: 472000, status: 'Paid', projectId: `${clientId}-p2` },
      { id: `${clientId}-i2`, invoiceNumber: 'ZZ-INV-2', issueDate: '2026-09-01', dueDate: '2026-09-15', totalAmount: 354000, status: 'Partially Paid', projectId: `${clientId}-p1` }
    ]
  });
  return {
    clientId: doc.clientId,
    async cleanup() {
      await Client.deleteMany({ company: new RegExp(`^${tag}`) });
      await mongoose.disconnect();
    }
  };
}
