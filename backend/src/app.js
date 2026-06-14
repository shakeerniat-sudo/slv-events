const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const db = require('./config/db');
const apiRouter = require('./routes/api');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mount API routes
app.use('/api', apiRouter);

// Root path route handler
app.get('/', (req, res) => {
  res.send('🚀 SLV Events API is running successfully!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    database: db.isDemo() ? 'DEMO_MODE (JSON)' : 'MYSQL',
    timestamp: new Date()
  });
});

// Database initialization
db.connectDb();

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'An unexpected error occurred on the server',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

module.exports = app;
