const express = require('express');
const router = express.Router();
const automationService = require('../services/automationService');

/**
 * GET /api/automation/status
 * Get automation status
 */
router.get('/status', async (req, res) => {
  try {
    const status = automationService.getStatus();
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/automation/start
 * Start the automation scheduler
 */
router.post('/start', async (req, res) => {
  try {
    const { cronSchedule = '*/30 * * * *' } = req.body;
    automationService.startAutomation(cronSchedule);
    
    res.status(200).json({
      success: true,
      message: 'Automation started',
      status: automationService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/automation/stop
 * Stop the automation scheduler
 */
router.post('/stop', async (req, res) => {
  try {
    automationService.stopAutomation();
    
    res.status(200).json({
      success: true,
      message: 'Automation stopped',
      status: automationService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/automation/trigger
 * Manually trigger job scraping
 */
router.post('/trigger', async (req, res) => {
  try {
    await automationService.triggerJobScrape();
    
    res.status(200).json({
      success: true,
      message: 'Job scraping triggered'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/automation/process-job/:jobId
 * Process a specific job
 */
router.post('/process-job/:jobId', async (req, res) => {
  try {
    await automationService.processJobManually(req.params.jobId);
    
    res.status(200).json({
      success: true,
      message: 'Job processed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/automation/stats
 * Get automation statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await automationService.getStatistics();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
