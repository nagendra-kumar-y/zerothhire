const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const automationService = require('../services/automationService');
const emailSenderService = require('../services/emailSenderService');

/**
 * GET /api/jobs
 * Get all jobs with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, processed, emailSent, location, processingStatus } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (processed !== undefined) filter.processed = processed === 'true';
    if (emailSent !== undefined) filter.emailSent = emailSent === 'true';
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (processingStatus) filter.processingStatus = processingStatus;

    const jobs = await Job.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ postedAt: -1 });

    const total = await Job.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/jobs/stats/summary
 * Get job processing statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = {
      total: await Job.countDocuments(),
      processed: await Job.countDocuments({ processed: true }),
      unprocessed: await Job.countDocuments({ processed: false }),
      emailSent: await Job.countDocuments({ emailSent: true }),
      byStatus: {
        pending: await Job.countDocuments({ processingStatus: 'pending' }),
        success: await Job.countDocuments({ processingStatus: 'success' }),
        ceoNotFound: await Job.countDocuments({ processingStatus: 'ceo_not_found' }),
        emailNotFound: await Job.countDocuments({ processingStatus: 'email_not_found' }),
        sendFailed: await Job.countDocuments({ processingStatus: 'send_failed' })
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/jobs/process
 * Process unprocessed jobs to find CEO and verify emails
 * Query params:
 *   - limit: Number of jobs to process (default: 10, max: 50)
 */
