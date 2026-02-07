const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplate');

/**
 * GET /api/email-templates
 * Get all email templates
 */
router.get('/', async (req, res) => {
  try {
    const { sector, active } = req.query;

    const filter = {};
    if (sector) filter.sector = sector;
    if (active !== undefined) filter.active = active === 'true';

    const templates = await EmailTemplate.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/email-templates/:id
 * Get a specific template
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/email-templates
 * Create a new email template
 */
router.post('/', async (req, res) => {
  try {
    const template = new EmailTemplate(req.body);
    const saved = await template.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/email-templates/:id
 * Update a template
 */
router.put('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/email-templates/:id
 * Delete a template
 */
router.delete('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.status(200).json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/email-templates/:id/clone
 * Clone a template
 */
router.post('/:id/clone', async (req, res) => {
  try {
    const original = await EmailTemplate.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const cloned = new EmailTemplate({
      ...original.toObject(),
      _id: undefined,
      name: original.name + ' (Copy)',
      version: (original.version || 0) + 1
    });

    const saved = await cloned.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
