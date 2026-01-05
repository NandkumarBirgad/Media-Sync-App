# Media Sync Backend - Copy & Paste Setup Guide

Follow these steps to set up the backend. Copy and paste each code block into the specified file.

## Step 1: Create Project Structure

```bash
mkdir media-sync-backend
cd media-sync-backend
mkdir -p src/{config,models,controllers,services,middleware,utils}
```

## Step 2: Initialize npm

```bash
npm init -y
```

## Step 3: Install Dependencies

```bash
npm install express socket.io mongoose dotenv cors helmet morgan uuid
npm install --save-dev nodemon
```

## Step 4: Create Files

Now copy and paste the code from each section below into the corresponding files.

---

## 📁 File: `package.json`

Replace the entire content with:

```json
{
  "name": "media-sync-backend",
  "version": "1.0.0",
  "description": "Real-time media synchronization backend",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "keywords": ["websockets", "real-time", "media-sync", "socket.io"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "mongoose": "^8.0.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

---

## 📁 File: `.env`

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration (Optional - leave USE_MONGODB as false for in-memory storage)
MONGODB_URI=mongodb://localhost:27017/media-sync
USE_MONGODB=false

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# Room Configuration
MAX_ROOM_PARTICIPANTS=50
ROOM_CLEANUP_INTERVAL=300000
INACTIVE_ROOM_TIMEOUT=3600000
```

---

## 📁 File: `.gitignore`

```
node_modules/
.env
.env.local
*.log
.DS_Store
```

---

## 📁 File: `src/config/index.js`

```javascript
require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/media-sync',
    useMongoDb: process.env.USE_MONGODB === 'true',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
    cors: {
      origin: process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
  },
  
  room: {
    maxParticipants: parseInt(process.env.MAX_ROOM_PARTICIPANTS) || 50,
    cleanupInterval: parseInt(process.env.ROOM_CLEANUP_INTERVAL) || 300000,
    inactiveTimeout: parseInt(process.env.INACTIVE_ROOM_TIMEOUT) || 3600000,
  },
};

module.exports = config;
```

---

## 📁 File: `src/models/Room.js`

```javascript
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  hostSocketId: { type: String, required: true },
  participants: [participantSchema],
  mediaUrl: { type: String, default: null },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

roomSchema.index({ lastUpdated: 1 });
roomSchema.index({ 'participants.socketId': 1 });

roomSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

roomSchema.statics.findByParticipant = function(socketId) {
  return this.findOne({ 'participants.socketId': socketId });
};

roomSchema.methods.isHost = function(socketId) {
  return this.hostSocketId === socketId;
};

roomSchema.methods.addParticipant = function(socketId) {
  if (!this.participants.some(p => p.socketId === socketId)) {
    this.participants.push({ socketId, joinedAt: new Date() });
  }
  return this;
};

roomSchema.methods.removeParticipant = function(socketId) {
  this.participants = this.participants.filter(p => p.socketId !== socketId);
  return this;
};

roomSchema.methods.assignNewHost = function() {
  if (this.participants.length > 0) {
    this.hostSocketId = this.participants[0].socketId;
    return this.hostSocketId;
  }
  return null;
};

module.exports = mongoose.model('Room', roomSchema);
```

---

## 📁 File: `src/services/InMemoryRoomService.js`

