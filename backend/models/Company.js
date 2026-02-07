const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  linkedinId: String,
  linkedinUrl: String,
  website: String,
  industry: String,
  employees: String,
  foundedYear: Number,
  description: String,
  ceo: {
    name: String,
    linkedinUrl: String,
    linkedinId: String,
    email: String,
    phone: String,
    emailSource: String,
    emailVerified: Boolean,
    bounceStatus: String // valid, bounce, accept_all, disposable
  },
  contactsFound: Number,
  jobsPosted: Number,
  emailsCampaignsSent: Number,
  conversions: Number,
  notes: String,
  lastScraped: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

companySchema.index({ name: 1, linkedinId: 1 });

module.exports = mongoose.model('Company', companySchema);
