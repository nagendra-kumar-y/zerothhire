# ZerothHire — Automated Founding Engineer Recruitment Platform

## What is ZerothHire?

ZerothHire is a web application that **automates the process of finding and reaching out to startup founders** who are hiring founding engineers.

In simple terms: instead of a recruiter manually searching LinkedIn for job openings, Googling who the CEO is, hunting for their email, and then writing a cold email — this tool does all of that automatically. It scrapes jobs, finds the right person to contact, gets their email, and sends a professional outreach email with a curated list of engineering candidates.

**Business Model:** ZerothHire charges a 15% success fee on the candidate's first-year salary. If no hire is made, the service is completely free.

---

## How It Works (End-to-End Flow)

The entire system works as a pipeline — each step feeds into the next:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐     ┌─────────────┐
│  1. SCRAPE   │ ──► │  2. SAVE TO  │ ──► │ 3. FIND CEO / │ ──► │ 4. FIND CEO  │ ──► │ 5. SEND     │
│  LinkedIn    │     │  Database    │     │   Founder      │     │   Email      │     │   Outreach  │
│  Jobs        │     │  (MongoDB)   │     │   (Hunter.io)  │     │  (Hunter.io) │     │   (SendGrid)│
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘     └─────────────┘
```

### Step 1: Scrape LinkedIn for Job Postings

The system uses **Puppeteer** (a headless Chrome browser controlled by code) to open LinkedIn's public job search page. It searches for a specific job title like "Founding Engineer" in a location like "Bangalore." It scrolls through the results, reads each job card, and extracts:
- Job title
- Company name
- Location
- LinkedIn job URL
- Number of applicants

**No LinkedIn login is required** — it uses LinkedIn's publicly accessible job listing pages.

### Step 2: Save Jobs to the Database

Each scraped job is saved into **MongoDB** with a status of `pending`. Before saving, the system checks for duplicates — if a job with the same LinkedIn Job ID or the same title + company name already exists, it skips that job to avoid duplicates.

### Step 3: Find the CEO / Founder

For each new job, the system needs to find out **who runs the company**. It uses external APIs:

1. **Hunter.io Domain Search** — Given a company name (e.g., "Acme Labs"), it searches Hunter.io's database for people at that company. It looks specifically for titles like CEO, Founder, Co-Founder, CTO, etc.
2. **RocketReach (fallback)** — If Hunter.io doesn't have the data, the system tries RocketReach as a backup (limited to 1 call per run to stay within free tier limits).

If no senior contact is found, the job is marked as `ceo_not_found` and skipped.

### Step 4: Find the CEO's Email Address

Once we know the CEO's name and company, the system finds their email:

1. It first checks if Hunter.io already returned an email in Step 3 (often it does).
2. If not, it uses Hunter.io's **Email Finder API** — given a person's first name, last name, and company domain, it generates and verifies the most likely email address.

If no email is found, the job is marked as `email_not_found` and skipped.

### Step 5: Send Outreach Email via SendGrid

If both the CEO and their email are successfully found, the system composes a **personalized outreach email** using the SendGrid email delivery service. The email:

- Addresses the CEO by name
- Mentions their company and the specific role they're hiring for
- Includes a curated list of 3 top engineering candidates from our database (with LinkedIn profiles)
- Proposes ZerothHire's recruitment service

The email is sent, logged in the database (for tracking), and the job is marked as `success`.

> **Safety Feature:** Email sending is controlled by the `SEND_EMAILS` environment variable. When set to `false` (the default during development and testing), the system goes through the entire pipeline — finds CEOs, verifies emails — but does **NOT** actually send any emails. This prevents accidental outreach during development.

### Automation (Scheduled Runs)

The entire pipeline (Steps 1–5) can run automatically on a timer using a **cron scheduler**. By default, it runs every 30 minutes. The user can start, stop, or manually trigger a run from the Dashboard UI or via API calls.

---

## The User Interface (What You See in the Browser)

The frontend is a single-page web application built with **React** and **TailwindCSS**. It has a sidebar navigation layout with the following pages:

### Dashboard
- Shows live statistics: total jobs scraped, jobs processed, emails sent, candidates in the database
- Start / Stop / Trigger automation buttons
- Auto-refreshes every 30 seconds so numbers stay current

### Jobs Page
- A table showing all scraped jobs with columns: Job Title, Company, Location, CEO/Founder, Status, and a Delete action
- Filter jobs by status: All, Pending, Processed, Email Sent
- Search by keyword
- Select multiple processed jobs and send batch emails with one click

### Candidates Page
- View, add, edit, and delete engineering candidates
- Each candidate profile includes: name, LinkedIn URL, current title, company, skills, sector (fintech, AI, SaaS, etc.), and a 1–5 star rating
- These candidates are the ones included in outreach emails to founders

### Email Templates Page
- Create and manage email templates for different industry sectors
- Templates use placeholders like `{ceoName}`, `{companyName}`, `{candidateList}` that get automatically filled in when an email is sent

### Companies Page
- Browse companies discovered through the scraping process
- View company details like domain and employee count

### Settings Page
- View the current system configuration
- Check which API keys are connected and which features are active

---

## Technology Stack

| Technology | What It Does | Why It Was Chosen |
|------------|-------------|-------------------|
| **Node.js + Express** | Runs the backend server and API | Fast, lightweight, large ecosystem of libraries |
| **MongoDB + Mongoose** | Stores all data (jobs, candidates, emails, templates) | Flexible schema — job data varies in structure |
| **React 18** | Renders the frontend user interface | Component-based architecture, fast updates |
| **TailwindCSS** | Styles the UI | Speeds up development with utility CSS classes |
| **Puppeteer** | Scrapes LinkedIn job listings | Full browser simulation needed for JavaScript-heavy pages |
| **Hunter.io API** | Finds CEOs and their email addresses | Industry-standard business contact discovery service |
| **RocketReach API** | Backup CEO discovery | Fallback when Hunter.io has no data for a company |
| **SendGrid** | Sends outreach emails | Reliable email delivery with tracking and analytics |
| **node-cron** | Schedules automatic scraping runs | Simple timer-based scheduling (like an alarm clock for code) |
| **Helmet** | Secures HTTP headers | Protects the backend from common web vulnerabilities |
| **CORS** | Handles cross-origin requests | Allows the frontend (Vercel) to talk to the backend (Render) |
| **Axios** | Makes HTTP requests | Used in both frontend (API calls) and backend (Hunter/RocketReach) |

---

## Challenges Faced and How They Were Solved

### 1. LinkedIn Scraping is Hard

**Problem:** LinkedIn heavily protects its data. The job search page is built with JavaScript, so a simple HTTP request returns an empty page. LinkedIn also has anti-bot detection, CAPTCHA challenges, and dynamically loaded content (infinite scroll).

**Solution:** Used Puppeteer to launch a full Chrome browser in the background. Set a realistic browser user agent to avoid detection. Disabled loading images and CSS for speed. Built auto-scrolling logic to load more job results. Implemented retry logic — if the first attempt fails, it tries again automatically.

### 2. Finding the Right Person at a Company

**Problem:** Many startups are small and don't have well-indexed information online. Founder names can be ambiguous, and not every company has a CEO listed on platforms like Hunter.io.

**Solution:** Created a priority-based title matching system. The code searches for people in this order: CEO → Co-Founder → Founder → CTO → CIO → CPO → COO → CFO. If none are found via Hunter.io, it falls back to RocketReach. If both fail, it gracefully marks the job as `ceo_not_found` and moves on.

### 3. Email Accuracy

**Problem:** Finding someone's email from just a name and company is inherently uncertain. Emails can be wrong, outdated, or the person may have left the company.

**Solution:** Hunter.io provides a confidence score with each email result. The system accepts the best available result and logs the source (Hunter.io, RocketReach, or manual) so the user knows where the email came from and can verify if needed.

### 4. CORS — Frontend and Backend on Different Domains

**Problem:** When the React frontend (on Vercel at `zerothhire-su6f.vercel.app`) tries to call the Express backend (on Render at `zerothhire.onrender.com`), the browser blocks the request due to Cross-Origin Resource Sharing (CORS) security policy. Additionally, the Helmet security middleware was adding headers that conflicted with cross-origin requests.

**Solution:** Configured CORS to explicitly allow the Vercel frontend URL. Added regex matching to also accept Vercel preview URLs (which change on every deployment). Moved the CORS middleware to run before Helmet so requests aren't blocked prematurely. Configured Helmet to allow cross-origin resource sharing instead of blocking it.

### 5. Running Chrome (Puppeteer) on a Cloud Server

**Problem:** Puppeteer needs a full Chrome browser binary (~300MB). The free tier on Render only provides 512MB of RAM. Chrome was failing to install or crashing during scraping.

**Solution:** Added a custom build script that installs Chrome during the deployment build phase (not at runtime). Created a Puppeteer configuration file to tell it where to find Chrome. Used Chrome in headless mode with memory-saving flags to stay within the 512MB limit.

### 6. Preventing Duplicate Jobs

**Problem:** Every time the scraper runs, it finds the same jobs plus new ones. Without duplicate handling, the database would fill up with repeated entries.

**Solution:** Implemented a three-layer duplicate check:
1. **LinkedIn Job ID** — Each LinkedIn job has a unique ID, checked first
2. **Title + Company name** — Case-insensitive match as a fallback (catches jobs added manually or from different LinkedIn URLs)
3. **CEO Email** — For manually added jobs, if the same CEO email already exists, it's flagged as a duplicate

### 7. Managing API Rate Limits and Costs

**Problem:** Hunter.io and RocketReach have limited free tiers (25–50 requests/month). Running the scraper frequently would exhaust the quota quickly.

**Solution:**
- RocketReach is used only once per scraping run (as a last resort)
- If Hunter.io already returns an email during the CEO-finding step, the email-finding step reuses it instead of making another API call
- Already-processed jobs are skipped on subsequent runs (checked via `processed: true` flag)
- The cron schedule can be adjusted to run less frequently

---

## Deployment Architecture

The application runs for free across three cloud services:

```
┌─────────────────────────┐      ┌──────────────────────────┐      ┌───────────────────┐
│       VERCEL             │      │        RENDER             │      │  MONGODB ATLAS     │
│       (Frontend)         │ ──►  │        (Backend)          │ ──►  │  (Database)        │
│                          │      │                           │      │                    │
│  • React app served as   │      │  • Node.js + Express API  │      │  • 512MB free      │
│    static files          │      │  • Puppeteer + Chrome     │      │  • Cloud-hosted    │
│  • Auto-deploys on push  │      │  • Auto-deploys on push   │      │  • Auto-backups    │
│  • Unlimited deploys     │      │  • 750 hrs/month free     │      │                    │
└─────────────────────────┘      └──────────────────────────┘      └───────────────────┘
```

| Component | Live URL |
|-----------|----------|
| Frontend | https://zerothhire-su6f.vercel.app |
| Backend API | https://zerothhire.onrender.com |
| Database | MongoDB Atlas (cloud, not publicly accessible) |

All three services automatically redeploy whenever new code is pushed to the `main` branch on GitHub.

---

## What Was Delivered

| # | Deliverable | Status |
|---|------------|--------|
| 1 | Full-stack web application with responsive UI | ✅ Complete |
| 2 | Automated LinkedIn job scraping | ✅ Complete |
| 3 | Automated CEO/Founder identification via Hunter.io + RocketReach | ✅ Complete |
| 4 | Automated email discovery and verification | ✅ Complete |
| 5 | Personalized outreach emails via SendGrid | ✅ Complete |
| 6 | Candidate database with CRUD operations | ✅ Complete |
| 7 | Email template management system | ✅ Complete |
| 8 | Dashboard with real-time pipeline statistics | ✅ Complete |
| 9 | Batch operations (process + email multiple jobs at once) | ✅ Complete |
| 10 | Duplicate job detection (3-layer check) | ✅ Complete |
| 11 | Cron-based automation (configurable schedule) | ✅ Complete |
| 12 | Production deployment (Vercel + Render + Atlas) | ✅ Complete |
| 13 | Safety controls (SEND_EMAILS toggle, rate limiting) | ✅ Complete |

---

## How to Run Locally

### Prerequisites
- Node.js v14 or higher
- MongoDB (local installation or a free Atlas connection string)
- Free API keys from: [SendGrid](https://sendgrid.com), [Hunter.io](https://hunter.io)

### Start the Backend
```bash
cd backend
npm install
```

Create a file called `backend/.env` with these values:
```env
MONGODB_URI=mongodb://localhost:27017/zerothhire
PORT=5000
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_verified_email@gmail.com
FROM_NAME=ZerothHire
HUNTER_API_KEY=your_hunter_api_key
SEND_EMAILS=false
```

```bash
npm start
```
The backend server starts at `http://localhost:5000`