```javascript
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class InMemoryRoomService {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.startCleanupInterval();
  }

  createRoom(hostSocketId, roomId = null) {
    const id = roomId || this._generateRoomId();
    const room = {
      roomId: id,
      hostSocketId,
      participants: [{ socketId: hostSocketId, joinedAt: new Date() }],
      mediaUrl: null,
      isPlaying: false,
      currentTime: 0,
      lastUpdated: new Date(),
      createdAt: new Date(),
    };
    this.rooms.set(id, room);
    this.socketToRoom.set(hostSocketId, id);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  getRoomByParticipant(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  joinRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.participants.some(p => p.socketId === socketId)) return room;
    if (room.participants.length >= config.room.maxParticipants) {
      throw new Error('Room is full');
    }
    room.participants.push({ socketId, joinedAt: new Date() });
    room.lastUpdated = new Date();
    this.socketToRoom.set(socketId, roomId);
    return room;
  }

  leaveRoom(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    room.participants = room.participants.filter(p => p.socketId !== socketId);
    this.socketToRoom.delete(socketId);
    const wasHost = room.hostSocketId === socketId;
    
    if (wasHost) {
      if (room.participants.length > 0) {
        room.hostSocketId = room.participants[0].socketId;
      } else {
        this.rooms.delete(roomId);
        return { roomId, deleted: true, wasHost };
      }
    }
    
    room.lastUpdated = new Date();
    return { roomId, room, wasHost, newHost: wasHost ? room.hostSocketId : null, deleted: false };
  }

  updateRoomState(roomId, updates) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (updates.mediaUrl !== undefined) room.mediaUrl = updates.mediaUrl;
    if (updates.isPlaying !== undefined) room.isPlaying = updates.isPlaying;
    if (updates.currentTime !== undefined) room.currentTime = updates.currentTime;
    room.lastUpdated = new Date();
    return room;
  }

  isHost(roomId, socketId) {
    const room = this.rooms.get(roomId);
    return room && room.hostSocketId === socketId;
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalParticipants: this.socketToRoom.size,
      rooms: Array.from(this.rooms.values()).map(room => ({
        roomId: room.roomId,
        participantCount: room.participants.length,
        isPlaying: room.isPlaying,
        hasMedia: !!room.mediaUrl,
      })),
    };
  }

  cleanupInactiveRooms() {
    const now = new Date();
    const timeout = config.room.inactiveTimeout;
    let cleanedCount = 0;
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastUpdated > timeout) {
        room.participants.forEach(p => this.socketToRoom.delete(p.socketId));
        this.rooms.delete(roomId);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`[Cleanup] Removed ${cleanedCount} inactive rooms`);
    }
    return cleanedCount;
  }

  startCleanupInterval() {
    setInterval(() => this.cleanupInactiveRooms(), config.room.cleanupInterval);
    console.log('[InMemoryRoomService] Cleanup interval started');
  }

  _generateRoomId() {
    return uuidv4().split('-')[0].toUpperCase();
  }

  clear() {
    this.rooms.clear();
    this.socketToRoom.clear();
  }
}

module.exports = InMemoryRoomService;
```

---

## 📁 File: `src/services/MongoRoomService.js`

```javascript
const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class MongoRoomService {
  constructor() {
    this.socketToRoom = new Map();
    this.startCleanupInterval();
  }

  async createRoom(hostSocketId, roomId = null) {
    const id = roomId || this._generateRoomId();
    const room = new Room({
      roomId: id,
      hostSocketId,
      participants: [{ socketId: hostSocketId, joinedAt: new Date() }],
    });
    await room.save();
    this.socketToRoom.set(hostSocketId, id);
    return room.toObject();
  }

  async getRoom(roomId) {
    const room = await Room.findOne({ roomId });
    return room ? room.toObject() : null;
  }

  async getRoomByParticipant(socketId) {
    const cachedRoomId = this.socketToRoom.get(socketId);
    if (cachedRoomId) {
      const room = await Room.findOne({ roomId: cachedRoomId });
      if (room) return room.toObject();
    }
    const room = await Room.findByParticipant(socketId);
    if (room) {
      this.socketToRoom.set(socketId, room.roomId);
      return room.toObject();
    }
    return null;
  }

  async joinRoom(roomId, socketId) {
    const room = await Room.findOne({ roomId });
    if (!room) throw new Error('Room not found');
    if (room.participants.some(p => p.socketId === socketId)) return room.toObject();
    if (room.participants.length >= config.room.maxParticipants) {
      throw new Error('Room is full');
    }
    room.addParticipant(socketId);
    await room.save();
    this.socketToRoom.set(socketId, roomId);
    return room.toObject();
  }

  async leaveRoom(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) {
      const room = await Room.findByParticipant(socketId);
      if (!room) return null;
    }
    const room = await Room.findOne({ roomId: roomId || this.socketToRoom.get(socketId) });
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }
    const wasHost = room.isHost(socketId);
    room.removeParticipant(socketId);
    this.socketToRoom.delete(socketId);
    
    if (wasHost) {
      if (room.getParticipantCount() > 0) {
        const newHost = room.assignNewHost();
        await room.save();
        return { roomId: room.roomId, room: room.toObject(), wasHost: true, newHost, deleted: false };
      } else {
        await Room.deleteOne({ roomId: room.roomId });
        return { roomId: room.roomId, deleted: true, wasHost: true };
      }
    }
    await room.save();
    return { roomId: room.roomId, room: room.toObject(), wasHost: false, newHost: null, deleted: false };
  }

  async updateRoomState(roomId, updates) {
    const room = await Room.findOne({ roomId });
    if (!room) throw new Error('Room not found');
    if (updates.mediaUrl !== undefined) room.mediaUrl = updates.mediaUrl;
    if (updates.isPlaying !== undefined) room.isPlaying = updates.isPlaying;
    if (updates.currentTime !== undefined) room.currentTime = updates.currentTime;
    room.lastUpdated = new Date();
    await room.save();
    return room.toObject();
  }

  async isHost(roomId, socketId) {
    const room = await Room.findOne({ roomId });
    return room ? room.isHost(socketId) : false;
  }

  async getAllRooms() {
    const rooms = await Room.find({});
    return rooms.map(r => r.toObject());
  }

  async getStats() {
    const rooms = await Room.find({});
    return {
      totalRooms: rooms.length,
      totalParticipants: rooms.reduce((sum, r) => sum + r.participants.length, 0),
      rooms: rooms.map(room => ({
        roomId: room.roomId,
        participantCount: room.participants.length,
        isPlaying: room.isPlaying,
        hasMedia: !!room.mediaUrl,
      })),
    };
  }

  async cleanupInactiveRooms() {
    const timeout = new Date(Date.now() - config.room.inactiveTimeout);
    const result = await Room.deleteMany({ lastUpdated: { $lt: timeout } });
    if (result.deletedCount > 0) {
      console.log(`[Cleanup] Removed ${result.deletedCount} inactive rooms`);
      this.socketToRoom.clear();
    }
    return result.deletedCount;
  }

  startCleanupInterval() {
    setInterval(() => this.cleanupInactiveRooms(), config.room.cleanupInterval);
    console.log('[MongoRoomService] Cleanup interval started');
  }

  _generateRoomId() {
    return uuidv4().split('-')[0].toUpperCase();
  }

  async clear() {
    await Room.deleteMany({});
    this.socketToRoom.clear();
  }
}

module.exports = MongoRoomService;
```

