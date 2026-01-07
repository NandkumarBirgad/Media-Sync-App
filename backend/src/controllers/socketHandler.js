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
            socket.on('chat:message', (data, callback) => this.handleChatMessage(socket, data, callback));
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
        console.log('[SocketHandler] Initialized');
    }

    async handleRoomCreate(socket, data = {}, callback) {
        try {
            const { roomId, userName, avatar } = data;
            const room = await this.roomService.createRoom(socket.id, roomId, { name: userName, avatar });
            socket.join(room.roomId);
            console.log(`[Room] Created: ${room.roomId} by ${socket.id} (${userName})`);
            if (callback) callback({ success: true, room: this._sanitizeRoom(room), message: 'Room created successfully' });
        } catch (error) {
            console.error('[Room] Create error:', error);
            if (callback) callback({ success: false, error: error.message });
        }
    }

    async handleRoomJoin(socket, data, callback) {
        try {
            const { roomId, userName, avatar } = data;
            if (!roomId) throw new Error('Room ID is required');

            const room = await this.roomService.joinRoom(roomId, socket.id, { name: userName, avatar });
            socket.join(roomId);
            console.log(`[Room] ${socket.id} (${userName}) joined ${roomId}`);

            socket.to(roomId).emit('user:joined', {
                socketId: socket.id,
                name: userName,
                avatar: avatar,
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

            const { mediaUrl, mediaTitle } = data;
            if (!mediaUrl) throw new Error('Media URL is required');

            const updatedRoom = await this.roomService.updateRoomState(room.roomId, {
                mediaUrl,
                mediaTitle,
                currentTime: 0,
                isPlaying: true, // Auto-play on change
            });

            console.log(`[Media] Changed in ${room.roomId} to ${mediaUrl} (${mediaTitle})`);
            this.io.to(room.roomId).emit('media:change', {
                mediaUrl: updatedRoom.mediaUrl,
                mediaTitle: updatedRoom.mediaTitle || 'Shared Media',
                currentTime: 0,
                isPlaying: true, // Auto-play broadcast
                timestamp: Date.now(),
            });

            if (callback) callback({ success: true, message: 'Media changed successfully' });
        } catch (error) {
            console.error('[Media] Change error:', error);
            if (callback) callback({ success: false, error: error.message });
        }
    }

    async handleChatMessage(socket, data, callback) {
        try {
            const room = await this.roomService.getRoomByParticipant(socket.id);
            if (!room) throw new Error('Not in any room');

            const { content, userName } = data;
            if (!content || !content.trim()) throw new Error('Message content is required');

            const message = {
                id: Math.random().toString(36).substr(2, 9),
                userId: socket.id,
                userName: userName || 'Unknown',
                content,
                timestamp: new Date(),
                type: 'message',
            };

            console.log(`[Chat] Message in ${room.roomId} from ${socket.id}: ${content}`);

            // Broadcast to everyone in the room (including sender, for simple sync)
            this.io.to(room.roomId).emit('chat:message', message);

            if (callback) callback({ success: true, message: 'Message sent' });
        } catch (error) {
            console.error('[Chat] Error:', error);
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
            participants: room.participants.map(p => ({
                socketId: p.socketId,
                name: p.name,
                avatar: p.avatar,
                joinedAt: p.joinedAt
            })),
            participantCount: room.participants.length,
            mediaUrl: room.mediaUrl,
            isPlaying: room.isPlaying,
            currentTime: room.currentTime,
            createdAt: room.createdAt,
        };
    }
}

module.exports = SocketHandler;