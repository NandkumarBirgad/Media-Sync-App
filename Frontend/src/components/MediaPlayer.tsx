import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
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
  Upload,
} from 'lucide-react';
import { useRoom } from '@/contexts/RoomContext';
import { toast } from 'sonner';

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MediaPlayer: React.FC = () => {
  const { room, isHost, updateMediaState, changeMedia } = useRoom();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync player position with room state when not host
  useEffect(() => {
    if (!isHost && playerRef.current && room?.mediaState) {
      // ReactPlayer might not be fully initialized or ref might not be the instance in some cases
      // Safety check for getCurrentTime
      if (typeof playerRef.current.getCurrentTime === 'function') {
        const playerTime = playerRef.current.getCurrentTime();
        const stateTime = room.mediaState.currentTime;

        // Only seek if difference is significant (> 1s) to avoid jitter
        if (Math.abs(playerTime - stateTime) > 1) {
          playerRef.current.seekTo(stateTime, 'seconds');
        }
      }
    }
  }, [room?.mediaState.currentTime, isHost]);

  // Local state for smooth slider experience
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);

  // Reset played state when media changes (new video uploaded)
  useEffect(() => {
    setPlayed(0);
  }, [room?.mediaUrl]);

  // Sync with room state (external updates)
  useEffect(() => {
    if (!seeking && room?.mediaState) {
      setPlayed(room.mediaState.currentTime);
    }
  }, [room?.mediaState.currentTime, seeking]);

  if (!room) return null;

  const { mediaState, mediaTitle, mediaThumbnail, mediaUrl } = room;
  // Use room media URL
  const currentUrl = mediaUrl;

  const progress = mediaState.duration > 0
    ? (played / mediaState.duration) * 100
    : 0;

  const handlePlayPause = () => {
    if (!isHost) return;
    updateMediaState({ isPlaying: !mediaState.isPlaying });
  };

  const handleSeekChange = (value: number[]) => {
    setPlayed((value[0] / 100) * mediaState.duration);
  };

  const handleSeekCommit = (value: number[]) => {
    if (!isHost) return;
    const newTime = (value[0] / 100) * mediaState.duration;
    updateMediaState({ currentTime: newTime });
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, 'seconds');
    }
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
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, 'seconds');
    }
  };

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.playedSeconds);
    }
  };

  const handleDuration = (duration: number) => {
    if (isHost && Math.abs(mediaState.duration - duration) > 1) {
      updateMediaState({ duration });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isHost) {
        toast.error("Only host can upload videos");
        return;
      }

      const formData = new FormData();
      formData.append('video', file);

      const uploadPromise = new Promise<{ url: string }>(async (resolve, reject) => {
        try {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/media/upload`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();

          if (data.success) {
            changeMedia(data.data.url, file.name);
            resolve({ url: data.data.url });
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch (err: any) {
          reject(err);
        }
      });

      toast.promise(uploadPromise, {
        loading: 'Uploading media...',
        success: 'Media uploaded and synced!',
        error: (err) => `Upload failed: ${err.message}`,
      });
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="glass rounded-2xl p-4 lg:p-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*,audio/*"
        className="hidden"
      />

      {/* Media Player Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-muted group bg-black border-2 border-red-500">
        {/* @ts-ignore */}
        <ReactPlayer
          key={currentUrl} // Force remount on URL change
          ref={playerRef}
          url={currentUrl}
          width="100%"
          height="100%"
          playing={!!mediaState.isPlaying}
          volume={mediaState.volume / 100}
          muted={mediaState.isMuted}
          onProgress={handleProgress as any}
          onEnded={() => isHost && updateMediaState({ isPlaying: false })}
          onError={(e) => {
            console.error("ReactPlayer Error:", e);
            toast.error("Error loading video. Format may not be supported or file wasn't found.");
          }}
          controls={true} // Enable native controls for debugging
          style={{ position: 'absolute', top: 0, left: 0 }}
        />

        {/* FALLBACK RAW VIDEO TEST */}
        {currentUrl && (
          <video
            src={currentUrl}
            controls
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50, border: '2px solid yellow' }}
            onError={(e) => console.error("Raw Video Tag Error", e)}
          />
        )}

        {/* Overlays (Only show when hovering or paused, or always for some elements) */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />

        {/* Live Sync Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 glass px-3 py-1.5 rounded-full z-10">
          <Radio className="h-4 w-4 text-primary animate-sync-pulse" />
          <span className="text-xs font-medium text-foreground">LIVE SYNC</span>
        </div>

        {/* Host Controls Badge & Upload */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
          {isHost && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-black/50 hover:bg-black/70 border-none text-white backdrop-blur-sm"
                onClick={triggerFileUpload}
              >
                <Upload className="h-3 w-3" />
                Upload
              </Button>
              <div className="flex items-center gap-2 bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Lock className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">HOST</span>
              </div>
            </>
          )}
        </div>

        {/* Center Play Button Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity z-20 ${!mediaState.isPlaying || (room.participants.length > 1 && isHost) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
        >
          <button
            onClick={handlePlayPause}
            disabled={!isHost}
            className={`transition-transform hover:scale-110 ${!isHost ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="h-20 w-20 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center glow-primary">
              {mediaState.isPlaying ? (
                <Pause className="h-8 w-8 text-primary-foreground ml-0" />
              ) : (
                <Play className="h-8 w-8 text-primary-foreground ml-1" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Media Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground truncate">{mediaTitle || 'Shared Video'}</h3>
        <p className="text-sm text-muted-foreground">Synced with {room.participants.length} viewers</p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-4">
        <Slider
          value={[progress]}
          onValueChange={handleSeekChange}
          onValueCommit={handleSeekCommit}
          max={100}
          step={0.1}
          disabled={!isHost}
          onPointerDown={() => setSeeking(true)}
          onPointerUp={() => setSeeking(false)}
          className={`${!isHost ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(played)}</span>
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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 glass rounded-lg p-3 w-8 h-28 z-30">
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
