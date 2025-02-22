const express = require('express');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Only log when response is finished
  // res.on('finish', () => {
  //   const duration = Date.now() - startTime;
  //   const message = `${req.method} ${req.path} (${duration}ms)`;
    
  //   if (res.statusCode >= 500) {
  //     logger.error(message, {
  //       ip: req.ip,
  //       statusCode: res.statusCode
  //     });
  //   } else if (res.statusCode >= 400) {
  //     logger.warn(message, {
  //       ip: req.ip,
  //       statusCode: res.statusCode
  //     });
  //   } else {
  //     logger.info(message, {
  //       ip: req.ip,
  //       statusCode: res.statusCode
  //     });
  //   }
  // });

  next();
});

// Error handler middleware
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.path}`, {
    type: 'response',
    ip: req.ip,
    statusCode: 500,
    error: err.message
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Express API with Discord logging!' });
});

// Example API endpoints
app.post('/api/messages', (req, res) => {
  const { message } = req.body;
  if (!message) {
    logger.warn('Invalid message request', {
      ip: req.ip,
      statusCode: 400
    });
    return res.status(400).json({ error: 'Message is required' });
  }

  logger.success(`Message received: ${message}`, {
    ip: req.ip,
    statusCode: 200
  });
  res.json({ success: true });
});

app.get('/api/test-error', (req, res, next) => {
  try {
    throw new Error('Test error endpoint');
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.info('Server Started', {
    timestamp: new Date().toISOString(),
    port,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
}); 