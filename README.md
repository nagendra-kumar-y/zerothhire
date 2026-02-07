# ZerothHire

Automated founding engineer recruitment platform. Scrapes LinkedIn jobs, finds CEO contacts, and sends personalized outreach emails with curated candidate lists.

**Business Model:** 15% success fee on first-year salary. Free if no hire.

---

## Tech Stack

- **Backend:** Node.js, Express, MongoDB, SendGrid
- **Frontend:** React 18, TailwindCSS, Axios
- **Services:** Puppeteer (scraping), Hunter.io (email finding), SendGrid (email delivery)

---

## Quick Start

### Prerequisites
- Node.js v14+
- MongoDB (local or [Atlas](https://cloud.mongodb.com))
- SendGrid API Key ([sendgrid.com](https://sendgrid.com))
- Hunter.io API Key ([hunter.io](https://hunter.io))

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/weekday-automation
PORT=5000
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=your_verified_email@gmail.com
FROM_NAME=ZerothHire
HUNTER_API_KEY=your_hunter_key
ROCKETREACH_API_KEY=your_rocketreach_key
SEND_EMAILS=false
JOB_SCRAPE_INTERVAL=*/30 * * * *
```

```bash
npm start
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`

### 3. Seed Test Data

```bash
node backend/scripts/seedDatabase.js
```

---

## API Endpoints

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs (paginated) |
| GET | `/api/jobs/:id` | Get job details |
| POST | `/api/jobs/process?limit=10` | Process unprocessed jobs (find CEO + email) |
| POST | `/api/jobs/:id/process` | Process single job |
| POST | `/api/jobs/:id/send-email` | Send email to job's founder |
| POST | `/api/jobs/send-batch` | Send emails to multiple founders |
| GET | `/api/jobs/verified/list` | List jobs with verified CEO emails |
| GET | `/api/jobs/unprocessed/list` | List unprocessed jobs |
| GET | `/api/jobs/stats/summary` | Job processing statistics |

### Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates` | List all candidates |
| POST | `/api/candidates` | Add candidate |
| PUT | `/api/candidates/:id` | Update candidate |
| DELETE | `/api/candidates/:id` | Delete candidate |

### Email Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/email-templates` | List templates |
| POST | `/api/email-templates` | Create template |
| PUT | `/api/email-templates/:id` | Update template |

### Automation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/automation/status` | Automation status |
| POST | `/api/automation/start` | Start scheduler |
| POST | `/api/automation/stop` | Stop scheduler |
| POST | `/api/automation/trigger` | Manual trigger |

---

## Key Workflows

### Send Email to Specific Founders

```bash
# Single job
POST /api/jobs/:id/send-email

# Multiple jobs by IDs
POST /api/jobs/send-batch
{ "jobIds": ["id1", "id2"] }

# Auto-filter (unsent, processed, with CEO email)
POST /api/jobs/send-batch
{ "filter": { "location": "Bangalore", "limit": 5 } }
```

### Process Jobs (Find CEO + Email)

```bash
# Batch
POST /api/jobs/process?limit=10

# Single
POST /api/jobs/:id/process
```

### Processing Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not yet processed |
| `success` | CEO + email found |
| `ceo_not_found` | Could not find CEO |
| `email_not_found` | Found CEO, no email |
| `send_failed` | Email send failed |

---

## Project Structure

```
workday/
├── backend/
│   ├── models/          # MongoDB schemas (Job, Candidate, EmailLog, etc.)
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   │   ├── emailSenderService.js    # SendGrid email sending
│   │   ├── automationService.js     # Cron scheduler
│   │   ├── ceoFinderService.js      # CEO discovery
│   │   └── linkedinScraperService.js # Job scraping
│   ├── scripts/         # Utility scripts
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── pages/       # JobsPage, CandidatesPage, Dashboard
│   │   ├── components/  # Navbar, Sidebar
│   │   └── services/    # API client
│   └── public/
└── README.md
```

---

## Deployment (Free)

| Component | Service | Free Tier |
|-----------|---------|-----------|
| Frontend | [Vercel](https://vercel.com) | Unlimited deploys |
| Backend | [Render](https://render.com) | 750 hrs/month |
| Database | [MongoDB Atlas](https://cloud.mongodb.com) | 512MB free |

### Deploy Backend (Render)
1. Push to GitHub
2. Render → New Web Service → Connect repo → Root: `backend`
3. Build: `npm install` / Start: `node server.js`
4. Add env variables from `.env`

### Deploy Frontend (Vercel)
1. Vercel → Import repo → Root: `frontend`
2. Add env: `REACT_APP_API_URL=https://your-backend.onrender.com/api`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `SENDGRID_API_KEY` | Yes | SendGrid API key |
| `FROM_EMAIL` | Yes | Verified sender email |
| `FROM_NAME` | No | Sender name (default: ZerothHire) |
| `HUNTER_API_KEY` | Yes | Hunter.io API key |
| `ROCKETREACH_API_KEY` | No | RocketReach API key |
| `SEND_EMAILS` | No | `true` to send, `false` to test |
| `LI_AT` | No | LinkedIn cookie for scraping |
| `PORT` | No | Server port (default: 5000) |

---

## License

MIT

### MongoDB Atlas

1. Create cluster on Atlas
2. Get connection string
3. Add to MONGODB_URI in .env

---

## Usage Examples

### Start Automation via API

```bash
curl -X POST http://localhost:5000/api/automation/start \
  -H "Content-Type: application/json" \
  -d '{"cronSchedule": "*/30 * * * *"}'
```

### Add Candidate

```bash
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "title": "Senior Engineer",
    "currentCompany": "Google",
    "skills": ["React", "Node.js"],
    "rating": 5
  }'
```

### Get Job Statistics

```bash
curl http://localhost:5000/api/jobs/stats/summary
```

---

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
# or
yarn install
```

### MongoDB connection failed
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify database exists

### Email not sending
- Check SendGrid API key in .env
- Verify sender email is verified in SendGrid
- Set SEND_EMAILS=true to enable sending
- Check SendGrid dashboard for delivery status

### LinkedIn scraping not working
- Install Puppeteer: `npm install puppeteer`
- Check if LinkedIn structure has changed
- Consider using LinkedIn API (requires approval)

---

## Notes & Recommendations

1. **LinkedIn Scraping**: Direct scraping may violate LinkedIn's ToS. Consider:
   - Using official LinkedIn API (requires approval)
   - Using data services like Hunter.io or Clearbit
   - Manual daily collection

2. **Email Deliverability**: 
   - Use verified domains
   - Warm up email accounts gradually
   - Monitor bounce rates
   - Implement DKIM/SPF

3. **Rate Limiting**:
   - Implement email delays (default: 60s)
   - Use exponential backoff for API calls
   - Rotate API keys/proxies if needed

4. **Data Privacy**:
   - Comply with GDPR/CCPA
   - Implement unsubscribe links
   - Store data securely
   - Regular backups

---

## Future Enhancements

- [ ] LinkedIn OAuth integration
- [ ] AI-powered email generation
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Slack/Telegram notifications
- [ ] Webhooks for integrations
- [ ] Mobile app
- [ ] Advanced filtering & segmentation
- [ ] Lead scoring
- [ ] CRM integration

---

## License

MIT License

---

## Support

For issues and feature requests, please open an issue or contact support.

Email: nagendra@zerothhire.com
Website: https://zerothhire.com

---

**Last Updated**: February 7, 2026
**Version**: 1.0.0-beta
