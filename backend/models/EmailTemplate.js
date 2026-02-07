const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  sector: {
    type: String,
    enum: ['fintech', 'saas', 'marketplace', 'ai', 'healthtech', 'edtech', 'general'],
    default: 'general'
  },
  subject: String,
  body: String, // Template with {{variables}}
  variables: [String], // e.g., ['companyName', 'ceoName', 'candidates']
  openingLine: String,
  closingLine: String,
  candidates_count: {
    type: Number,
    default: 3
  },
  version: Number,
  active: {
    type: Boolean,
    default: true
  },
  performanceMetrics: {
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    openRate: Number,
    clickRate: Number,
    replyRate: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
