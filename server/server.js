// Load environment variables
require("dotenv").config();
const express = require("express");
const basicRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const socialAccountRoutes = require("./routes/socialAccountRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const postRoutes = require("./routes/postRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { connectDB } = require("./config/database");
const cors = require("cors");
const path = require('path');

console.log('🚀 Starting server...');
console.log('🔧 Environment variables check:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('   SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('   JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('   PORT:', process.env.PORT);
console.log('   BASE_URL:', process.env.BASE_URL);
console.log('   CLIENT_URL:', process.env.CLIENT_URL);
console.log('   TWITTER_CLIENT_ID exists:', !!process.env.TWITTER_CLIENT_ID);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY variables in .env missing.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://nexsocial.onrender.com', process.env.CLIENT_URL].filter(Boolean)
    : 'http://localhost:5173',
  credentials: true
}));

// Increase payload limit to handle base64 encoded images/videos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Database connection with retry mechanism
let dbConnection = null;
let connectionAttempts = 0;
const maxRetries = 5;
const retryDelay = 3000; // 3 seconds

const attemptConnection = async () => {
  connectionAttempts++;
  console.log(`🔄 Database connection attempt ${connectionAttempts}/${maxRetries}`);

  try {
    const conn = await connectDB();
    if (conn) {
      dbConnection = conn;
      console.log('✅ Supabase connection successful - Server ready to handle requests');
      return true;
    } else {
      console.log('❌ Database connection failed');

      if (connectionAttempts < maxRetries) {
        console.log(`🔄 Retrying connection in ${retryDelay/1000} seconds... (${connectionAttempts}/${maxRetries})`);
        setTimeout(attemptConnection, retryDelay);
      } else {
        console.log('❌ Max connection attempts reached. Server will continue without database.');
        console.log('⚠️  Database-dependent endpoints will return 503 errors.');
        console.log('⚠️  Please check your Supabase configuration and ensure the social_accounts table exists.');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);

    if (connectionAttempts < maxRetries) {
      console.log(`🔄 Retrying connection in ${retryDelay/1000} seconds... (${connectionAttempts}/${maxRetries})`);
      setTimeout(attemptConnection, retryDelay);
    } else {
      console.log('❌ Max connection attempts reached. Server will continue without database.');
      console.log('⚠️  Database-dependent endpoints will return 503 errors.');
    }
    return false;
  }
};

// Middleware to check database connection with detailed error info
const checkDatabaseConnection = (req, res, next) => {
  if (!dbConnection) {
    console.log(`❌ Database connection unavailable for request: ${req.method} ${req.url}`);
    console.log('⚠️  Possible causes:');
    console.log('   1. Supabase credentials are incorrect');
    console.log('   2. Network connectivity issues');
    console.log('   3. social_accounts table does not exist');
    console.log('   4. Supabase service is down');

    return res.status(503).json({
      success: false,
      error: 'Database connection unavailable. Please check your Supabase configuration.',
      message: 'Service temporarily unavailable',
      details: {
        connectionAttempts,
        maxRetries,
        suggestions: [
          'Verify Supabase URL and Service Role Key in .env file',
          'Check if social_accounts table exists in Supabase',
          'Run the SQL script from server/database/setup.sql',
          'Check Supabase dashboard for service status'
        ]
      }
    });
  }
  next();
};

// Basic Routes (don't require database)
app.use(basicRoutes);

// Health check endpoint with detailed database status
app.get('/api/health', (req, res) => {
  const healthStatus = {
    success: true,
    status: 'Server is running',
    database: {
      connected: !!dbConnection,
      connectionAttempts,
      maxRetries,
      lastAttempt: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    supabase: {
      configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      url: process.env.SUPABASE_URL ? 'Configured' : 'Not configured',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Not configured'
    }
  };

  console.log('🏥 Health check requested:', healthStatus);
  res.json(healthStatus);
});

// Authentication Routes - require database
app.use('/api/auth', checkDatabaseConnection, authRoutes);
// Social Account Routes - require database
app.use('/api/social-accounts', checkDatabaseConnection, socialAccountRoutes);
// OAuth Routes - require database
app.use('/api/oauth', checkDatabaseConnection, oauthRoutes);
// Post Routes - require database
app.use('/api/posts', checkDatabaseConnection, postRoutes);
// Analytics Routes - require database
app.use('/api/analytics', checkDatabaseConnection, analyticsRoutes);

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// 404 handler for API routes only
app.use('/api/*', (req, res, next) => {
  console.log(`❌ 404 - API route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: 'The requested API endpoint does not exist'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Unhandled application error:', err.message);
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'There was an error serving your request'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log('🔧 Server is ready to accept connections');

  // Start database connection attempts
  attemptConnection();
});