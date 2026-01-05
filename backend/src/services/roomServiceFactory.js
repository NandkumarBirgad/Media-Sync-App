const config = require('../config');
const InMemoryRoomService = require('./InMemoryRoomService');
const MongoRoomService = require('./MongoRoomService');

function createRoomService() {
  if (config.mongodb.useMongoDb) {
    console.log('[RoomService] Using MongoDB for persistence');
    return new MongoRoomService();
  } else {
    console.log('[RoomService] Using in-memory storage');
    return new InMemoryRoomService();
  }
}

module.exports = createRoomService;