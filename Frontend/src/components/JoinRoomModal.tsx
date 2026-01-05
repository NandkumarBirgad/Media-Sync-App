import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Sparkles, ArrowRight } from 'lucide-react';
import { useRoom } from '@/contexts/RoomContext';

interface JoinRoomModalProps {
  onClose: () => void;
  mode: 'create' | 'join';
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ onClose, mode }) => {
  const { createRoom, joinRoom } = useRoom();
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (mode === 'create') {
      createRoom(roomName || 'My Room', userName);
    } else {
      if (!roomCode.trim()) return;
      joinRoom(roomCode, userName);
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-slide-up">
      <div className="glass-strong w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
            {mode === 'create' ? (
              <Sparkles className="h-6 w-6 text-primary" />
            ) : (
              <Users className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {mode === 'create' ? 'Create a Room' : 'Join a Room'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'create'
                ? 'Start a new sync session'
                : 'Enter the room code to join'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Your Name
            </label>
            <Input
              type="text"
              placeholder="Enter your display name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-muted/50 border-border/50 focus:border-primary"
              required
            />
          </div>

          {mode === 'create' ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Room Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., Movie Night 🎬"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-muted/50 border-border/50 focus:border-primary"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Room Code
              </label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="bg-muted/50 border-border/50 focus:border-primary uppercase tracking-widest text-center text-lg"
                maxLength={6}
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="glow"
              className="flex-1"
              disabled={isLoading || !userName.trim() || (mode === 'join' && !roomCode.trim())}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'create' ? 'Create Room' : 'Join Room'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinRoomModal;
