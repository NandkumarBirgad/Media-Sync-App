const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const createLogger = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const initializeRoutes = require('./controllers/apiController');
const path = require('path');

function createApp(roomService) {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // ⭐ important for video
    })
  );

  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(createLogger());
  app.set('trust proxy', 1);

  /* =====================================================
     🔥 MOST IMPORTANT LINE (VIDEO SERVING)
     Uploaded videos must be publicly accessible
  ===================================================== */
  app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'))
  );

  /* ================= API ROUTES ================= */
  app.use('/api', initializeRoutes(roomService));

  app.get('/', (req, res) => {
    res.json({
      name: 'Media Sync Backend',
      version: '1.0.0',
      status: 'running',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
