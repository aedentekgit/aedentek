// Removes ORPHAN reversal journal entries (a reversal whose original entry no longer exists)
// and clears dangling `reversedBy` links. Dry run by default; pass --apply to delete.
//   node scripts/cleanup-orphan-reversals.mjs          (lists what would change)
//   node scripts/cleanup-orphan-reversals.mjs --apply  (performs the cleanup)
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const apply = process.argv.includes('--apply');
await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
const col = mongoose.connection.db.collection('acctjournalentries');
const all = await col.find({}).toArray();
const nums = new Set(all.map((e) => e.entryNumber));
const orphanReversals = all.filter((e) => e.reversalOf && !nums.has(e.reversalOf));
const dangling = all.filter((e) => e.reversedBy && !nums.has(e.reversedBy));
console.log(`entries: ${all.length} | orphan reversals: ${orphanReversals.length} | dangling reversedBy: ${dangling.length}`);
orphanReversals.forEach((e) => console.log(`  orphan reversal ${e.entryNumber} (${(e.description || '').slice(0, 70)})`));
if (apply) {
  if (orphanReversals.length) console.log('deleted:', (await col.deleteMany({ _id: { $in: orphanReversals.map((e) => e._id) } })).deletedCount);
  for (const e of dangling) await col.updateOne({ _id: e._id }, { $set: { reversedBy: '' } });
  console.log('cleanup applied');
} else {
  console.log('dry run only - re-run with --apply to delete');
}
await mongoose.disconnect();