---

## 📁 File: `src/services/roomServiceFactory.js`

```javascript
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
```

---

## 📁 File: `src/controllers/socketHandler.js`

```javascript
const createRoomService = require('../services/roomServiceFactory');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.roomService = createRoomService();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);
      
      socket.on('room:create', (data, callback) => this.handleRoomCreate(socket, data, callback));
      socket.on('room:join', (data, callback) => this.handleRoomJoin(socket, data, callback));
      socket.on('room:leave', (callback) => this.handleRoomLeave(socket, callback));
      socket.on('media:play', (data, callback) => this.handleMediaPlay(socket, data, callback));
      socket.on('media:pause', (data, callback) => this.handleMediaPause(socket, data, callback));
      socket.on('media:seek', (data, callback) => this.handleMediaSeek(socket, data, callback));
      socket.on('media:change', (data, callback) => this.handleMediaChange(socket, data, callback));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
    console.log('[SocketHandler] Initialized');
  }

  async handleRoomCreate(socket, data = {}, callback) {
    try {
      const { roomId } = data;
      const room = await this.roomService.createRoom(socket.id, roomId);
      socket.join(room.roomId);
      console.log(`[Room] Created: ${room.roomId} by ${socket.id}`);
      if (callback) callback({ success: true, room: this._sanitizeRoom(room), message: 'Room created successfully' });
    } catch (error) {
      console.error('[Room] Create error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleRoomJoin(socket, data, callback) {
    try {
      const { roomId } = data;
      if (!roomId) throw new Error('Room ID is required');
      
      const room = await this.roomService.joinRoom(roomId, socket.id);
      socket.join(roomId);
      console.log(`[Room] ${socket.id} joined ${roomId}`);
      
      socket.to(roomId).emit('user:joined', {
        socketId: socket.id,
        participantCount: room.participants.length,
      });
      
      if (callback) callback({ success: true, room: this._sanitizeRoom(room), message: 'Joined room successfully' });
      
      socket.emit('media:sync', {
        mediaUrl: room.mediaUrl,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[Room] Join error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleRoomLeave(socket, callback) {
    try {
      const result = await this.roomService.leaveRoom(socket.id);
      if (!result) {
        if (callback) callback({ success: false, error: 'Not in any room' });
        return;
      }
      
      const { roomId, wasHost, newHost, deleted } = result;
      socket.leave(roomId);
      console.log(`[Room] ${socket.id} left ${roomId}`);
      
      if (!deleted) {
        socket.to(roomId).emit('user:left', {
          socketId: socket.id,
          participantCount: result.room.participants.length,
        });
        
        if (wasHost && newHost) {
          this.io.to(roomId).emit('host:updated', {
            newHostSocketId: newHost,
            message: 'Host has changed',
          });
        }
      }
      
      if (callback) callback({ success: true, message: 'Left room successfully' });
    } catch (error) {
      console.error('[Room] Leave error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleMediaPlay(socket, data, callback) {
    try {
      const room = await this.roomService.getRoomByParticipant(socket.id);
      if (!room) throw new Error('Not in any room');
      if (room.hostSocketId !== socket.id) throw new Error('Only host can control playback');
      
      const { currentTime } = data;
      const updatedRoom = await this.roomService.updateRoomState(room.roomId, {
        isPlaying: true,
        currentTime: currentTime !== undefined ? currentTime : room.currentTime,
      });
      
      console.log(`[Media] Play in ${room.roomId} at ${updatedRoom.currentTime}s`);
      this.io.to(room.roomId).emit('media:play', {
        currentTime: updatedRoom.currentTime,
        timestamp: Date.now(),
      });
      
      if (callback) callback({ success: true, message: 'Media playing' });
    } catch (error) {
      console.error('[Media] Play error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleMediaPause(socket, data, callback) {
    try {
      const room = await this.roomService.getRoomByParticipant(socket.id);
      if (!room) throw new Error('Not in any room');
      if (room.hostSocketId !== socket.id) throw new Error('Only host can control playback');
      
      const { currentTime } = data;
      const updatedRoom = await this.roomService.updateRoomState(room.roomId, {
        isPlaying: false,
        currentTime: currentTime !== undefined ? currentTime : room.currentTime,
      });
      
      console.log(`[Media] Pause in ${room.roomId} at ${updatedRoom.currentTime}s`);
      this.io.to(room.roomId).emit('media:pause', {
        currentTime: updatedRoom.currentTime,
        timestamp: Date.now(),
      });
      
      if (callback) callback({ success: true, message: 'Media paused' });
    } catch (error) {
      console.error('[Media] Pause error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleMediaSeek(socket, data, callback) {
    try {
      const room = await this.roomService.getRoomByParticipant(socket.id);
      if (!room) throw new Error('Not in any room');
      if (room.hostSocketId !== socket.id) throw new Error('Only host can control playback');
      
      const { currentTime } = data;
      if (currentTime === undefined || typeof currentTime !== 'number') {
        throw new Error('Valid current time is required');
      }
      
      const updatedRoom = await this.roomService.updateRoomState(room.roomId, { currentTime });
      console.log(`[Media] Seek in ${room.roomId} to ${currentTime}s`);
      
      this.io.to(room.roomId).emit('media:seek', {
        currentTime: updatedRoom.currentTime,
        isPlaying: updatedRoom.isPlaying,
        timestamp: Date.now(),
      });
      
      if (callback) callback({ success: true, message: 'Seeked successfully' });
    } catch (error) {
      console.error('[Media] Seek error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleMediaChange(socket, data, callback) {
    try {
      const room = await this.roomService.getRoomByParticipant(socket.id);
      if (!room) throw new Error('Not in any room');
      if (room.hostSocketId !== socket.id) throw new Error('Only host can control playback');
      
      const { mediaUrl } = data;
      if (!mediaUrl) throw new Error('Media URL is required');
      
      const updatedRoom = await this.roomService.updateRoomState(room.roomId, {
        mediaUrl,
        currentTime: 0,
        isPlaying: false,
      });
      
      console.log(`[Media] Changed in ${room.roomId} to ${mediaUrl}`);
      this.io.to(room.roomId).emit('media:change', {
        mediaUrl: updatedRoom.mediaUrl,
        currentTime: 0,
        isPlaying: false,
        timestamp: Date.now(),
      });
      
      if (callback) callback({ success: true, message: 'Media changed successfully' });
    } catch (error) {
      console.error('[Media] Change error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleDisconnect(socket) {
    try {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      const result = await this.roomService.leaveRoom(socket.id);
      
      if (result && !result.deleted) {
        const { roomId, wasHost, newHost } = result;
        socket.to(roomId).emit('user:disconnected', {
          socketId: socket.id,
          participantCount: result.room.participants.length,
        });
        
        if (wasHost && newHost) {
          this.io.to(roomId).emit('host:updated', {
            newHostSocketId: newHost,
            message: 'Host disconnected, new host assigned',
          });
        }
      }
    } catch (error) {
      console.error('[Socket] Disconnect error:', error);
    }
  }

  _sanitizeRoom(room) {
    return {
      roomId: room.roomId,
      hostSocketId: room.hostSocketId,
      participants: room.participants.map(p => ({ socketId: p.socketId, joinedAt: p.joinedAt })),
      participantCount: room.participants.length,
      mediaUrl: room.mediaUrl,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      createdAt: room.createdAt,
    };
  }
}

module.exports = SocketHandler;
```

