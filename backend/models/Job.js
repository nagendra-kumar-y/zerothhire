const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  linkedinJobId: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  company: {
    name: String,
    linkedinUrl: String,
    linkedinId: String
  },
  location: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  applicantCount: Number,
  postedAt: Date,
  linkedinUrl: String,
  scraped_at: {
    type: Date,
    default: Date.now
  },
  processed: {
    type: Boolean,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'success', 'ceo_not_found', 'email_not_found', 'send_failed'],
    default: 'pending'
  },
  ceoContact: {
    ceoName: String,
    ceoLinkedInUrl: String,
    ceoEmail: String,
    emailSource: String // hunter.io, rocketreach, manual
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  response: {
    status: String, // 'opened', 'clicked', 'replied', 'no_response'
    repliedAt: Date,
    replyContent: String
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

jobSchema.index({ location: 1, title: 1, 'company.name': 1 });

module.exports = mongoose.model('Job', jobSchema);
