const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  companyName: String,
  ceoEmail: String,
  ceoName: String,
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  },
  subject: String,
  body: String,
  candidatesList: [{
    name: String,
    linkedinUrl: String,
    title: String,
    company: String
  }],
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'bounced'],
    default: 'sent'
  },
  trackingId: String,
  engagement: {
    opened: Boolean,
    openedAt: Date,
    clicked: Boolean,
    clickedAt: Date,
    replied: Boolean,
    repliedAt: Date,
    replyContent: String
  },
  errorMessage: String,
  retries: {
    type: Number,
    default: 0
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    location: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

emailLogSchema.index({ ceoEmail: 1, sentAt: -1 });
emailLogSchema.index({ jobId: 1 });
emailLogSchema.index({ status: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
