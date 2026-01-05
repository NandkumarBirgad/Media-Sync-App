import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, LogOut, Settings, Share2 } from 'lucide-react';
import { useRoom } from '@/contexts/RoomContext';
import { useToast } from '@/components/ui/use-toast';

const RoomHeader: React.FC = () => {
  const { room, isHost, leaveRoom } = useRoom();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    toast({
      title: 'Room code copied!',
      description: 'Share this code with friends to invite them.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="glass border-b border-border/50 sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo and Room Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Share2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:inline">SyncWatch</span>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="hidden sm:block">
            <h1 className="font-semibold text-foreground">{room.name}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
              >
                <span className="font-mono tracking-wider">{room.code}</span>
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              {isHost && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  Host
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="hidden sm:flex"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Invite
              </>
            )}
          </Button>

          {isHost && (
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={leaveRoom}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default RoomHeader;