### Start the Frontend
```bash
cd frontend
npm install
npm start
```
The frontend opens at `http://localhost:3000`

### Load Sample Data
```bash
node backend/scripts/seedDatabase.js
```
This adds 6 sample engineering candidate profiles to the database so you can see the app in action without adding candidates manually.

---

## Project Structure

```
zerothhire/
├── backend/
│   ├── models/                          # Database schemas
│   │   ├── Job.js                       # Job posting structure
│   │   ├── Candidate.js                 # Candidate profiles
│   │   ├── Company.js                   # Company information
│   │   ├── EmailLog.js                  # Email send history & tracking
│   │   └── EmailTemplate.js             # Email templates
│   ├── routes/                          # API endpoint handlers
│   │   ├── jobs.js                      # Job CRUD + processing + emailing
│   │   ├── candidates.js               # Candidate CRUD
│   │   ├── companies.js                # Company CRUD
│   │   ├── emailTemplates.js           # Template CRUD
│   │   └── automation.js               # Start/stop/trigger automation
│   ├── services/                        # Core business logic
│   │   ├── linkedinScraperService.js    # Puppeteer LinkedIn scraping
│   │   ├── ceoFinderService.js          # Hunter.io + RocketReach CEO lookup
│   │   ├── emailFinderService.js        # Hunter.io email discovery
│   │   ├── emailSenderService.js        # SendGrid email sending
│   │   └── automationService.js         # Cron scheduler (runs the pipeline)
│   ├── scripts/                         # Utility scripts
│   │   └── seedDatabase.js              # Seed sample candidates
│   ├── server.js                        # Express app entry point
│   └── .env                             # Secret keys (not in GitHub)
├── frontend/
│   ├── src/
│   │   ├── pages/                       # Page components
│   │   │   ├── Dashboard.js             # Stats + automation controls
│   │   │   ├── JobsPage.js              # Job listing + batch actions
│   │   │   ├── CandidatesPage.js        # Candidate management
│   │   │   ├── EmailTemplatesPage.js    # Template editor
│   │   │   ├── CompaniesPage.js         # Company browser
│   │   │   └── SettingsPage.js          # System configuration
│   │   ├── components/                  # Shared UI components
│   │   │   ├── Navbar.js                # Top navigation bar
│   │   │   └── Sidebar.js               # Side navigation menu
│   │   ├── services/api.js              # HTTP client for API calls
│   │   └── App.js                       # Main app with routing
│   └── vercel.json                      # Vercel deployment config
├── render.yaml                          # Render deployment config
├── .gitignore                           # Files excluded from Git
└── README.md                            # This file
```

---

## Future Improvements

- LinkedIn OAuth integration for authenticated, reliable scraping
- AI-powered email personalization using GPT
- Slack / Telegram notifications when emails get replies
- Analytics dashboard with conversion funnel visualization
- CRM integration (HubSpot, Salesforce)
- Candidate-to-job matching algorithm (auto-match by skills and sector)

---

## License

MIT License

---

**Version:** 1.0.0-beta
**Last Updated:** February 7, 2026
