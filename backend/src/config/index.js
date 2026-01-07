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
            : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:8080'],
        credentials: true,
    },

    socket: {
        pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
        pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
        cors: {
            origin: process.env.CORS_ORIGIN
                ? process.env.CORS_ORIGIN.split(',')
                : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:8080'],
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