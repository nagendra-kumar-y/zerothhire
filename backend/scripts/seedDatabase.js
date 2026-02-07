const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Candidate = require('../models/Candidate');

dotenv.config();

const seedCandidates = [
  {
    name: 'Rahul Sharma',
    linkedinUrl: 'https://linkedin.com/in/rahul-sharma-dev',
    title: 'Founding Engineer',
    currentCompany: 'Byju\'s',
    skills: ['React', 'Node.js', 'MongoDB', 'AWS'],
    location: 'Bangalore',
    email: 'rahul@example.com',
    yearsOfExperience: 7,
    sector: 'edtech',
    rating: 5,
    tags: ['experienced', 'startup-ready', 'full-stack']
  },
  {
    name: 'Priya Patel',
    linkedinUrl: 'https://linkedin.com/in/priya-patel-eng',
    title: 'Senior Software Engineer',
    currentCompany: 'Zerodha',
    skills: ['Python', 'JavaScript', 'System Design', 'Trading'],
    location: 'Bangalore',
    email: 'priya@example.com',
    yearsOfExperience: 8,
    sector: 'fintech',
    rating: 5,
    tags: ['fintech-expert', 'scaling', 'backend']
  },
  {
    name: 'Amit Kumar',
    linkedinUrl: 'https://linkedin.com/in/amit-kumar-ai',
    title: 'ML Engineer',
    currentCompany: 'Flipkart',
    skills: ['Python', 'TensorFlow', 'Deep Learning', 'NLP'],
    location: 'Bangalore',
    email: 'amit@example.com',
    yearsOfExperience: 6,
    sector: 'ai',
    rating: 4,
    tags: ['ml-specialist', 'startup-ready']
  },
  {
    name: 'Sneha Gupta',
    linkedinUrl: 'https://linkedin.com/in/sneha-gupta-dev',
    title: 'Full Stack Engineer',
    currentCompany: 'OYO',
    skills: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'],
    location: 'Bangalore',
    email: 'sneha@example.com',
    yearsOfExperience: 5,
    sector: 'saas',
    rating: 5,
    tags: ['full-stack', 'devops', 'team-player']
  },
  {
    name: 'Arjun Singh',
    linkedinUrl: 'https://linkedin.com/in/arjun-singh-eng',
    title: 'Infrastructure Engineer',
    currentCompany: 'Ather Energy',
    skills: ['Kubernetes', 'AWS', 'Go', 'Terraform', 'Distributed Systems'],
    location: 'Bangalore',
    email: 'arjun@example.com',
    yearsOfExperience: 7,
    sector: 'other',
    rating: 4,
    tags: ['devops-expert', 'scalability']
  },
  {
    name: 'Divya Sharma',
    linkedinUrl: 'https://linkedin.com/in/divya-sharma-dev',
    title: 'Frontend Engineer',
    currentCompany: 'Swiggy',
    skills: ['React', 'TypeScript', 'Performance Optimization', 'UI/UX'],
    location: 'Bangalore',
    email: 'divya@example.com',
    yearsOfExperience: 4,
    sector: 'saas',
    rating: 4,
    tags: ['frontend-expert', 'performance']
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/weekday-automation');

    // Clear existing candidates
    await Candidate.deleteMany({});
    
    // Insert new candidates
    const inserted = await Candidate.insertMany(seedCandidates);
    
    console.log(`✓ Successfully seeded ${inserted.length} candidates`);
    
    // Show inserted candidates
    const allCandidates = await Candidate.find({});
    console.log(`\nTotal candidates in database: ${allCandidates.length}`);
    
    allCandidates.forEach(c => {
      console.log(`- ${c.name} (${c.sector}) - Rating: ${c.rating}/5`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding database:', error);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError.message);
    }
  }
}

module.exports = { seedDatabase, seedCandidates };

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
