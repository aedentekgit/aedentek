import User from '../models/User.js';
import { hashBcrypt } from './password.js';

export const SEED_USERS = [
  {
    username: 'admin',
    email: 'admin@tessly.local',
    name: 'System Administrator',
    role: 'Admin',
    accessLevel: 'Admin',
    password: hashBcrypt('password123'),
    active: true
  },
  {
    username: 'admin@gmail.com',
    email: 'admin@gmail.com',
    name: 'Admin',
    role: 'Admin',
    accessLevel: 'Admin',
    password: hashBcrypt('admin123'),
    active: true
  },
  {
    username: 'ines.okafor',
    email: 'ines@caldermoss.co',
    name: 'Ines Okafor',
    role: 'Admin',
    accessLevel: 'Admin',
    password: hashBcrypt('marble88'),
    active: true
  },
  {
    username: 'ines.okafor.aedentek',
    email: 'ines.okafor@aedentek.com',
    name: 'Ines Okafor',
    role: 'Admin',
    accessLevel: 'Admin',
    password: hashBcrypt('password123'),
    active: true
  },
  {
    username: 'manager',
    email: 'manager@tessly.local',
    name: 'Branch Manager',
    role: 'Manager',
    accessLevel: 'Manager',
    password: hashBcrypt('password123'),
    active: true
  },
  {
    username: 'rahul.sen',
    email: 'rahul.sen@aedentek.com',
    name: 'Rahul Sen',
    role: 'Manager',
    accessLevel: 'Manager',
    password: hashBcrypt('password123'),
    active: true
  },
  {
    username: 'staff',
    email: 'staff@tessly.local',
    name: 'Frontline Staff',
    role: 'Staff',
    accessLevel: 'Staff',
    password: hashBcrypt('password123'),
    active: true
  },
  {
    username: 'tomas.reyes',
    email: 'tomas@caldermoss.co',
    name: 'Tomás Reyes',
    role: 'Staff',
    accessLevel: 'Staff',
    password: hashBcrypt('password123'),
    active: true
  },
  {
    username: 'priya.raman',
    email: 'priya@caldermoss.co',
    name: 'Priya Raman',
    role: 'Staff',
    accessLevel: 'Staff',
    password: hashBcrypt('password123'),
    active: true
  },
  {
    username: 'aarav.nair',
    email: 'aarav.nair@aedentek.com',
    name: 'Aarav Nair',
    role: 'Staff',
    accessLevel: 'Staff',
    password: hashBcrypt('password123'),
    active: true
  }
];

export const seedUserData = async () => {
  // Demo accounts have publicly known passwords (this file). Production sets
  // SEED_DEMO_USERS=false so they are never created or modified there.
  const seedFlag = String(process.env.SEED_DEMO_USERS ?? '').toLowerCase();
  const seedEnabled = seedFlag ? seedFlag !== 'false' && seedFlag !== '0' : process.env.NODE_ENV !== 'production';
  if (!seedEnabled) {
    console.log('[Seed] Demo user seeding disabled');
    return;
  }
  try {
    for (const u of SEED_USERS) {
      const existing = await User.findOne({
        $or: [{ username: u.username }, { email: u.email }]
      });

      if (!existing) {
        await User.create(u);
        console.log(`[Seed] Seeded user: ${u.username} (${u.role})`);
      } else {
        // Ensure password hash and role are up to date
        existing.role = u.role;
        existing.accessLevel = u.role;
        if (!existing.password || (!existing.password.startsWith('$2') && !existing.password.startsWith('scrypt$'))) {
          existing.password = u.password;
        }
        await existing.save();
      }
    }
  } catch (error) {
    console.error('[Seed] Error seeding User accounts:', error.message);
  }
};
