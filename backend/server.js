const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config();

const app = express();

// Import routes
const jobRoutes = require('./routes/jobs');
const companyRoutes = require('./routes/companies');
const candidateRoutes = require('./routes/candidates');
const emailTemplateRoutes = require('./routes/emailTemplates');
const automationRoutes = require('./routes/automation');

// Import automation service
const automationService = require('./services/automationService');

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  contentSecurityPolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/weekday-automation')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/automation', automationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start automation (runs every 30 minutes)
  console.log('\n🤖 Initializing CEO Outreach Automation...');
  //automationService.startAutomation('*/30 * * * *'); // Every 30 minutes
  
  // Trigger immediately
  console.log('🚀 Triggering first scrape immediately...\n');
  // try {
  //   await automationService._runJobScraping();
  // } catch (error) {
  //   console.error('Error running initial scrape:', error.message);
  // }
  
  console.log('✓ Automation ready - will run every 30 minutes\n');
});

module.exports = app;
