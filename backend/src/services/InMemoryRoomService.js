const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class InMemoryRoomService {
    constructor() {
        this.rooms = new Map();
        this.socketToRoom = new Map();
        this.startCleanupInterval();
    }

    createRoom(hostSocketId, roomId = null, hostDetails = {}) {
        const id = roomId || this._generateRoomId();
        const room = {
            roomId: id,
            hostSocketId,
            participants: [{
                socketId: hostSocketId,
                name: hostDetails.name || 'Host',
                avatar: hostDetails.avatar || '',
                joinedAt: new Date()
            }],
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

    joinRoom(roomId, socketId, userDetails = {}) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        if (room.participants.some(p => p.socketId === socketId)) return room;
        if (room.participants.length >= config.room.maxParticipants) {
            throw new Error('Room is full');
        }
        room.participants.push({
            socketId,
            name: userDetails.name || 'User',
            avatar: userDetails.avatar || '',
            joinedAt: new Date()
        });
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
        if (updates.mediaTitle !== undefined) room.mediaTitle = updates.mediaTitle;
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
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    clear() {
        this.rooms.clear();
        this.socketToRoom.clear();
    }
}

module.exports = InMemoryRoomService;