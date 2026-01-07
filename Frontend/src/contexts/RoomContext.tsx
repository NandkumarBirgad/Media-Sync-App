import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, Participant, Message, MediaState, RoomContextType } from '@/types/room';
import { BACKEND_URL } from '@/config';
import { toast } from 'sonner';

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to backend');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      toast.error('Failed to connect to server');
    });

    // Room events
    socket.on('user:joined', ({ socketId, name, avatar, participantCount }) => {
      console.log(`User ${socketId} (${name}) joined. Count: ${participantCount}`);

      setRoom(prev => {
        if (!prev) return null;
        // Avoid duplicates if already in list
        if (prev.participants.some(p => p.id === socketId)) return prev;

        const newParticipant: Participant = {
          id: socketId,
          name: name || `User ${socketId.substr(0, 4)}`,
          isHost: false, // Joiners are never hosts initially
          isSynced: true,
          joinedAt: new Date(),
          avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${socketId}`
        };

        return {
          ...prev,
          participants: [...prev.participants, newParticipant]
        };
      });

      toast.success(`${name || 'A user'} joined the room`);
    });

    socket.on('chat:message', (message: Message) => {
      setRoom(prev => {
        if (!prev) return null;
        // Avoid duplicate messages if any quirk re-sends
        if (prev.messages.some(m => m.id === message.id)) return prev;

        return {
          ...prev,
          messages: [...prev.messages, message]
        };
      });
    });

    socket.on('user:left', ({ socketId, participantCount }) => {
      console.log(`User ${socketId} left. Count: ${participantCount}`);
      setRoom(prev => prev ? {
        ...prev,
        participants: prev.participants.filter(p => p.id !== socketId)
      } : null);
      toast.info('A user left the room');
    });

    socket.on('user:disconnected', ({ socketId }) => {
      setRoom(prev => prev ? {
        ...prev,
        participants: prev.participants.filter(p => p.id !== socketId)
      } : null);
    });

    socket.on('host:updated', ({ newHostSocketId, message }) => {
      toast.info(message);
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          hostId: newHostSocketId,
          participants: prev.participants.map(p => ({
            ...p,
            isHost: p.id === newHostSocketId
          }))
        };
      });
      // Update current user if they are the new host
      setCurrentUser(prev => {
        if (!prev) return null;
        return { ...prev, isHost: prev.id === newHostSocketId };
      });
    });

    // Media events
    socket.on('media:sync', (data) => {
      setRoom(prev => prev ? {
        ...prev,
        mediaState: {
          ...prev.mediaState,
          isPlaying: data.isPlaying,
          currentTime: data.currentTime,
        },
        mediaUrl: data.mediaUrl || prev.mediaUrl
      } : null);
    });

    socket.on('media:play', ({ currentTime }) => {
      setRoom(prev => prev ? {
        ...prev,
        mediaState: { ...prev.mediaState, isPlaying: true, currentTime }
      } : null);
    });

    socket.on('media:pause', ({ currentTime }) => {
      setRoom(prev => prev ? {
        ...prev,
        mediaState: { ...prev.mediaState, isPlaying: false, currentTime }
      } : null);
    });

    socket.on('media:seek', ({ currentTime, isPlaying }) => {
      setRoom(prev => prev ? {
        ...prev,
        mediaState: { ...prev.mediaState, currentTime, isPlaying: isPlaying ?? prev.mediaState.isPlaying }
      } : null);
    });

    socket.on('media:change', ({ mediaUrl, currentTime, isPlaying }) => {
      setRoom(prev => prev ? {
        ...prev,
        mediaUrl,
        mediaState: { ...prev.mediaState, currentTime, isPlaying }
      } : null);
      toast.info('Media changed');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((roomName: string, userName: string) => {
    if (!socketRef.current) return;

    // Using simple room ID generation or letting backend handle it
    // Let backend generate the 6-digit Room ID
    // We send roomName if we want to store it (backend support needed, or we just map it on success)

    // Note: Backend socketHandler might expect roomId if we provide it, or generate if missing.
    // We will NOT send roomId, so backend generates it.
    // We might want to pass roomName if backend stores it, but currently backend models only have roomId.
    // We'll handle the roomName on the client side mapping for now, or update backend later to store it.

    // Generate random avatar for current user if they don't have one (though JoinModal likely handles this?)
    // Actually, JoinModal passes 'userName'. We can generate avatar here or in modal.
    // Let's generate it here for the backend payload.
    const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}-${Date.now()}`;

    socketRef.current.emit('room:create', { roomName, userName, avatar: userAvatar }, (response: any) => {
      if (response.success) {
        const newRoom: Room = {
          id: response.room.roomId,
          code: response.room.roomId,
          name: roomName,
          hostId: response.room.hostSocketId,
          participants: response.room.participants.map((p: any) => ({
            id: p.socketId,
            name: p.name || `User ${p.socketId.substr(0, 4)}`,
            isHost: p.socketId === response.room.hostSocketId,
            isSynced: true,
            joinedAt: new Date(p.joinedAt),
            avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.socketId}`
          })),
          messages: [],
          mediaState: {
            isPlaying: response.room.isPlaying,
            currentTime: response.room.currentTime,
            duration: 0,
            volume: 100,
            isMuted: false
          },
          mediaUrl: response.room.mediaUrl || 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          mediaTitle: response.room.mediaTitle || 'Big Buck Bunny',
          mediaThumbnail: '',
          createdAt: new Date(response.room.createdAt)
        };

        setRoom(newRoom);
        setCurrentUser(newRoom.participants.find(p => p.id === socketRef.current?.id) || null);
        toast.success(response.message);
      } else {
        toast.error(response.error);
      }
    });
  }, []);

  const joinRoom = useCallback((code: string, userName: string) => {
    if (!socketRef.current) return;

    const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}-${Date.now()}`;

    socketRef.current.emit('room:join', { roomId: code, userName, avatar: userAvatar }, (response: any) => {
      if (response.success) {
        const newRoom: Room = {
          id: response.room.roomId,
          code: response.room.roomId,
          name: `Room ${response.room.roomId}`,
          hostId: response.room.hostSocketId,
          participants: response.room.participants.map((p: any) => ({
            id: p.socketId,
            name: p.name || `User ${p.socketId.substr(0, 4)}`,
            isHost: p.socketId === response.room.hostSocketId,
            isSynced: true,
            joinedAt: new Date(p.joinedAt),
            avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.socketId}`
          })),
          messages: [],
          mediaState: {
            isPlaying: response.room.isPlaying,
            currentTime: response.room.currentTime,
            duration: 0,
            volume: 100,
            isMuted: false
          },
          mediaUrl: response.room.mediaUrl || 'https://example.com/media.mp4',
          mediaTitle: 'Shared Media',
          mediaThumbnail: '',
          createdAt: new Date(response.room.createdAt)
        };

        setRoom(newRoom);
        setCurrentUser(newRoom.participants.find(p => p.id === socketRef.current?.id) || null);
        toast.success(response.message);
      } else {
        toast.error(response.error);
      }
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave', (response: any) => {
      if (response.success) {
        setRoom(null);
        setCurrentUser(null);
        toast.success('Left room');
      } else {
        toast.error(response.error);
      }
    });
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current || !room || !currentUser) return;

    socketRef.current.emit('chat:message', {
      content,
      userName: currentUser.name
    }, (response: any) => {
      if (!response.success) {
        toast.error('Failed to send message');
      }
    });
  }, [room, currentUser]);

  const updateMediaState = useCallback((state: Partial<MediaState>) => {
    if (!socketRef.current || !room) return;

    // Optimistic update
    setRoom(prev => prev ? {
      ...prev,
      mediaState: { ...prev.mediaState, ...state }
    } : prev);

    if (state.isPlaying !== undefined) {
      if (state.isPlaying) {
        socketRef.current.emit('media:play', { currentTime: room.mediaState.currentTime });
      } else {
        socketRef.current.emit('media:pause', { currentTime: room.mediaState.currentTime });
      }
    }

    if (state.currentTime !== undefined) {
      // Debounce seeking might be needed, but strictly one-off seek:
      socketRef.current.emit('media:seek', { currentTime: state.currentTime });
    }
  }, [room]);

  const changeMedia = useCallback((mediaUrl: string, mediaTitle?: string) => {
    if (!socketRef.current || !room) return;

    // Optimistic update
    setRoom(prev => prev ? {
      ...prev,
      mediaUrl,
      mediaTitle: mediaTitle || prev.mediaTitle,
      mediaState: { ...prev.mediaState, currentTime: 0, isPlaying: true } // Auto-play on change
    } : prev);

    socketRef.current.emit('media:change', { mediaUrl, mediaTitle });
  }, [room]);

  const isHost = currentUser?.isHost ?? false;

  return (
    <RoomContext.Provider
      value={{
        room,
        currentUser,
        isHost,
        isConnected, // Connected to WS
        joinRoom,
        createRoom,
        leaveRoom,
        sendMessage,
        updateMediaState,
        changeMedia,
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
