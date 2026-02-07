const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const EmailLog = require('../models/EmailLog');
const EmailTemplate = require('../models/EmailTemplate');
const Candidate = require('../models/Candidate');

class EmailSenderService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.useSendGrid = true;
    } else {
      this.useSendGrid = false;
      console.warn('SENDGRID_API_KEY not set - email sending will not work');
    }
  }

  /**
   * Send outreach email to CEO
   */
  async sendCEOEmail(jobData, ceoEmail, ceoName, templateId = null) {
    try {
      if (!this.useSendGrid) {
        throw new Error('SendGrid API Key not configured. Please set SENDGRID_API_KEY in .env');
      }

      // Get curated candidates for this sector
      const candidates = await this._getCuratedCandidates(3);

      // Get or create email template
      let emailTemplate = null;
      if (templateId) {
        emailTemplate = await EmailTemplate.findById(templateId);
      } else {
        const sector = this._determineSector(jobData.title);
        emailTemplate = await EmailTemplate.findOne({
          sector: sector,
          active: true
        });
      }

      // Compose email
      const emailContent = this._composeEmail(
        ceoName,
        jobData.company.name,
        candidates,
        emailTemplate
      );

      const trackingId = this._generateTrackingId(jobData._id, ceoEmail);

      // Send email via SendGrid
      const msg = {
        to: ceoEmail,
        from: process.env.FROM_EMAIL,
        subject: emailContent.subject,
        html: emailContent.body,
        headers: {
          'X-Tracking-ID': trackingId
        }
      };

      const response = await sgMail.send(msg);

      // Log email
      const emailLog = new EmailLog({
        jobId: jobData._id,
        companyName: jobData.company.name,
        ceoEmail: ceoEmail,
        ceoName: ceoName,
        template: emailTemplate?._id,
        subject: emailContent.subject,
        body: emailContent.body,
        candidatesList: candidates.map(c => ({
          name: c.name,
          linkedinUrl: c.linkedinUrl,
          title: c.title,
          company: c.currentCompany
        })),
        trackingId: trackingId,
        status: 'sent',
        messageId: response[0].messageId || null
      });

      await emailLog.save();

      return {
        success: true,
        messageId: response[0].messageId,
        logId: emailLog._id
      };
    } catch (error) {
      console.error('Error sending CEO email:', error);
      
      // Log failed email
      try {
        const emailLog = new EmailLog({
          jobId: jobData._id,
          companyName: jobData.company.name,
          ceoEmail: ceoEmail,
          ceoName: ceoName,
          status: 'failed',
          errorMessage: error.message
        });
        await emailLog.save();
      } catch (logError) {
        console.error('Error logging failed email:', logError);
      }

      throw error;
    }
  }

  /**
   * Get top-rated curated candidates
   */
  async _getCuratedCandidates(limit = 3) {
    try {
      const candidates = await Candidate.find({
        rating: { $gte: 4 }
      })
        .sort({ yearsOfExperience: -1, rating: -1 })
        .limit(limit);

      return candidates;
    } catch (error) {
      console.error('Error getting curated candidates:', error);
      return [];
    }
  }

  /**
   * Compose personalized email
   */
  _composeEmail(ceoName, companyName, candidates, template) {
    const candidatesList = candidates
      .map(c => `<li><a href="${c.linkedinUrl}">${c.name}</a> - ${c.title} at ${c.currentCompany}</li>`)
      .join('');

    const defaultSubject = `${companyName} x ZerothHire — Your next founding engineer is here`;
    const defaultBody = `<html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi ${ceoName},</p>
        
        <p>I saw that ${companyName} just posted a Founding Engineer role in Bangalore. Congrats on the hiring!</p>
        
        <p>I specialize in finding exceptional founding engineers, and I've curated a list of 3 outstanding candidates I think would be a great fit for your team:</p>
        
        <ul style="margin: 20px 0;">
          ${candidatesList}
        </ul>
        
        <p>All of these engineers have proven track records of building and scaling products from scratch. I've personally vetted each one through my network.</p>
        
        <p><strong>Here's how I can help:</strong></p>
        <p>I work on a success-fee model - completely free if you don't end up hiring through me. If we do work together and you hire one of my candidates, it's 15% of their first-year annual salary. No risk, just results.</p>
        
        <p>Would love to chat more about your hiring needs and how I can support your growth.</p>
        
        <p>Best regards,<br>
        Nagendra Kumar Yeminedi<br>
        Co-founder,${process.env.FROM_NAME || 'Weekday Automation'}<br>
        <a href="https://zerothhire.com">zerothhire.com</a></p>
        </p>
      </body>
    </html>`;

    return {
      subject: template?.subject || defaultSubject,
      body: template?.body || defaultBody
    };
  }

  /**
   * Determine sector from job title
   */
  _determineSector(jobTitle) {
    const title = jobTitle.toLowerCase();
    
    if (title.includes('fintech') || title.includes('finance') || title.includes('payment')) {
      return 'fintech';
    } else if (title.includes('ai') || title.includes('machine learning')) {
      return 'ai';
    } else if (title.includes('health')) {
      return 'healthtech';
    } else if (title.includes('edtech') || title.includes('education')) {
      return 'edtech';
    } else if (title.includes('marketplace')) {
      return 'marketplace';
    }
    
    return 'general';
  }

  /**
   * Generate tracking ID for email
   */
  _generateTrackingId(jobId, email) {
    const timestamp = Date.now();
    const hash = crypto
      .createHash('sha256')
      .update(`${jobId}:${email}:${timestamp}`)
      .digest('hex')
      .substring(0, 16);
    
    return `${timestamp}-${hash}`;
  }

  /**
   * Send batch emails
   */
  async sendBatchEmails(jobs, ceoData) {
    const results = [];

    for (const job of jobs) {
      try {
        const result = await this.sendCEOEmail(
          job,
          ceoData[job.company.name]?.email,
          ceoData[job.company.name]?.name,
          null
        );
        results.push({ jobId: job._id, success: true, ...result });
      } catch (error) {
        results.push({ jobId: job._id, success: false, error: error.message });
      }

      // Add delay between emails to avoid rate limiting
      await this._delay(parseInt(process.env.EMAIL_SEND_DELAY) || 1000);
    }

    return results;
  }

  /**
   * Yield for a specified duration
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resend email for failed attempts
   */
  async resendFailedEmails() {
    try {
      const failedEmails = await EmailLog.find({
        status: 'failed',
        retries: { $lt: 3 }
      }).limit(10);

      const results = [];

      for (const emailLog of failedEmails) {
        try {
          const msg = {
            to: emailLog.ceoEmail,
            from: process.env.FROM_EMAIL,
            subject: emailLog.subject,
            html: emailLog.body
          };

          const response = await sgMail.send(msg);

          emailLog.status = 'sent';
          emailLog.retries += 1;
          emailLog.messageId = response[0].messageId || null;
          await emailLog.save();

          results.push({ emailId: emailLog._id, success: true });
        } catch (error) {
          emailLog.retries += 1;
          emailLog.errorMessage = error.message;
          await emailLog.save();

          results.push({ emailId: emailLog._id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error resending failed emails:', error);
      throw error;
    }
  }
}

module.exports = new EmailSenderService();
