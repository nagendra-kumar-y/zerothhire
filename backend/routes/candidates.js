const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const LinkedinCandidateScraperService = require('../services/linkedinCandidateScraperService');

/**
 * POST /api/candidates/founding-engineers/scrape
 * Scrape LinkedIn for candidates suitable for founding engineer roles
 */
router.post('/founding-engineers/scrape', async (req, res) => {
  try {
    const { location = 'Bangalore', maxPerTitle = 20 } = req.body;

    const scraper = new LinkedinCandidateScraperService();

    // Run scraping
    const result = await scraper.scrapeCandidatesForLocation(location, maxPerTitle);

    res.status(200).json({
      success: true,
      data: {
        message: 'Scraping completed',
        location,
        totalFound: result.total,
        totalSaved: result.saved,
        candidates: result.candidates.map(c => ({
          _id: c._id,
          name: c.name,
          title: c.title,
          currentCompany: c.currentCompany,
          location: c.location,
          linkedinUrl: c.linkedinUrl,
          skills: c.skills
        }))
      }
    });
  } catch (error) {
    console.error('[API] Scraping error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/candidates/founding-engineers
 * Get candidates suitable for founding engineer roles (from LinkedIn scraping)
 */
router.get('/founding-engineers', async (req, res) => {
  try {
    const { page = 1, limit = 20, company, skills } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      tags: 'founding-engineer',
      title: { $in: ['Senior Engineer', 'Tech Lead', 'Engineering Manager', 'CTO', 'VP Engineering', 'Full Stack Engineer', 'Backend Engineer', 'Principal Engineer', 'Founding Engineer'] }
    };

    if (company) {
      filter.currentCompany = { $regex: company, $options: 'i' };
    }

    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim());
      filter.skills = { $in: skillArray };
    }

    const candidates = await Candidate.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Candidate.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: candidates,
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
 * GET /api/candidates/founding-engineers/stats
 * Get statistics on founding engineer candidates
 */
router.get('/founding-engineers/stats', async (req, res) => {
  try {
    const total = await Candidate.countDocuments({ tags: 'founding-engineer' });

    // Stats by title
    const byTitle = await Candidate.aggregate([
      { $match: { tags: 'founding-engineer' } },
      { $group: { _id: '$title', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Stats by company
    const byCompany = await Candidate.aggregate([
      { $match: { tags: 'founding-engineer' } },
      { $group: { _id: '$currentCompany', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Top skills
    const topSkills = await Candidate.aggregate([
      { $match: { tags: 'founding-engineer' } },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        byTitle,
        byCompany,
        topSkills
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/candidates/founding-engineers/export
 * Export founding engineer candidates as CSV or JSON
 */
router.get('/founding-engineers/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const candidates = await Candidate.find({ tags: 'founding-engineer' })
      .select('name title currentCompany location skills email linkedinUrl createdAt')
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['name', 'title', 'currentCompany', 'location', 'skills', 'email', 'linkedinUrl'];
      const csv = [
        headers.join(','),
        ...candidates.map(c =>
          [
            c.name,
            c.title,
            c.currentCompany,
            c.location,
            (c.skills || []).join(';'),
            c.email || '',
            c.linkedinUrl || ''
          ]
            .map(field => `"${field}"`)
            .join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="founding-engineer-candidates.csv"');
      res.send(csv);
    } else {
      // JSON format
      res.status(200).json({
        success: true,
        data: {
          totalCandidates: candidates.length,
          candidates
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/candidates
 * Get all candidates with filters
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sector, search, minRating = 1 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { rating: { $gte: minRating } };
    if (sector) filter.sector = sector;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } },
        { currentCompany: { $regex: search, $options: 'i' } }
      ];
    }

    const candidates = await Candidate.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1, yearsOfExperience: -1 });

    const total = await Candidate.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: candidates,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/candidates/curated/list
 * Get top-rated candidates (curated list)
 */
router.get('/curated/list', async (req, res) => {
  try {
    const { sector, limit = 10 } = req.query;

    const filter = { rating: { $gte: 4 } };
    if (sector) filter.sector = sector;

    const candidates = await Candidate.find(filter)
      .sort({ rating: -1, yearsOfExperience: -1 })
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/candidates/bulk/create
 * Add candidates in bulk
 */
router.post('/bulk/create', async (req, res) => {
  try {
    const { candidates } = req.body;
    
    if (!Array.isArray(candidates)) {
      return res.status(400).json({ success: false, message: 'Candidates must be an array' });
    }

    const saved = await Candidate.insertMany(candidates);
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/candidates/:id
 * Get a specific candidate
 */
router.get('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }
    res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/candidates
 * Create a new candidate
 */
router.post('/', async (req, res) => {
  try {
    const candidate = new Candidate(req.body);
    const saved = await candidate.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/candidates/:id
 * Update a candidate
 */
router.put('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }
    res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/candidates/:id
 * Delete a candidate
 */
router.delete('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }
    res.status(200).json({ success: true, message: 'Candidate deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