---

## 📁 File: `src/controllers/apiController.js`

```javascript
const express = require('express');
const router = express.Router();

function initializeRoutes(roomService) {
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  router.get('/stats', async (req, res) => {
    try {
      const stats = await roomService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[API] Stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
  });

  router.get('/rooms', async (req, res) => {
    try {
      const rooms = await roomService.getAllRooms();
      res.json({
        success: true,
        data: rooms.map(room => ({
          roomId: room.roomId,
          participantCount: room.participants.length,
          hasMedia: !!room.mediaUrl,
          isPlaying: room.isPlaying,
          createdAt: room.createdAt,
        })),
      });
    } catch (error) {
      console.error('[API] Get rooms error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
    }
  });

  router.get('/rooms/:roomId', async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await roomService.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      res.json({
        success: true,
        data: {
          roomId: room.roomId,
          hostSocketId: room.hostSocketId,
          participantCount: room.participants.length,
          mediaUrl: room.mediaUrl,
          isPlaying: room.isPlaying,
          currentTime: room.currentTime,
          createdAt: room.createdAt,
          lastUpdated: room.lastUpdated,
        },
      });
    } catch (error) {
      console.error('[API] Get room error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch room' });
    }
  });

  return router;
}

module.exports = initializeRoutes;
```

---

