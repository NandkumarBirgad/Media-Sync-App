import React from 'react';
import { Crown, Check, AlertCircle, Users } from 'lucide-react';
import { useRoom } from '@/contexts/RoomContext';

const ParticipantList: React.FC = () => {
  const { room } = useRoom();

  if (!room) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Viewers</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {room.participants.length} online
        </span>
      </div>

      <div className="space-y-2">
        {room.participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            {/* Avatar */}
            <div className="relative">
              <img
                src={participant.avatar}
                alt={participant.name}
                className="h-10 w-10 rounded-full bg-muted"
              />
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
            </div>

            {/* Name and Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {participant.name}
                </span>
                {participant.isHost && (
                  <Crown className="h-4 w-4 text-warning flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {participant.isSynced ? (
                  <>
                    <Check className="h-3 w-3 text-success" />
                    <span className="text-xs text-success">Synced</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-warning" />
                    <span className="text-xs text-warning">Syncing...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantList;
