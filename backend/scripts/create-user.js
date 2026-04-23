require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');

const ALLOWED_ROLES = ['employee', 'manager', 'hr'];

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

function normalizeRole(input) {
  const value = String(input || '').trim().toLowerCase();
  if (value === 'human resources') return 'hr';
  return value;
}

function buildEmployeeId(seq) {
  return `IFOA-${String(seq).padStart(4, '0')}`;
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const name = await ask(rl, 'Full name: ');
    const email = (await ask(rl, 'User email: ')).toLowerCase();
    const password = await ask(rl, 'Password (min 6 chars): ');
    const roleInput = await ask(rl, 'Role (employee/manager/hr): ');
    const role = normalizeRole(roleInput);

    if (!name) throw new Error('Name is required');
    if (!email) throw new Error('Email is required');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
    if (!ALLOWED_ROLES.includes(role)) {
      throw new Error('Role must be one of: employee, manager, hr');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error(`A user with email "${email}" already exists`);
    }

    let employeeId;
    while (!employeeId) {
      const count = await User.countDocuments();
      const candidate = buildEmployeeId(count + 1);
      const collision = await User.findOne({ employeeId: candidate });
      if (!collision) employeeId = candidate;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      employeeId,
      isApproved: !['employee', 'manager'].includes(role),
    });

    console.log('User created successfully');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Employee ID: ${user.employeeId}`);
    console.log(`Approved: ${user.isApproved ? 'yes' : 'no (pending approval)'}`);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
