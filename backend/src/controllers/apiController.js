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

  // Media Upload Route
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const { v4: uuidv4 } = require('uuid');

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = uuidv4();
      const ext = path.extname(file.originalname);
      cb(null, `video-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
  });

  router.post('/media/upload', upload.single('video'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Construct public URL
      const protocol = req.protocol;
      const host = req.get('host');
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      res.json({
        success: true,
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('[API] Upload error:', error);
      res.status(500).json({ success: false, error: 'Upload failed' });
    }
  });

  return router;
}

module.exports = initializeRoutes;