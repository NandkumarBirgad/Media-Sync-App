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
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async clear() {
        await Room.deleteMany({});
        this.socketToRoom.clear();
    }
}

module.exports = MongoRoomService;