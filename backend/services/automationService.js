const cron = require('node-cron');
const Job = require('../models/Job');
const linkedinScraperService = require('./linkedinScraperService');
const ceoFinderService = require('./ceoFinderService');
const emailFinderService = require('./emailFinderService');
const emailSenderService = require('./emailSenderService');

class AutomationService {
  constructor() {
    this.isRunning = false;
    this.jobs = {};
    this.sendEmails = process.env.SEND_EMAILS === 'true'; // Email sending flag (default: false for testing)
  }

  /**
   * Start the automation scheduler
   * Runs every 30 minutes by default
   */
  startAutomation(cronSchedule = '*/30 * * * *') {
    if (this.isRunning) {
      console.log('Automation is already running');
      return;
    }

    try {
      this.jobs.linkedinScraper = cron.schedule(cronSchedule, async () => {
        console.log('[' + new Date().toISOString() + '] Running LinkedIn job scraper...');
        await this._runJobScraping();
      });

      console.log(`✓ LinkedIn scraper scheduled: ${cronSchedule}`);

      this.isRunning = true;
      console.log('✓ Automation service started successfully');
      
      // Display email sending status
      if (this.sendEmails) {
        console.log('📧 Email sending: ENABLED');
      } else {
        console.log('ℹ️  Email sending: DISABLED (testing mode - only verifying CEO/emails)');
      }
    } catch (error) {
      console.error('Error starting automation:', error);
      throw error;
    }
  }

  /**
   * Stop the automation scheduler
   */
  stopAutomation() {
    try {
      if (this.jobs.linkedinScraper) {
        this.jobs.linkedinScraper.stop();
      }
      this.isRunning = false;
      console.log('✓ Automation service stopped');
    } catch (error) {
      console.error('Error stopping automation:', error);
    }
  }

  /**
   * Run job scraping and processing pipeline
   */
  async _runJobScraping() {
    try {
      console.log('\n==================================================');
      console.log('🚀 Starting Job Scraping & Processing Pipeline');
      console.log('==================================================\n');

      // Step 1: Scrape jobs from LinkedIn
      console.log('📋 Step 1: Scraping jobs from LinkedIn...');
      const jobs = await linkedinScraperService.scrapeJobs(
        'Founding Engineer',
        'Bangalore'
      );
      console.log(`   ✓ Found ${jobs.length} jobs\n`);

      if (jobs.length === 0) {
        console.log('ℹ️  No new jobs found\n');
        return;
      }

      // Step 2: Save jobs to database
      console.log('💾 Step 2: Saving jobs to database...');
      const savedJobs = await linkedinScraperService.saveJobs(jobs);
      console.log(`   ✓ Saved ${savedJobs.length} new jobs\n`);

      if (savedJobs.length === 0) {
        console.log('ℹ️  All jobs already exist in database\n');
        return;
      }

      // Step 3: Process each job
      console.log('📧 Step 3: Processing jobs (finding CEOs & sending emails)...');
      console.log('==================================================\n');
      
      const stats = {
        total: savedJobs.length,
        success: 0,
        ceoNotFound: 0,
        emailNotFound: 0,
        sendFailed: 0,
        errors: 0
      };

      for (const job of savedJobs) {
        try {
          const statusBefore = job.processingStatus;
          await this._processJob(job);
          
          // Reload job to get updated status
          await job.reload();
          
          // Track statistics
          if (job.processingStatus === 'success') stats.success++;
          else if (job.processingStatus === 'ceo_not_found') stats.ceoNotFound++;
          else if (job.processingStatus === 'email_not_found') stats.emailNotFound++;
          else if (job.processingStatus === 'send_failed') stats.sendFailed++;
          
        } catch (error) {
          console.error(`❌ Error processing job ${job._id}:`, error.message);
          stats.errors++;
        }
      }

      // Print summary
      console.log('==================================================');
      console.log('📊 Pipeline Complete - Summary');
      console.log('==================================================');
      console.log(`Total jobs processed:    ${stats.total}`);
      console.log(`✅ Emails sent:          ${stats.success}`);
      console.log(`⊗  CEO not found:        ${stats.ceoNotFound}`);
      console.log(`⊗  Email not found:      ${stats.emailNotFound}`);
      console.log(`⚠️  Send failed:          ${stats.sendFailed}`);
      console.log(`❌ Errors:               ${stats.errors}`);
      console.log('==================================================\n');
      
    } catch (error) {
      console.error('❌ Error in job scraping pipeline:', error.message);
    }
  }

