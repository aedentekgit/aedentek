// Account maintenance for the VPS (no UI exists for these yet).
// Run inside the container so it uses that environment's MONGODB_URI:
//   docker compose exec live node scripts/manage-user.mjs list
//   docker compose exec live node scripts/manage-user.mjs set-password <email|username>   (prompts, input hidden)
//   docker compose exec live node scripts/manage-user.mjs generate-password <email|username>  (prints a random one)
//   docker compose exec live node scripts/manage-user.mjs deactivate <email|username>
//   docker compose exec live node scripts/manage-user.mjs activate <email|username>
// Use `-it` (docker compose exec -it ...) for set-password so the hidden prompt works.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
const { default: User } = await import('../src/models/User.js');
const { hashBcrypt } = await import('../src/utils/password.js');

// Publicly known demo passwords (seedUsers.js / old backdoor) that must never be used on a real server
const KNOWN_WEAK = ['dev1234', 'password123', 'marble88'];

const [cmd, ident] = process.argv.slice(2);
const usage = () => {
  console.log('usage: node scripts/manage-user.mjs <list|set-password|generate-password|deactivate|activate> [email|username]');
  process.exit(1);
};
if (!cmd) usage();

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function findUser(id) {
  if (!id) usage();
  const needle = String(id).trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: needle }, { username: needle }] });
  if (!user) { console.error(`No user with email/username "${id}"`); process.exit(2); }
  return user;
}

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
try {
  if (cmd === 'list') {
    const users = await User.find({}, { username: 1, email: 1, name: 1, role: 1, active: 1, password: 1, lastLogin: 1 }).sort({ role: 1, username: 1 });
    const bcryptjs = (await import('bcryptjs')).default;
    console.log('role     active  weak-pw  username / email                         last login');
    for (const u of users) {
      const weak = u.password?.startsWith('$2') && KNOWN_WEAK.some((p) => bcryptjs.compareSync(p, u.password));
      console.log(`${(u.role || '').padEnd(8)} ${String(u.active !== false).padEnd(7)} ${(weak ? 'YES' : '-').padEnd(8)} ${`${u.username} / ${u.email || '—'}`.padEnd(40)} ${u.lastLogin ? u.lastLogin.toISOString().slice(0, 16) : 'never'}`);
    }
  } else if (cmd === 'set-password' || cmd === 'generate-password') {
    const user = await findUser(ident);
    let pw;
    if (cmd === 'generate-password') {
      pw = crypto.randomBytes(12).toString('base64url');
    } else {
      pw = await promptHidden(`New password for ${user.username}: `);
      const again = await promptHidden('Repeat password: ');
      if (pw !== again) { console.error('Passwords do not match'); process.exit(3); }
    }
    if (pw.length < 10) { console.error('Password must be at least 10 characters'); process.exit(3); }
    if (KNOWN_WEAK.includes(pw)) { console.error('That password is publicly known; choose another'); process.exit(3); }
    user.password = hashBcrypt(pw);
    await user.save();
    console.log(`Password updated for ${user.username} (${user.email || 'no email'})`);
    if (cmd === 'generate-password') console.log(`New password: ${pw}\nShare it securely and ask the user to keep it private.`);
  } else if (cmd === 'deactivate' || cmd === 'activate') {
    const user = await findUser(ident);
    user.active = cmd === 'activate';
    await user.save();
    console.log(`${user.username} is now ${user.active ? 'active' : 'deactivated (cannot sign in)'}`);
  } else {
    usage();
  }
} finally {
  await mongoose.disconnect();
}
