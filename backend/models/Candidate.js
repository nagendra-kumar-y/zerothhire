const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  linkedinUrl: {
    type: String,
    required: true,
    unique: true
  },
  linkedinId: String,
  title: String,
  currentCompany: String,
  experience: String,
  skills: [String],
  location: String,
  email: String,
  about: String,
  profileImage: String,
  yearsOfExperience: Number,
  industry: [String],
  sector: {
    type: String,
    enum: ['fintech', 'saas', 'marketplace', 'ai', 'healthtech', 'edtech', 'other'],
    default: 'other'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  tags: [String],
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

candidateSchema.index({ linkedinUrl: 1, sector: 1, yearsOfExperience: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
