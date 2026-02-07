const axios = require('axios');

class EmailFinderService {
  constructor() {
    this.hunterApiKey = process.env.HUNTER_API_KEY;
  }

  /**
   * Find email for a CEO
   * @param {string} name - Person's name
   * @param {string} company - Company name
   * @param {Object} ceoInfo - CEO info from CEO finder (may already have email)
   * @param {string} domain - Company domain (optional)
   * @returns {Promise<Object>} Email information
   */
  async findEmail(name, company, ceoInfo = null, domain = null) {
    try {
      // Check if CEO finder already got the email (from Hunter or RocketReach)
      if (ceoInfo?.email) {
        return {
          email: ceoInfo.email,
          source: ceoInfo.source || 'ceo-finder'
        };
      }

      // Try Hunter.io email finder
      if (this.hunterApiKey) {
        const hunterResult = await this._findViaHunter(name, company, domain);
        if (hunterResult) {
          return hunterResult;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding email:', error.message);
      return null;
    }
  }

  /**
   * Find email via Hunter.io API
   */
  async _findViaHunter(name, company, domain) {
    try {
      if (!domain) {
        domain = await this._getDomainViaHunter(company);
        if (!domain) return null;
      }

      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      const response = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: {
          domain: domain,
          first_name: firstName,
          last_name: lastName,
          api_key: this.hunterApiKey
        }
      });

      if (response.data?.data?.email) {
        return {
          email: response.data.data.email,
          source: 'hunter.io',
          score: response.data.data.score || null
        };
      }

      return null;
    } catch (error) {
      console.error('Error with Hunter.io email finder:', error.message);
      return null;
    }
  }

  /**
   * Get domain via Hunter.io
   */
  async _getDomainViaHunter(company) {
    try {
      const response = await axios.get('https://api.hunter.io/v2/domain-search', {
        params: {
          company: company,
          api_key: this.hunterApiKey,
          limit: 1
        }
      });

      return response.data?.data?.domain || null;
    } catch (error) {
      console.error('Error getting domain via Hunter:', error.message);
      return null;
    }
  }
}

module.exports = new EmailFinderService();