router.post('/process', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    // Get unprocessed jobs
    const unprocessedJobs = await Job.find({ processed: false }).limit(limit);
    
    if (unprocessedJobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No unprocessed jobs found',
        data: {
          processed: 0,
          results: []
        }
      });
    }

    // Process each job
    const results = [];
    const stats = {
      total: unprocessedJobs.length,
      success: 0,
      ceoNotFound: 0,
      emailNotFound: 0,
      errors: 0
    };

    for (const job of unprocessedJobs) {
      try {
        await automationService._processJob(job);
        
        // Reload job to get updated status
        const updated = await Job.findById(job._id);
        
        results.push({
          jobId: updated._id,
          title: updated.title,
          company: updated.company.name,
          status: updated.processingStatus,
          ceoName: updated.ceoContact?.ceoName || null,
          ceoEmail: updated.ceoContact?.ceoEmail || null,
          emailSource: updated.ceoContact?.emailSource || null
        });

        // Update stats
        if (updated.processingStatus === 'success') stats.success++;
        else if (updated.processingStatus === 'ceo_not_found') stats.ceoNotFound++;
        else if (updated.processingStatus === 'email_not_found') stats.emailNotFound++;
        
      } catch (error) {
        stats.errors++;
        results.push({
          jobId: job._id,
          title: job.title,
          company: job.company.name,
          status: 'error',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${stats.total} jobs`,
      data: {
        stats,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/jobs/:id/process
 * Process a specific job to find CEO and verify email
 */
router.post('/:id/process', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    if (job.processed) {
      return res.status(400).json({
        success: false,
        message: 'Job already processed',
        data: {
          jobId: job._id,
          status: job.processingStatus,
          ceoName: job.ceoContact?.ceoName,
          ceoEmail: job.ceoContact?.ceoEmail
        }
      });
    }

    // Process the job
    await automationService._processJob(job);
    
    // Reload to get updated data
    const updated = await Job.findById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Job processed successfully',
      data: {
        jobId: updated._id,
        title: updated.title,
        company: updated.company.name,
        status: updated.processingStatus,
        ceoName: updated.ceoContact?.ceoName || null,
        ceoEmail: updated.ceoContact?.ceoEmail || null,
        emailSource: updated.ceoContact?.emailSource || null,
        emailSent: updated.emailSent,
        notes: updated.notes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/jobs
 * Create a new job (manual entry)
 */
router.post('/', async (req, res) => {
  try {
    const job = new Job(req.body);
    const saved = await job.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/jobs/unprocessed/list
 * Get unprocessed jobs
 */
router.get('/unprocessed/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const jobs = await Job.find({ processed: false })
      .limit(limit)
      .select('title company location linkedinUrl postedAt')
      .sort({ postedAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      count: jobs.length,
      data: jobs 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/jobs/verified/list
 * Get jobs with verified CEO and email
 */
router.get('/verified/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const jobs = await Job.find({ 
      'ceoContact.ceoEmail': { $exists: true, $ne: null },
      processingStatus: 'success'
    })
      .limit(limit)
      .select('title company ceoContact emailSent notes')
      .sort({ updatedAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      count: jobs.length,
      data: jobs 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/jobs/:id
 * Get a specific job
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/jobs/:id
 * Update a job
 */
router.put('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete a job
 */
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/jobs/:id/mark-processed
 * Mark a job as processed
 */
router.post('/:id/mark-processed', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { processed: true },
      { new: true }
    );
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/jobs/:id/send-email
 * Send curated candidate list email to a specific job's founder
 * Only sends to processed jobs with CEO/founder email present
 */
router.post('/:id/send-email', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    if (job.processingStatus !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Job not processed. Only processed jobs (status: success) can receive emails.',
        currentStatus: job.processingStatus
      });
    }

    if (!job.ceoContact?.ceoEmail) {
      return res.status(400).json({
        success: false,
        message: 'CEO email not found. Please process the job first to find CEO contact.'
      });
    }

    const { templateId } = req.body;

    // Send email with curated candidates
    const result = await emailSenderService.sendCEOEmail(
      job,
      job.ceoContact.ceoEmail,
      job.ceoContact.ceoName,
      templateId
    );

    // Mark job as emailSent in database
    job.emailSent = true;
    job.emailSentAt = new Date();
    await job.save();

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: {
        jobId: job._id,
        company: job.company.name,
        ceoEmail: job.ceoContact.ceoEmail,
        ceoName: job.ceoContact.ceoName,
        emailLogId: result.logId,
        messageId: result.messageId
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * POST /api/jobs/send-batch
 * Send emails to multiple selective job founders
 * Only sends to processed jobs with CEO/founder email present
 * 
 * Request body:
 *   - jobIds: Array of job IDs to send emails to (optional, if not provided uses filters)
 *   - filter: Filter criteria (optional)
 *     - location: Location filter (e.g., "Bangalore")
 *     - sector: Job sector filter
 *     - limit: Max number of emails to send (default: 10, max: 50)
 *   - templateId: Email template ID (optional)
 * 
 * Example: POST /api/jobs/send-batch
 * { 
 *   "filter": { "location": "Bangalore", "limit": 5 },
 *   "templateId": "template-id-here"
 * }
 */
router.post('/send-batch', async (req, res) => {
  try {
    const { jobIds, filter = {}, templateId } = req.body;

    let jobs = [];

    if (jobIds && Array.isArray(jobIds)) {
      // Send to specific jobs (only processed with CEO email)
      jobs = await Job.find({ 
        _id: { $in: jobIds },
        'ceoContact.ceoEmail': { $exists: true, $ne: null },
        processingStatus: 'success'
      });
    } else {
      // Send to jobs matching filter (only processed with CEO email)
      const queryFilter = {
        'ceoContact.ceoEmail': { $exists: true, $ne: null },
        processingStatus: 'success',
        emailSent: { $ne: true }
      };

      if (filter.location) {
        queryFilter.location = { $regex: filter.location, $options: 'i' };
      }

      const limit = Math.min(filter.limit || 10, 50);
      jobs = await Job.find(queryFilter).limit(limit);
    }

    if (jobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No jobs found matching criteria',
        data: {
          processed: 0,
          results: []
        }
      });
    }

    // Send emails
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const job of jobs) {
      try {
        const result = await emailSenderService.sendCEOEmail(
          job,
          job.ceoContact.ceoEmail,
          job.ceoContact.ceoName,
          templateId
        );

        // Mark job as emailSent
        await Job.findByIdAndUpdate(
          job._id,
          { 
            emailSent: true,
            emailSentAt: new Date()
          }
        );

        results.push({
          jobId: job._id,
          company: job.company.name,
          ceoEmail: job.ceoContact.ceoEmail,
          status: 'sent',
          messageId: result.messageId,
          logId: result.logId
        });

        successCount++;

        // Delay between emails to avoid rate limiting
        await new Promise(resolve => 
          setTimeout(resolve, parseInt(process.env.EMAIL_SEND_DELAY) || 1000)
        );

      } catch (error) {
        failureCount++;
        results.push({
          jobId: job._id,
          company: job.company.name,
          ceoEmail: job.ceoContact.ceoEmail,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Sent ${successCount} emails, ${failureCount} failed`,
      data: {
        processed: jobs.length,
        successCount,
        failureCount,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
