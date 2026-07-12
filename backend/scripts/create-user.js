require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');

const ALLOWED_ROLES = ['employee', 'team_lead', 'manager', 'hr', 'admin'];

// Roles that are auto-approved on creation (no HR/manager sign-off needed)
const AUTO_APPROVED_ROLES = ['admin', 'hr', 'team_lead'];

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

function normalizeRole(input) {
  const value = String(input || '').trim().toLowerCase();
  const aliases = {
    'human resources': 'hr',
    'lead': 'team_lead',
    'teamlead': 'team_lead',
    'team lead': 'team_lead',
  };
  return aliases[value] ?? value;
}

async function buildEmployeeId() {
  let employeeId;
  while (!employeeId) {
    const count = await User.countDocuments();
    const candidate = `IFOA-${String(count + 1).padStart(4, '0')}`;
    const collision = await User.findOne({ employeeId: candidate });
    if (!collision) employeeId = candidate;
  }
  return employeeId;
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in .env');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log('Allowed roles:', ALLOWED_ROLES.join(', '));
    console.log('─'.repeat(40));

    const name  = await ask(rl, 'Full name            : ');
    const email = (await ask(rl, 'Email                : ')).toLowerCase();
    const password = await ask(rl, 'Password (min 6)     : ');
    const roleRaw  = await ask(rl, 'Role                 : ');
    const role = normalizeRole(roleRaw);

    // ── Validation ───────────────────────────────────────────────────────────
    if (!name)     throw new Error('Name is required');
    if (!email)    throw new Error('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
    if (!ALLOWED_ROLES.includes(role)) {
      throw new Error(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`);
    }

    const existing = await User.findOne({ email });
    if (existing) throw new Error(`User with email "${email}" already exists`);

    // ── Optional fields ──────────────────────────────────────────────────────
    const department  = await ask(rl, 'Department (optional): ');
    const designation = await ask(rl, 'Designation (optional): ');

    const employeeId = await buildEmployeeId();
    const isApproved = AUTO_APPROVED_ROLES.includes(role);

    const user = await User.create({
      name,
      email,
      password,
      role,
      employeeId,
      ...(department  && { department }),
      ...(designation && { designation }),
      isApproved,
      isActive: true,
    });

    console.log('\n✅  User created successfully');
    console.log('─'.repeat(40));
    console.log(`  Name        : ${user.name}`);
    console.log(`  Email       : ${user.email}`);
    console.log(`  Role        : ${user.role}`);
    console.log(`  Employee ID : ${user.employeeId}`);
    console.log(`  Approved    : ${user.isApproved ? 'yes (auto)' : 'no — pending manager/HR approval'}`);
    if (department)  console.log(`  Department  : ${department}`);
    if (designation) console.log(`  Designation : ${designation}`);

  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

main().catch((err) => {
  console.error(`\n❌  Error: ${err.message}`);
  process.exit(1);
});
