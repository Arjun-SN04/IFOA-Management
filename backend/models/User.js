const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'manager', 'team_lead', 'employee'], default: 'employee' },
  department: { type: String, trim: true },
  designation: { type: String, trim: true },
  phone: { type: String },
  avatar: { type: String, default: '' },
  employeeId: { type: String, unique: true },
  joiningDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  leaveBalance: {
    casual: { type: Number, default: 12 },
    sick: { type: Number, default: 10 },
    annual: { type: Number, default: 15 },
    unpaid: { type: Number, default: 0 },
    compensatory: { type: Number, default: 0 },
  },
  accessories: [{
    name: { type: String, required: true, trim: true },
    serialNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  skills: [{ type: String }],
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
