const morgan = require('morgan');

function createLogger() {
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  return morgan(format, {
    skip: (req, res) => {
      return process.env.NODE_ENV === 'production' && req.url === '/api/health';
    },
  });
}

module.exports = createLogger;