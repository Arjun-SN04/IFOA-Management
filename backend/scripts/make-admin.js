// Script to create or promote a user to admin
// Usage: node scripts/make-admin.js <email>

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/make-admin.js <email>');
  console.log('Example: node scripts/make-admin.js admin@ifoa.com');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let user = await User.findOne({ email });

  if (user) {
    user.role = 'admin';
    await user.save();
    console.log(`✅ User "${user.name}" (${email}) promoted to admin`);
  } else {
    const count = await User.countDocuments();
    user = await User.create({
      name: 'IFOA Admin',
      email,
      password: 'admin123',
      role: 'admin',
      department: 'Management',
      designation: 'Administrator',
      employeeId: `IFOA-${String(count + 1).padStart(4, '0')}`,
    });
    console.log(`✅ Admin user created:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: admin123`);
    console.log(`   ⚠️  Change this password after first login!`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
