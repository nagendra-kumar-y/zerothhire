const axios = require('axios');

class CEOFinderService {
  constructor() {
    this.hunterApiKey = process.env.HUNTER_API_KEY;
    this.rocketReachApiKey = process.env.ROCKETREACH_API_KEY;
    this.rocketReachUsed = false; // Track usage to limit to 1 call
  }

  /**
   * Find a senior contact (CEO/Co-Founder/C-level) at a company
   * @param {string} companyName - Name of the company
   * @returns {Promise<Object>} Contact information
   */
  async findCEO(companyName) {
    try {
      console.log(`🔍 Finding senior contact for: ${companyName}`);
      
      // Try Hunter.io first (get domain then find senior contact)
      if (this.hunterApiKey) {
        const ceoInfo = await this._findCEOViaHunter(companyName);
        if (ceoInfo) {
          console.log(`   ✓ Found contact via Hunter.io: ${ceoInfo.name} (${ceoInfo.position || 'Unknown title'})`);
          return ceoInfo;
        }
      }

      // Fallback to RocketReach (use only once due to rate limits)
      if (this.rocketReachApiKey && !this.rocketReachUsed) {
        console.log(`   Trying RocketReach (rate limited - using once)...`);
        const ceoInfo = await this._findCEOViaRocketReach(companyName);
        this.rocketReachUsed = true; // Mark as used
        if (ceoInfo) {
          console.log(`   ✓ Found CEO via RocketReach: ${ceoInfo.name}`);
          return ceoInfo;
        }
      }

      console.log(`   ⚠️ Could not find senior contact for ${companyName}`);
      return null;
    } catch (error) {
      console.error('Error finding CEO:', error.message);
      return null;
    }
  }

  /**
  * Find a senior contact via Hunter.io domain search API
   */
  async _findCEOViaHunter(companyName) {
    try {
      if (!this.hunterApiKey) {
        return null;
      }

      // Get company domain
      const domainResponse = await axios.get('https://api.hunter.io/v2/domain-search', {
        params: {
          company: companyName,
          api_key: this.hunterApiKey,
          limit: 10
        }
      });

      if (!domainResponse.data?.data?.emails) {
        return null;
      }

      // Find senior contact in email list
      const emails = domainResponse.data.data.emails;
      const preferredTitles = [
        'ceo',
        'chief executive',
        'co-founder',
        'cofounder',
        'founder',
        'president',
        'cto',
        'chief technology',
        'cio',
        'chief information',
        'cpo',
        'chief product',
        'cso',
        'chief strategy',
        'chief sales',
        'cmo',
        'chief marketing',
        'chief operating',
        'coo',
        'cfo',
        'chief financial'
      ];

      const seniorContact = emails.find(person => {
        const position = person.position?.toLowerCase() || '';
        return preferredTitles.some(title => position.includes(title));
      });

      if (seniorContact) {
        return {
          name: `${seniorContact.first_name} ${seniorContact.last_name}`,
          email: seniorContact.value,
          position: seniorContact.position,
          linkedinUrl: seniorContact.linkedin || null,
          source: 'hunter.io'
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding CEO via Hunter:', error.message);
      return null;
    }
  }

  /**
  * Find senior contact via RocketReach API (use sparingly - rate limited)
   */
  async _findCEOViaRocketReach(companyName) {
    try {
      if (!this.rocketReachApiKey) {
        return null;
      }

      const response = await axios.post('https://api.rocketreach.co/v2/api/search', {
        query: {
          company_name: [companyName],
          current_title: [
            'CEO',
            'Chief Executive Officer',
            'Co-Founder',
            'Founder',
            'President',
            'CTO',
            'Chief Technology Officer',
            'CIO',
            'Chief Information Officer',
            'CPO',
            'Chief Product Officer',
            'CSO',
            'Chief Strategy Officer',
            'Chief Sales Officer',
            'CMO',
            'Chief Marketing Officer',
            'COO',
            'Chief Operating Officer',
            'CFO',
            'Chief Financial Officer'
          ]
        },
        page_size: 1
      }, {
        headers: {
          'Api-Key': this.rocketReachApiKey,
          'Content-Type': 'application/json'
        }
      });

      const profiles = response.data?.profiles || [];
      if (profiles.length > 0) {
        const ceo = profiles[0];
        return {
          name: ceo.name,
          email: ceo.current_work_email || ceo.personal_email || null,
          position: ceo.current_title,
          linkedinUrl: ceo.linkedin_url || null,
          source: 'rocketreach'
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding CEO via RocketReach:', error.message);
      return null;
    }
  }
}

module.exports = new CEOFinderService();
