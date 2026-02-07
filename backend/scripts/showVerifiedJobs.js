/**
 * Show jobs with CEO and email verified (but emails not sent)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');

async function showVerifiedJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB connected\n');

    // Get jobs where CEO and email were found
    const verifiedJobs = await Job.find({
      'ceoContact.ceoEmail': { $exists: true, $ne: null },
      processingStatus: 'success'
    }).select('title company ceoContact processed emailSent notes');

    console.log('================================================');
    console.log(`📧 Verified Jobs (CEO + Email Found)`);
    console.log('================================================\n');

    if (verifiedJobs.length === 0) {
      console.log('No jobs with CEO/email verified yet.\n');
    } else {
      verifiedJobs.forEach((job, i) => {
        console.log(`${i + 1}. ${job.title}`);
        console.log(`   Company: ${job.company.name}`);
        console.log(`   CEO: ${job.ceoContact.ceoName}`);
        console.log(`   Email: ${job.ceoContact.ceoEmail}`);
        console.log(`   Source: ${job.ceoContact.emailSource}`);
        console.log(`   Email Sent: ${job.emailSent ? '✅ Yes' : '❌ No (testing mode)'}`);
        if (job.notes) {
          console.log(`   Note: ${job.notes}`);
        }
        console.log();
      });
    }

    console.log('================================================');
    console.log('💡 To enable email sending:');
    console.log('   1. Set SEND_EMAILS=true in .env');
    console.log('   2. Restart server');
    console.log('================================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

showVerifiedJobs();
