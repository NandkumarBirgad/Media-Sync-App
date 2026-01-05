const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    socketId: { type: String, required: true },
    name: { type: String, default: 'User' },
    avatar: { type: String, default: '' },
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

roomSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});

roomSchema.statics.findByParticipant = function (socketId) {
    return this.findOne({ 'participants.socketId': socketId });
};

roomSchema.methods.isHost = function (socketId) {
    return this.hostSocketId === socketId;
};

roomSchema.methods.addParticipant = function (socketId) {
    if (!this.participants.some(p => p.socketId === socketId)) {
        this.participants.push({ socketId, joinedAt: new Date() });
    }
    return this;
};

roomSchema.methods.removeParticipant = function (socketId) {
    this.participants = this.participants.filter(p => p.socketId !== socketId);
    return this;
};

roomSchema.methods.assignNewHost = function () {
    if (this.participants.length > 0) {
        this.hostSocketId = this.participants[0].socketId;
        return this.hostSocketId;
    }
    return null;
};

module.exports = mongoose.model('Room', roomSchema);