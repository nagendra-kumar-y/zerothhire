const puppeteer = require('puppeteer');
const Job = require('../models/Job');

class LinkedInScraperService {
  constructor() {
    this.jobSearchUrl = 'https://www.linkedin.com/jobs/search/';
    this.browser = null;
    this.requestDelay = 2000;
  }

  /**
   * Initialize and connect browser instance
   */
  async initBrowser() {
    if (this.browser) {
      try {
        // Test if browser is still connected
        await this.browser.version();
        return;
      } catch (error) {
        console.log('⚠️ Browser disconnected, relaunching...');
        this.browser = null;
      }
    }
    
    try {
      console.log('🌐 Launching browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-web-resources',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      console.log('✓ Browser launched successfully');
    } catch (error) {
      console.error('Error launching browser:', error);
      throw error;
    }
  }

  /**
   * Close browser instance safely
   */
  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.warn('⚠️ Error closing browser:', error.message);
      } finally {
        this.browser = null;
        console.log('✓ Browser closed');
      }
    }
  }

  /**
   * Scrape LinkedIn jobs based on title and location
   * @param {string} jobTitle - Job title to search for (e.g., 'Founding Engineer')
   * @param {string} location - Location to search in (e.g., 'Bangalore')
   * @param {number} maxPages - Maximum pages to scrape (default: 2)
   * @returns {Promise<Array>} Array of job objects
   */
  async scrapeJobs(jobTitle, location, maxPages = 2) {
    let page = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`\n🔄 Scraping attempt ${attempts}/${maxAttempts}...`);
      
      try {
        await this.initBrowser();
        
        // Create new page
        page = await this.browser.newPage();

        // Set user agent and viewport
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1920, height: 1080 });

        // Disable images to speed up loading
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
            request.abort();
          } else {
            request.continue();
          }
        });

        const searchKeywords = 'Founder OR "Founding Engineer"';
        console.log(`🔍 Searching for "${searchKeywords}" jobs in "${location}"`);

        // Build search URL
        const searchUrl = `${this.jobSearchUrl}?keywords=${encodeURIComponent(searchKeywords)}&location=${encodeURIComponent(location)}&geoId=102713980&sortBy=DD`;

        console.log(`🌐 Navigating to LinkedIn... ${searchUrl}`);
        
        // Navigate with better error handling
        await Promise.race([
          page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 }),
          this._delay(45000)
        ]);

        // Wait for page to be fully loaded
        await this._delay(3000);

        console.log('⏳ Waiting for job listings to load...');
        
        // Wait for job listings with fallback
        try {
          await page.waitForSelector('[data-job-id]', { timeout: 15000 });
        } catch (error) {
          console.warn('⚠️ Job selector timeout - may still have jobs loaded');
        }

        // Wait a bit more to ensure jobs are rendered
        await this._delay(2000);

        const allJobs = [];

        // Scrape multiple pages
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          console.log(`\n📄 Scraping page ${pageNum}...`);

          try {
            // Scroll down to trigger lazy loading
            await page.evaluate(() => {
              window.scrollBy(0, window.innerHeight * 2);
            });

            // Wait for content to load
            await this._delay(2000);

            // Extract jobs from current page
            const jobData = await page.evaluate(() => {
              // Try multiple selector strategies
              const selectors = [
                '[data-job-id]',
                '.job-card-container',
                '.jobs-search__results-list li',
                '.scaffold-layout__list-item',
                'ul.jobs-search__results-list > li'
              ];

              let jobCards = [];
              let usedSelector = '';

              // Try each selector until we find jobs
              for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                  jobCards = elements;
                  usedSelector = selector;
                  break;
                }
              }

              const extractedJobs = [];
              const debugInfo = [];

              jobCards.forEach((card, index) => {
                try {
                  // Try to get job ID from multiple attributes
                  const jobId = card.getAttribute('data-job-id') || 
                                card.getAttribute('data-occludable-job-id') ||
                                card.id ||
                                `job-${index}`;

                  // Try multiple title selectors
                  const titleElement = card.querySelector('h3 a') || 
                                      card.querySelector('.job-card-list__title') ||
                                      card.querySelector('a.job-card-container__link') ||
                                      card.querySelector('[class*="job-title"]') ||
                                      card.querySelector('a[href*="/jobs/view"]');

                  // Try multiple company selectors
                  const companyElement = card.querySelector('.base-search-card__subtitle a') ||
                                        card.querySelector('.job-card-container__company-name') ||
                                        card.querySelector('[class*="company-name"]') ||
                                        card.querySelector('h4') ||
                                        card.querySelector('a[href*="/company/"]');

                  // Try multiple location selectors
                  const locationElement = card.querySelector('.job-search-card__location') ||
                                         card.querySelector('.job-card-container__metadata-item') ||
                                         card.querySelector('[class*="location"]') ||
                                         card.querySelector('span.job-card-container__metadata-wrapper span');

                  // Get link element
                  const linkElement = card.querySelector('a[href*="/jobs/view"]') ||
                                     card.querySelector('h3 a') ||
                                     card.querySelector('a');

                  if (titleElement && companyElement) {
                    const job = {
                      linkedinJobId: jobId,
                      title: titleElement.textContent.trim(),
                      company: {
                        name: companyElement.textContent.trim(),
                        linkedinUrl: companyElement.href || null
                      },
                      location: locationElement?.textContent.trim() || 'Bangalore, India',
                      linkedinUrl: linkElement?.href || null
                      // postedAt will be added in Node.js context
                    };

                    extractedJobs.push(job);
                    debugInfo.push(`✓ Job ${index + 1}: ${job.title} at ${job.company.name}`);
                  } else {
                    debugInfo.push(`✗ Card ${index + 1}: title=${!!titleElement}, company=${!!companyElement}`);
                  }
                } catch (error) {
                  debugInfo.push(`✗ Error on card ${index}: ${error.message}`);
                }
              });

              return {
                jobs: extractedJobs,
                selector: usedSelector,
                totalCards: jobCards.length,
                debugInfo
              };
            });

            let jobs = jobData.jobs;

            // Add postedAt timestamp in Node.js context (not browser context)
            jobs.forEach(job => {
              job.postedAt = new Date();
            });

            // Log all job cards before filtering
            if (jobs.length > 0) {
              console.log('   All job cards (title | company | location):');
              jobs.forEach((job, idx) => {
                console.log(`     ${idx + 1}. ${job.title} | ${job.company?.name || 'N/A'} | ${job.location || 'N/A'}`);
              });
            }

            // Filter for Founder/Founding Engineer roles in Bangalore/Bengaluru
            const beforeFilterCount = jobs.length;
            jobs = jobs.filter(job => {
              const title = (job.title || '').trim();
              const location = (job.location || '').trim().toLowerCase();
              const hasFoundingEngineer = /\bfounding\s+engineer\b/i.test(title);
              const hasFounderRole = /\bfounder\b|\bfounder's\s+office\b|\bfounders\s+office\b/i.test(title);
              const isBangalore = location.includes('bangalore') || location.includes('bengaluru');
              return (hasFoundingEngineer || hasFounderRole) && isBangalore;
            });
            
            console.log(`   Used selector: ${jobData.selector}`);
            console.log(`   Found ${jobData.totalCards} potential cards`);
            console.log(`   Extracted ${jobs.length} valid jobs`);
            if (beforeFilterCount !== jobs.length) {
              console.log(`   Filtered to ${jobs.length}/${beforeFilterCount} (exact title + Bangalore only)`);
            }
            
            // Show debug info
            if (jobData.debugInfo.length > 0) {
              console.log('   Debug details:');
              jobData.debugInfo.slice(0, 5).forEach(info => console.log(`     ${info}`));
              if (jobData.debugInfo.length > 5) {
                console.log(`     ... and ${jobData.debugInfo.length - 5} more`);
              }
            }

            if (jobs.length > 0) {
              console.log(`✓ Found ${jobs.length} jobs on page ${pageNum}`);
              allJobs.push(...jobs);
            } else {
              console.log(`ℹ️ No jobs found on page ${pageNum}`);
            }

            // Check if there's a next page button
            if (pageNum < maxPages) {
              const hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('button[aria-label="View next page"]');
                return !!nextButton && !nextButton.disabled;
              });

              if (hasNextPage) {
                console.log('⏭️ Moving to next page...');
                await page.click('button[aria-label="View next page"]');
                await this._delay(this.requestDelay);
              } else {
                console.log('ℹ️ No more pages available');
                break;
              }
            }
          } catch (pageError) {
            console.error(`⚠️ Error scraping page ${pageNum}:`, pageError.message);
            // Continue to next page instead of failing completely
          }
        }

        console.log(`\n✓ Scraping complete. Total jobs found: ${allJobs.length}`);
        
        // Success - return jobs and close page
        if (page && !page.isClosed()) {
          await page.close().catch(() => {});
        }
        
        return allJobs;

      } catch (error) {
        console.error(`❌ Scraping attempt ${attempts} failed:`, error.message);
        
        // Close page if still open
        if (page && !page.isClosed?.()) {
          try {
            await page.close();
          } catch (e) {
            // Ignore close errors
          }
        }

        // Close browser to reset on next attempt
        if (attempts < maxAttempts) {
          try {
            await this.closeBrowser();
          } catch (e) {
            this.browser = null; // Force reset
          }
          
          console.log(`⏳ Waiting 5 seconds before retry...`);
          await this._delay(5000);
        } else {
          console.error('❌ All retry attempts failed');
          throw error;
        }
      }
    }
  }

  /**
   * Get detailed job information
   */
  async getJobDetails(jobUrl) {
    let page = null;
    try {
      await this.initBrowser();
      page = await this.browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const jobDetails = await page.evaluate(() => {
        return {
          title: document.querySelector('h1')?.textContent?.trim() || null,
          company: document.querySelector('.topcard__company-name')?.textContent?.trim() || null,
          description: document.querySelector('.show-more-less-html__markup')?.textContent?.trim() || null,
          applicants: document.querySelector('.description__job-criteria-item')?.textContent?.trim() || null
        };
      });

      return jobDetails;
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Delay helper function
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Save scraped jobs to database
   */
  async saveJobs(jobs) {
    const savedJobs = [];

    for (const job of jobs) {
      try {
        // Check by linkedinJobId first, then by title + company
        let existingJob = await Job.findOne({ linkedinJobId: job.linkedinJobId });

        if (!existingJob && job.title && job.company?.name) {
          existingJob = await Job.findOne({
            title: { $regex: new RegExp(`^${job.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            'company.name': { $regex: new RegExp(`^${job.company.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          });
        }

        if (!existingJob) {
          const newJob = new Job(job);
          const saved = await newJob.save();
          savedJobs.push(saved);
        }
      } catch (error) {
        console.error('Error saving job:', error);
      }
    }

    return savedJobs;
  }

  /**
   * Mark job as processed
   */
  async markJobAsProcessed(jobId) {
    return Job.findByIdAndUpdate(
      jobId,
      { processed: true },
      { new: true }
    );
  }
}

module.exports = new LinkedInScraperService();
