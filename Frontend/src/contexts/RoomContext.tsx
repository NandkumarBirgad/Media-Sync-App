import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Room, Participant, Message, MediaState, RoomContextType } from '@/types/room';

const RoomContext = createContext<RoomContextType | undefined>(undefined);

// Generate random room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Generate random ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Mock avatars
const avatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
];

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const createRoom = useCallback((roomName: string, userName: string) => {
    const userId = generateId();
    const roomCode = generateRoomCode();
    
    const host: Participant = {
      id: userId,
      name: userName,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      isHost: true,
      isSynced: true,
      joinedAt: new Date(),
    };

    const newRoom: Room = {
      id: generateId(),
      code: roomCode,
      name: roomName,
      hostId: userId,
      participants: [host],
      messages: [
        {
          id: generateId(),
          userId: 'system',
          userName: 'System',
          content: `${userName} created the room`,
          timestamp: new Date(),
          type: 'system',
        },
      ],
      mediaState: {
        isPlaying: false,
        currentTime: 0,
        duration: 180, // 3 minutes demo
        volume: 80,
        isMuted: false,
      },
      mediaUrl: 'https://example.com/media.mp4',
      mediaTitle: 'Chill Lofi Beats - Study Session',
      mediaThumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=400&fit=crop',
      createdAt: new Date(),
    };

    setRoom(newRoom);
    setCurrentUser(host);
    setIsConnected(true);

    // Simulate other users joining after a delay
    setTimeout(() => {
      setRoom(prev => {
        if (!prev) return prev;
        const newParticipant: Participant = {
          id: generateId(),
          name: 'Alex',
          avatar: avatars[1],
          isHost: false,
          isSynced: true,
          joinedAt: new Date(),
        };
        return {
          ...prev,
          participants: [...prev.participants, newParticipant],
          messages: [
            ...prev.messages,
            {
              id: generateId(),
              userId: 'system',
              userName: 'System',
              content: 'Alex joined the room',
              timestamp: new Date(),
              type: 'system',
            },
          ],
        };
      });
    }, 2000);

    setTimeout(() => {
      setRoom(prev => {
        if (!prev) return prev;
        const newParticipant: Participant = {
          id: generateId(),
          name: 'Jordan',
          avatar: avatars[2],
          isHost: false,
          isSynced: false,
          joinedAt: new Date(),
        };
        return {
          ...prev,
          participants: [...prev.participants, newParticipant],
          messages: [
            ...prev.messages,
            {
              id: generateId(),
              userId: 'system',
              userName: 'System',
              content: 'Jordan joined the room',
              timestamp: new Date(),
              type: 'system',
            },
          ],
        };
      });
    }, 4000);
  }, []);

  const joinRoom = useCallback((code: string, userName: string) => {
    // Simulate joining an existing room
    const userId = generateId();
    
    const user: Participant = {
      id: userId,
      name: userName,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      isHost: false,
      isSynced: true,
      joinedAt: new Date(),
    };

    const mockRoom: Room = {
      id: generateId(),
      code: code.toUpperCase(),
      name: 'Movie Night 🎬',
      hostId: 'host-123',
      participants: [
        {
          id: 'host-123',
          name: 'Host User',
          avatar: avatars[0],
          isHost: true,
          isSynced: true,
          joinedAt: new Date(Date.now() - 600000),
        },
        user,
      ],
      messages: [
        {
          id: generateId(),
          userId: 'system',
          userName: 'System',
          content: 'Welcome to the room!',
          timestamp: new Date(Date.now() - 600000),
          type: 'system',
        },
        {
          id: generateId(),
          userId: 'system',
          userName: 'System',
          content: `${userName} joined the room`,
          timestamp: new Date(),
          type: 'system',
        },
      ],
      mediaState: {
        isPlaying: true,
        currentTime: 45,
        duration: 180,
        volume: 80,
        isMuted: false,
      },
      mediaUrl: 'https://example.com/media.mp4',
      mediaTitle: 'Chill Lofi Beats - Study Session',
      mediaThumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=400&fit=crop',
      createdAt: new Date(Date.now() - 600000),
    };

    setRoom(mockRoom);
    setCurrentUser(user);
    setIsConnected(true);
  }, []);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setCurrentUser(null);
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!room || !currentUser) return;

    const newMessage: Message = {
      id: generateId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      timestamp: new Date(),
      type: 'message',
    };

    setRoom(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
    } : prev);
  }, [room, currentUser]);

  const updateMediaState = useCallback((state: Partial<MediaState>) => {
    if (!room) return;

    setRoom(prev => prev ? {
      ...prev,
      mediaState: { ...prev.mediaState, ...state },
    } : prev);
  }, [room]);

  const isHost = currentUser?.isHost ?? false;

  return (
    <RoomContext.Provider
      value={{
        room,
        currentUser,
        isHost,
        isConnected,
        joinRoom,
        createRoom,
        leaveRoom,
        sendMessage,
        updateMediaState,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
