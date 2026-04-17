const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true },
  teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#3B82F6' }, // team color for UI
}, { timestamps: true });

// Ensure teamLead is always in members
teamSchema.pre('save', function (next) {
  if (this.teamLead) {
    const leadId = String(this.teamLead);
    const memberIds = this.members.map(String);
    if (!memberIds.includes(leadId)) {
      this.members.push(this.teamLead);
    }
  }
  next();
});

module.exports = mongoose.model('Team', teamSchema);