## 📁 File: `src/middleware/errorHandler.js`

```javascript
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
}

function errorHandler(err, req, res, next) {
  console.error('[Error]', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { notFoundHandler, errorHandler };
```

---

## 📁 File: `src/middleware/logger.js`

```javascript
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
```

---

## 📁 File: `src/utils/database.js`

```javascript
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
```

---

## 📁 File: `src/app.js`

```javascript
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
```

---

## 📁 File: `src/server.js`

```javascript
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const createApp = require('./app');
const { connectDatabase, disconnectDatabase } = require('./utils/database');
const createRoomService = require('./services/roomServiceFactory');
const SocketHandler = require('./controllers/socketHandler');

async function startServer() {
  try {
    await connectDatabase();
    const roomService = createRoomService();
    const app = createApp(roomService);
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: config.socket.cors,
      pingTimeout: config.socket.pingTimeout,
      pingInterval: config.socket.pingInterval,
    });

    const socketHandler = new SocketHandler(io);
    socketHandler.initialize();

    server.listen(config.port, () => {
      console.log('='.repeat(50));
      console.log('🚀 Media Sync Backend Server');
      console.log('='.repeat(50));
      console.log(`📡 Server running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`💾 Storage: ${config.mongodb.useMongoDb ? 'MongoDB' : 'In-Memory'}`);
      console.log('='.repeat(50));
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n[${signal}] Shutting down gracefully...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed');
        await disconnectDatabase();
        console.log('[Server] Shutdown complete');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('[Server] Uncaught Exception:', error);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer();
```

---

## Step 5: Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on http://localhost:3000

## Step 6: Test the Server

Open your browser and go to:
- http://localhost:3000 (Server info)
- http://localhost:3000/api/health (Health check)
- http://localhost:3000/api/stats (Statistics)

---

## 🎉 You're Done!

Your backend is now running. Check the README.md in the downloaded files for complete documentation.

## Quick Test with Example Client

Save this as `test-client.html` and open in your browser:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Client</title>
    <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
</head>
<body>
    <h1>Media Sync Test</h1>
    <button onclick="createRoom()">Create Room</button>
    <input id="roomId" placeholder="Room ID">
    <button onclick="joinRoom()">Join Room</button>
    <div id="status"></div>
    
    <script>
        const socket = io('http://localhost:3000');
        const status = document.getElementById('status');
        
        socket.on('connect', () => {
            status.innerHTML = 'Connected: ' + socket.id;
        });
        
        function createRoom() {
            socket.emit('room:create', {}, (response) => {
                status.innerHTML = 'Room created: ' + response.room.roomId;
            });
        }
        
        function joinRoom() {
            const roomId = document.getElementById('roomId').value;
            socket.emit('room:join', { roomId }, (response) => {
                status.innerHTML = response.success ? 'Joined!' : 'Error: ' + response.error;
            });
        }
    </script>
</body>
</html>
```
