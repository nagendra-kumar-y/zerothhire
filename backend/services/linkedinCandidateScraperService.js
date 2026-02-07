/**
 * LinkedIn Candidate Scraper Service
 * Searches LinkedIn for engineering talent suitable for founding engineer roles
 * Stores candidates in MongoDB Candidate collection
 */

const puppeteer = require('puppeteer');
const Candidate = require('../models/Candidate');

class LinkedinCandidateScraperService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.candidateTitles = [
      'Engineering Manager',
      'CTO',
      'VP Engineering',
      'Principal Engineer',
      'Founding Engineer',
      'Senior Software Engineer'
    ];
  }

  /**
   * Helper: Sleep for specified milliseconds (compatible with newer Puppeteer)
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  /**
   * Initialize browser and page
   */
  async initBrowser() {
    try {
      this.browser = await puppeteer.launch({
        protocolTimeout: 120000,
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1365, height: 768 });
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );
      await this.page.setExtraHTTPHeaders({
        'accept-language': 'en-US,en;q=0.9'
      });
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(60000);

      const liAt = process.env.LI_AT;
      if (liAt) {
        await this.page.setCookie(
          {
            name: 'li_at',
            value: liAt,
            url: 'https://www.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax'
          },
          {
            name: 'li_at',
            value: liAt,
            url: 'https://linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax'
          }
        );
        try {
          await this.page.goto('https://www.linkedin.com/feed/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          const loginDetected = await this.page.evaluate(() => {
            return Boolean(
              document.querySelector('input[name="session_key"]') ||
              document.querySelector('form[action*="login"]')
            );
          });
          if (loginDetected) {
            console.log('[LinkedIn Scraper] Login check failed. LI_AT may be invalid or expired.');
          }
        } catch (navError) {
          console.log('[LinkedIn Scraper] Login session check warning:', navError.message);
        }
      } else {
        console.log('[LinkedIn Scraper] LI_AT cookie not set. Set LI_AT in your .env to authenticate.');
      }
      console.log('[LinkedIn Scraper] Browser initialized');
    } catch (error) {
      console.error('[LinkedIn Scraper] Browser init error:', error.message);
      throw error;
    }
  }

  /**
   * Search for candidates by title and location
   */
  async searchCandidates(title, location = 'Bangalore', limit = 50) {
    try {
      if (!this.browser) {
        await this.initBrowser();
      }

      const encodedTitle = encodeURIComponent(title);
      const encodedLocation = encodeURIComponent(location);
      
      // Build LinkedIn search URL - search for people
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodedTitle}%20${encodedLocation}`;

      console.log(`[LinkedIn Scraper] Searching for "${title}" in "${location}"`);
      console.log(`[LinkedIn Scraper] URL: ${searchUrl}`);

      // Try to navigate to search page
      try {
        await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (navigationError) {
        console.log('[LinkedIn Scraper] Navigation warning:', navigationError.message);
        // Continue anyway - page might have partially loaded
      }

      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('authwall') || currentUrl.includes('checkpoint')) {
        console.log('[LinkedIn Scraper] Redirected to login/checkpoint. Authentication required.');
        return [];
      }

      // Wait for search results to load
      try {
        await this.page.waitForSelector(
          'ul.reusable-search__entity-result-list, li.reusable-search__result-container, .search-results-container',
          { timeout: 8000 }
        );
      } catch (waitError) {
        console.log('[LinkedIn Scraper] Results wait warning:', waitError.message);
      }
      await this.sleep(1000);

      const authWall = await this.page.evaluate(() => {
        const authSelectors = [
          'form[action*="login"]',
          '.authwall-sign-in-form',
          '#authwall',
          'input[name="session_key"]'
        ];
        return authSelectors.some(selector => document.querySelector(selector));
      });

      if (authWall) {
        console.log('[LinkedIn Scraper] LinkedIn auth wall detected. Sign-in is required for results.');
        return [];
      }

      // Extract candidate profiles from search results
      const candidates = await this.page.evaluate(() => {
        const results = [];
        const searchResults = document.querySelectorAll(
          'li.reusable-search__result-container, .search-results-container li, [data-test-id="search-entity-result-item"]'
        );

        if (searchResults.length === 0) {
          console.log('No search results found');
          return results;
        }

        const getText = (root, selectors) => {
          for (const selector of selectors) {
            const el = root.querySelector(selector);
            if (el && el.textContent) {
              const text = el.textContent.trim();
              if (text) return text;
            }
          }
          return '';
        };

        const getLink = (root, selectors) => {
          for (const selector of selectors) {
            const el = root.querySelector(selector);
            const href = el?.getAttribute('href');
            if (href && href.includes('/in/')) {
              return href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
            }
          }
          return '';
        };

        searchResults.forEach((result) => {
          try {
            const name = getText(result, [
              'span[aria-hidden="true"]',
              '.entity-result__title-text span',
              '.entity-result__title-text',
              '[data-test-entity-type="PROFILE"] .entity-result-title'
            ]);

            const subtitle = getText(result, [
              '.entity-result__primary-subtitle',
              '.entity-result__primary-subtitle span',
              '[data-test-entity-type="PROFILE"] .entity-result-subtitle'
            ]);

            const linkedinUrl = getLink(result, [
              'a[href*="/in/"]',
              '[data-test-entity-type="PROFILE"] a[href*="linkedin.com"]'
            ]);

            const location = getText(result, [
              '.entity-result__secondary-subtitle',
              '.entity-result__secondary-subtitle span',
              '[data-test-entity-type="PROFILE"] .entity-result-location'
            ]);

            if (name && linkedinUrl) {
              // Parse title and company from subtitle (usually "Title at Company")
              const [jobTitle, company] = subtitle.split(' at ').map(s => s?.trim());

              results.push({
                name,
                linkedinUrl,
                title: jobTitle || '',
                currentCompany: company || '',
                location,
                subtitle
              });
            }
          } catch (err) {
            console.error('Error parsing search result:', err.message);
          }
        });

        return results;
      });

      console.log(`[LinkedIn Scraper] Found ${candidates.length} candidate profiles`);
      return candidates.slice(0, limit);
    } catch (error) {
      console.error('[LinkedIn Scraper] Search error:', error.message);
      return [];
    }
  }

  /**
   * Extract detailed profile information for a candidate
   */
  async extractCandidateProfile(linkedinUrl) {
    try {
      if (!this.browser) {
        await this.initBrowser();
      }

      console.log(`[LinkedIn Scraper] Extracting profile: ${linkedinUrl}`);

      try {
        await this.page.goto(linkedinUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (navigationError) {
        console.log('[LinkedIn Scraper] Profile navigation warning:', navigationError.message);
      }

      await this.sleep(2000);

      // Scroll to load more content
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      const profile = await this.page.evaluate(() => {
        try {
          // Extract profile data
          const nameEl = document.querySelector('h1[data-test-id="top-card-profile-headline"]');
          const name = nameEl?.textContent?.trim() || '';

          const titleEl = document.querySelector('[data-test-id="top-card-profile-current-position"]');
          const title = titleEl?.textContent?.trim() || '';

          const companyEl = document.querySelector('[data-test-id="top-card-profile-current-company"]');
          const currentCompany = companyEl?.textContent?.trim() || '';

          const locationEl = document.querySelector('[data-test-id="top-card-profile-location"]');
          const location = locationEl?.textContent?.trim() || '';

          const aboutEl = document.querySelector('section[data-test-id="about-section"] p');
          const about = aboutEl?.textContent?.trim() || '';

          // Extract skills
          const skills = [];
          const skillEls = document.querySelectorAll('[data-test-id="skill-item"]');
          skillEls.forEach(el => {
            const skillText = el.textContent?.trim();
            if (skillText) skills.push(skillText);
          });

          // Extract experience info
          const experienceEl = document.querySelector('[data-test-id="experience-section"]');
          const experience = experienceEl?.textContent?.trim() || '';

          return { name, title, currentCompany, location, about, skills, experience };
        } catch (error) {
          console.error('Profile extraction error:', error.message);
          return {};
        }
      });

      return profile;
    } catch (error) {
      console.error('[LinkedIn Scraper] Profile extraction error:', error.message);
      return {};
    }
  }

  /**
   * Save candidate to database
   */
  async saveCandidateProfile(candidateData) {
    try {
      // Check if candidate already exists
      const existing = await Candidate.findOne({ linkedinUrl: candidateData.linkedinUrl });

      if (existing) {
        console.log(`[LinkedIn Scraper] Candidate already exists: ${candidateData.name}`);
        return existing;
      }

      // Create new candidate
      const candidate = new Candidate({
        name: candidateData.name,
        linkedinUrl: candidateData.linkedinUrl,
        linkedinId: this.extractLinkedInId(candidateData.linkedinUrl),
        title: candidateData.title || '',
        currentCompany: candidateData.currentCompany || '',
        experience: candidateData.experience || '',
        about: candidateData.about || '',
        location: candidateData.location || '',
        skills: candidateData.skills || [],
        sector: 'other',
        rating: 3,
        tags: ['founding-engineer', 'engineering-talent'],
        notes: `Extracted from LinkedIn - Suitable for founding engineer roles`
      });

      const saved = await candidate.save();
      console.log(`[LinkedIn Scraper] Saved candidate: ${saved.name}`);
      return saved;
    } catch (error) {
      console.error('[LinkedIn Scraper] Save error:', error.message);
      if (error.code === 11000) {
        // Duplicate key error
        return await Candidate.findOne({ linkedinUrl: candidateData.linkedinUrl });
      }
      return null;
    }
  }

  /**
   * Extract LinkedIn ID from URL
   */
  extractLinkedInId(url) {
    const match = url.match(/\/in\/([^/?]+)/);
    return match ? match[1] : '';
  }

  /**
   * Scrape candidates for all target titles in a location
   */
  async scrapeCandidatesForLocation(location = 'Bangalore', maxPerTitle = 20) {
    try {
      const allCandidates = [];
      const savedCandidates = [];

      if (!this.browser) {
        await this.initBrowser();
      }

      // Determine location variations to search (Bangalore/Bengaluru are same city)
      const locations = [];
      if (location.toLowerCase() === 'bangalore' || location.toLowerCase() === 'bengaluru') {
        locations.push('Bangalore', 'Bengaluru');
      } else {
        locations.push(location);
      }

      console.log(`[LinkedIn Scraper] Will search in locations: ${locations.join(', ')}`);

      for (const title of this.candidateTitles) {
        for (const loc of locations) {
          console.log(`\n[LinkedIn Scraper] Searching for "${title}" in ${loc}...`);

          try {
            const candidates = await this.searchCandidates(title, loc, maxPerTitle);

            for (const candidate of candidates) {
              // Check if candidate already exists (by LinkedIn URL)
              const exists = savedCandidates.some(c => c.linkedinUrl === candidate.linkedinUrl);
              if (exists) {
                console.log(`[LinkedIn Scraper] Skipping duplicate: ${candidate.name}`);
                continue;
              }

              // Extract detailed profile
              const profile = await this.extractCandidateProfile(candidate.linkedinUrl);
              const fullCandidate = { ...candidate, ...profile };

              // Save to database
              const saved = await this.saveCandidateProfile(fullCandidate);
              if (saved) {
                savedCandidates.push(saved);
              }

              allCandidates.push(fullCandidate);

              // Be polite to LinkedIn - wait between requests
              await this.sleep(1000 + Math.random() * 2000);
            }
          } catch (error) {
            console.error(`[LinkedIn Scraper] Error processing title "${title}" in ${loc}:`, error.message);
          }

          // Wait between location searches
          await this.sleep(1000 + Math.random() * 2000);
        }

        // Wait between title searches
        await this.sleep(2000 + Math.random() * 3000);
      }

      console.log(
        `\n[LinkedIn Scraper] Scraping complete. Found: ${allCandidates.length}, Saved: ${savedCandidates.length}`
      );

      return {
        total: allCandidates.length,
        saved: savedCandidates.length,
        candidates: savedCandidates
      };
    } catch (error) {
      console.error('[LinkedIn Scraper] Scraping error:', error.message);
      return { total: 0, saved: 0, candidates: [], error: error.message };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('[LinkedIn Scraper] Browser closed');
    }
  }
}

module.exports = LinkedinCandidateScraperService;
