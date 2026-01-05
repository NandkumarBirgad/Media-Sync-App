import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Radio,
  Lock,
} from 'lucide-react';
import { useRoom } from '@/contexts/RoomContext';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MediaPlayer: React.FC = () => {
  const { room, isHost, updateMediaState } = useRoom();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressInterval = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (room?.mediaState.isPlaying) {
      progressInterval.current = window.setInterval(() => {
        updateMediaState({
          currentTime: Math.min(
            (room?.mediaState.currentTime || 0) + 1,
            room?.mediaState.duration || 0
          ),
        });
      }, 1000);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [room?.mediaState.isPlaying, updateMediaState]);

  if (!room) return null;

  const { mediaState, mediaTitle, mediaThumbnail } = room;
  const progress = (mediaState.currentTime / mediaState.duration) * 100;

  const handlePlayPause = () => {
    if (!isHost) return;
    updateMediaState({ isPlaying: !mediaState.isPlaying });
  };

  const handleSeek = (value: number[]) => {
    if (!isHost) return;
    const newTime = (value[0] / 100) * mediaState.duration;
    updateMediaState({ currentTime: newTime });
  };

  const handleVolumeChange = (value: number[]) => {
    updateMediaState({ volume: value[0], isMuted: value[0] === 0 });
  };

  const handleMuteToggle = () => {
    updateMediaState({ isMuted: !mediaState.isMuted });
  };

  const handleSkip = (direction: 'back' | 'forward') => {
    if (!isHost) return;
    const skipAmount = 10;
    const newTime = direction === 'back'
      ? Math.max(0, mediaState.currentTime - skipAmount)
      : Math.min(mediaState.duration, mediaState.currentTime + skipAmount);
    updateMediaState({ currentTime: newTime });
  };

  return (
    <div className="glass rounded-2xl p-4 lg:p-6">
      {/* Media Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-muted group">
        <img
          src={mediaThumbnail}
          alt={mediaTitle}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {/* Live Sync Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 glass px-3 py-1.5 rounded-full">
          <Radio className="h-4 w-4 text-primary animate-sync-pulse" />
          <span className="text-xs font-medium text-foreground">LIVE SYNC</span>
        </div>

        {/* Host Badge */}
        {isHost && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-full">
            <Lock className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">HOST CONTROLS</span>
          </div>
        )}

        {/* Center Play Button */}
        <button
          onClick={handlePlayPause}
          disabled={!isHost}
          className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${!isHost ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
        >
          <div className="h-20 w-20 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center glow-primary transition-transform hover:scale-110">
            {mediaState.isPlaying ? (
              <Pause className="h-8 w-8 text-primary-foreground ml-0" />
            ) : (
              <Play className="h-8 w-8 text-primary-foreground ml-1" />
            )}
          </div>
        </button>
      </div>

      {/* Media Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground truncate">{mediaTitle}</h3>
        <p className="text-sm text-muted-foreground">Synced with {room.participants.length} viewers</p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-4">
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          disabled={!isHost}
          className={`${!isHost ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(mediaState.currentTime)}</span>
          <span>{formatTime(mediaState.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="control"
            size="iconSm"
            onClick={() => handleSkip('back')}
            disabled={!isHost}
            className={!isHost ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="glow"
            size="icon"
            onClick={handlePlayPause}
            disabled={!isHost}
            className={!isHost ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {mediaState.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="control"
            size="iconSm"
            onClick={() => handleSkip('forward')}
            disabled={!isHost}
            className={!isHost ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Volume Control */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Button variant="control" size="iconSm" onClick={handleMuteToggle}>
              {mediaState.isMuted || mediaState.volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>

            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 glass rounded-lg p-3 w-8 h-28">
                <Slider
                  value={[mediaState.isMuted ? 0 : mediaState.volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  orientation="vertical"
                  className="h-full"
                />
              </div>
            )}
          </div>

          <Button variant="control" size="iconSm">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Host Control Notice */}
      {!isHost && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Only the host can control playback
        </p>
      )}
    </div>
  );
};

export default MediaPlayer;
