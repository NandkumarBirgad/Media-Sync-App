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
// Trigger restart