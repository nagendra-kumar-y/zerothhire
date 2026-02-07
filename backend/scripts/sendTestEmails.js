const mongoose = require('mongoose');
require('dotenv').config();
const Job = require('../models/Job');
const emailSenderService = require('../services/emailSenderService');

// Pass job IDs as command line arguments
// Usage: node scripts/sendTestEmails.js <jobId1> <jobId2> ...
const jobIds = process.argv.slice(2);

async function sendEmails() {
  if (jobIds.length === 0) {
    console.log('Usage: node scripts/sendTestEmails.js <jobId1> <jobId2> ...');
    console.log('Example: node scripts/sendTestEmails.js 6986f28cff5b6183ce20f93a 6986f28cff5b6183ce20f93b');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected\n');

  console.log(`Sending emails to ${jobIds.length} job(s)...\n`);

  for (const id of jobIds) {
    try {
      const job = await Job.findById(id);

      if (!job) {
        console.log(`✗ Job ${id} — Not found`);
        continue;
      }

      if (!job.ceoContact?.ceoEmail) {
        console.log(`✗ ${job.company.name} — No CEO email found`);
        continue;
      }

      console.log(`Sending to: ${job.ceoContact.ceoName} (${job.ceoContact.ceoEmail}) at ${job.company.name}...`);

      const result = await emailSenderService.sendCEOEmail(
        job,
        job.ceoContact.ceoEmail,
        job.ceoContact.ceoName
      );

      job.emailSent = true;
      job.emailSentAt = new Date();
      await job.save();

      console.log(`  ✓ Email sent! Log ID: ${result.logId}\n`);
    } catch (error) {
      console.log(`  ✗ Failed for ${id}: ${error.message}\n`);
    }
  }

  console.log('Done!');
  await mongoose.disconnect();
}

sendEmails().catch(console.error);