  /**
   * Process a single job posting
   */
  async _processJob(job) {
    try {
      console.log(`\n📝 Processing job: ${job.title} at ${job.company.name}`);

      // Step 1: Find CEO
      console.log('  → Finding CEO...');
      const ceoInfo = await ceoFinderService.findCEO(
        job.company.name
      );

      if (!ceoInfo) {
        console.log(`  ⊗ CEO not found for ${job.company.name} - Skipping to next company`);
        
        // Mark as processed to skip on next run
        job.processed = true;
        job.processingStatus = 'ceo_not_found';
        job.notes = `CEO not found on ${new Date().toISOString()}`;
        await job.save();
        
        console.log(`  → Moving to next job...\n`);
        return; // Skip to next job
      }

      job.ceoContact = {
        ceoName: ceoInfo.name,
        ceoLinkedInUrl: ceoInfo.linkedinUrl,
        emailSource: ceoInfo.source
      };

      console.log(`  ✓ Found CEO: ${ceoInfo.name}`);

      // Step 2: Find CEO email (may already be in ceoInfo from Hunter/RocketReach)
      console.log('  → Finding CEO email...');
      const emailInfo = await emailFinderService.findEmail(
        ceoInfo.name,
        job.company.name,
        ceoInfo  // Pass full CEO info (may already contain email)
      );

      if (!emailInfo) {
        console.log(`  ⊗ Email not found for ${ceoInfo.name} - Skipping to next company`);
        
        // Mark as processed to skip on next run
        job.processed = true;
        job.processingStatus = 'email_not_found';
        job.notes = `Email not found for CEO ${ceoInfo.name} on ${new Date().toISOString()}`;
        await job.save();
        
        console.log(`  → Moving to next job...\n`);
        return; // Skip to next job
      }

      job.ceoContact.ceoEmail = emailInfo.email;
      job.ceoContact.emailSource = emailInfo.source;

      console.log(`  ✓ Found email: ${emailInfo.email}`);

      // Step 3: Send email (optional - controlled by SEND_EMAILS flag)
      if (this.sendEmails) {
        console.log('  → Sending outreach email...');
        const sendResult = await emailSenderService.sendCEOEmail(
          job,
          emailInfo.email,
          ceoInfo.name
        );

        if (sendResult.success) {
          job.emailSent = true;
          job.emailSentAt = new Date();
          job.processed = true;
          job.processingStatus = 'success';
          job.notes = `Email sent successfully on ${new Date().toISOString()}`;
          await job.save();
          console.log(`  ✓ Email sent successfully to ${ceoInfo.name}`);
        } else {
          console.log(`  ⊗ Failed to send email - Marking as processed`);
          job.processed = true;
          job.processingStatus = 'send_failed';
          job.notes = `Email send failed: ${sendResult.error || 'Unknown error'}`;
          await job.save();
        }
      } else {
        // Email sending disabled - just save CEO and email info
        job.processed = true;
        job.processingStatus = 'success';
        job.notes = `CEO and email verified on ${new Date().toISOString()} - Email sending disabled (SEND_EMAILS=false)`;
        await job.save();
        console.log(`  ℹ️  Email sending disabled - CEO and email saved to database`);
      }
      
      console.log(`  ✅ Completed processing for ${job.company.name}\n`);
      
    } catch (error) {
      console.error(`  ❌ Error processing job ${job._id}:`, error.message);
      
      // Mark as processed with error to avoid retrying indefinitely
      try {
        job.processed = true;
        job.processingStatus = 'send_failed';
        job.notes = `Processing error: ${error.message}`;
        await job.save();
      } catch (saveError) {
        console.error(`  Failed to save error status:`, saveError.message);
      }
      
      console.log(`  → Moving to next job...\n`);
    }
  }

  /**
   * Manually trigger a job scrape
   */
  async triggerJobScrape() {
    if (this.isRunning) {
      console.log('Triggering immediate job scrape...');
      await this._runJobScraping();
    } else {
      console.log('Automation is not running. Start it first.');
    }
  }

  /**
   * Manually process a specific job
   */
  async processJobManually(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }
      await this._processJob(job);
    } catch (error) {
      console.error('Error processing job manually:', error);
      throw error;
    }
  }

  /**
   * Get automation status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Object.keys(this.jobs)
    };
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const totalJobs = await Job.countDocuments();
      const processedJobs = await Job.countDocuments({ processed: true });
      const emailsSent = await Job.countDocuments({ emailSent: true });
      const responses = await Job.countDocuments({
        'response.status': { $ne: null }
      });

      return {
        totalJobs,
        processedJobs,
        emailsSent,
        responses,
        successRate: totalJobs > 0 ? ((processedJobs / totalJobs) * 100).toFixed(2) + '%' : '0%',
        responseRate: emailsSent > 0 ? ((responses / emailsSent) * 100).toFixed(2) + '%' : '0%'
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }
}

module.exports = new AutomationService();
