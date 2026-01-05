const mongoose = require('mongoose');
const config = require('../config');

async function connectDatabase() {
  if (!config.mongodb.useMongoDb) {
    console.log('[Database] MongoDB disabled, using in-memory storage');
    return;
  }

  try {
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[Database] MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
    });
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error.message);
    throw error;
  }
}

async function disconnectDatabase() {
  if (!config.mongodb.useMongoDb) return;
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB disconnected');
  } catch (error) {
    console.error('[Database] Error disconnecting:', error);
  }
}

module.exports = { connectDatabase, disconnectDatabase };