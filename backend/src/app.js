const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const createLogger = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const initializeRoutes = require('./controllers/apiController');

function createApp(roomService) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(createLogger());
  app.set('trust proxy', 1);

  app.use('/api', initializeRoutes(roomService));

  app.get('/', (req, res) => {
    res.json({
      name: 'Media Sync Backend',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        stats: '/api/stats',
        rooms: '/api/rooms',
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;