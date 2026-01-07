export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isSynced: boolean;
  joinedAt: Date;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'message' | 'system';
}

export interface MediaState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  participants: Participant[];
  messages: Message[];
  mediaState: MediaState;
  mediaUrl?: string;
  mediaTitle?: string;
  mediaThumbnail?: string;
  createdAt: Date;
}

export interface RoomContextType {
  room: Room | null;
  currentUser: Participant | null;
  isHost: boolean;
  isConnected: boolean;
  joinRoom: (code: string, userName: string) => void;
  createRoom: (roomName: string, userName: string) => void;
  leaveRoom: () => void;
  sendMessage: (content: string) => void;
  updateMediaState: (state: Partial<MediaState>) => void;
  changeMedia: (mediaUrl: string, mediaTitle?: string) => void;
}
