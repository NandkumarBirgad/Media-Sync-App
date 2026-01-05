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