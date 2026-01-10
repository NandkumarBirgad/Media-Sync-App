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
  const playerRef = useRef<any>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for smooth slider experience
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync player position with room state when not host
  useEffect(() => {
    if (!isHost && playerRef.current && room?.mediaState && !seeking && !isDragging) {
      if (typeof playerRef.current.getCurrentTime === 'function') {
        const playerTime = playerRef.current.getCurrentTime();
        const stateTime = room.mediaState.currentTime;

        // Only seek if difference is significant (> 1s) to avoid jitter
        if (Math.abs(playerTime - stateTime) > 1) {
          playerRef.current.seekTo(stateTime, 'seconds');
        }
      }
    }
  }, [room?.mediaState.currentTime, isHost, seeking, isDragging]);

  // Reset played state when media changes
  useEffect(() => {
    setPlayed(0);
    setLocalProgress(0);
  }, [room?.mediaUrl]);

  // Sync with room state (external updates)
  useEffect(() => {
    if (!seeking && !isDragging && room?.mediaState) {
      setPlayed(room.mediaState.currentTime);
      const progress = room.mediaState.duration > 0
        ? (room.mediaState.currentTime / room.mediaState.duration) * 100
        : 0;
      setLocalProgress(progress);
    }
  }, [room?.mediaState.currentTime, seeking, isDragging]);

  if (!room) return null;

  const { mediaState, mediaTitle, mediaUrl } = room;
  const currentUrl = mediaUrl;

  // Sync Native Video with Room State
  useEffect(() => {
    const video = nativeVideoRef.current;
    if (video && room?.mediaState && !seeking && !isDragging) {
      const { isPlaying, currentTime } = room.mediaState;

      // Sync Play/Pause
      if (isPlaying && video.paused) {
        video.play().catch(e => console.error("Native play error:", e));
      } else if (!isPlaying && !video.paused) {
        video.pause();
      }

      // Sync Time (only if drift > 1s)
      if (Math.abs(video.currentTime - currentTime) > 1) {
        video.currentTime = currentTime;
      }
    }
  }, [room?.mediaState.isPlaying, room?.mediaState.currentTime, seeking, isDragging]);

  const handleNativePlay = () => {
    if (isHost && !mediaState.isPlaying) updateMediaState({ isPlaying: true });
  };

  const handleNativePause = () => {
    if (isHost && mediaState.isPlaying) {
      updateMediaState({
        isPlaying: false,
        currentTime: nativeVideoRef.current?.currentTime || mediaState.currentTime
      });
    }
  };

  const handleNativeTimeUpdate = () => {
    if (nativeVideoRef.current && !seeking && !isDragging) {
      setPlayed(nativeVideoRef.current.currentTime);
      const progress = mediaState.duration > 0
        ? (nativeVideoRef.current.currentTime / mediaState.duration) * 100
        : 0;
      setLocalProgress(progress);
    }
  };

  const handlePlayPause = () => {
    if (!isHost) return;

    let currentTime = mediaState.currentTime;
    if (nativeVideoRef.current) {
      currentTime = nativeVideoRef.current.currentTime;
    } else if (playerRef.current) {
      currentTime = playerRef.current.getCurrentTime();
    }

    updateMediaState({ isPlaying: !mediaState.isPlaying, currentTime });
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        toast.error("Fullscreen not supported");
      });
    } else {
      document.exitFullscreen();
    }
  };

  // ===== FIXED SEEKING LOGIC =====

  // Handle progress bar click (direct seek)
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    const newTime = (clampedPercentage / 100) * mediaState.duration;

    // Update immediately for smooth UX
    setLocalProgress(clampedPercentage);
    setPlayed(newTime);

    // Seek player
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, 'seconds');
    }
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = newTime;
    }

    // Update room state
    updateMediaState({ currentTime: newTime });
  };

  // Handle drag start
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    if (!isHost) return;
    setIsDragging(true);
    setSeeking(true);
    handleProgressDrag(e);
  };

  // Handle drag move
  const handleProgressDrag = (e: React.MouseEvent) => {
    if (!isDragging && !seeking) return;
    if (!isHost || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    const newTime = (clampedPercentage / 100) * mediaState.duration;

    // Update local state for smooth dragging
    setLocalProgress(clampedPercentage);
    setPlayed(newTime);
  };

  // Handle drag end
  const handleProgressMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setSeeking(false);

    // Commit the seek
    const newTime = (localProgress / 100) * mediaState.duration;

    if (playerRef.current) {
      playerRef.current.seekTo(newTime, 'seconds');
    }
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = newTime;
    }

    updateMediaState({ currentTime: newTime });
  };

  // Add global mouse listeners for drag
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = (clickX / rect.width) * 100;
        const clampedPercentage = Math.max(0, Math.min(100, percentage));

        const newTime = (clampedPercentage / 100) * mediaState.duration;
        setLocalProgress(clampedPercentage);
        setPlayed(newTime);
      };

      const handleMouseUp = () => {
        handleProgressMouseUp();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, mediaState.duration]);

  // ===== END SEEKING LOGIC =====

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
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = newTime;
    }
  };

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    if (!seeking && !isDragging) {
      setPlayed(state.playedSeconds);
      const progress = mediaState.duration > 0
        ? (state.playedSeconds / mediaState.duration) * 100
        : 0;
      setLocalProgress(progress);
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
    <div ref={containerRef} className="glass rounded-2xl p-4 lg:p-6 bg-background/50 backdrop-blur-xl">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*,audio/*"
        className="hidden"
      />

      {/* Media Player Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-muted group bg-black shadow-2xl">
        {currentUrl && currentUrl.includes('/uploads/') ? (
          <video
            src={currentUrl}
            ref={nativeVideoRef}
            className="w-full h-full object-contain"
            controls
            playsInline
            onPlay={handleNativePlay}
            onPause={handleNativePause}
            onTimeUpdate={handleNativeTimeUpdate}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              if (isHost && video.duration) {
                updateMediaState({ duration: video.duration });
              }
            }}
            onError={(e) => {
              console.error("Native Video Error", e);
              toast.error("Error loading video with native player.");
            }}
          />
        ) : (
          <ReactPlayer
            // @ts-ignore
            url={currentUrl}
            key={currentUrl}
            ref={playerRef}
            width="100%"
            height="100%"
            playing={!!mediaState.isPlaying}
            volume={mediaState.volume / 100}
            muted={mediaState.isMuted}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload',
                  disablePictureInPicture: true,
                  crossOrigin: "anonymous",
                  playsInline: true
                }
              }
            } as any}
            onProgress={handleProgress as any}
            onDuration={handleDuration}
            onEnded={() => isHost && updateMediaState({ isPlaying: false })}
            onError={(e) => {
              console.error("ReactPlayer Error:", e);
              toast.error("Error loading video (Check console).");
            }}
            controls={false}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />

        {/* Live Sync Indicator */}
        {/* Live Sync Indicator */}
        <div className={`absolute top-4 left-4 flex items-center gap-2 glass px-3 py-1.5 rounded-full z-10 ${isFullscreen ? 'hidden' : ''}`}>
          <Radio className="h-4 w-4 text-primary animate-sync-pulse" />
          <span className="text-xs font-medium text-foreground">LIVE SYNC</span>
        </div>

        {/* Host Controls Badge & Upload */}
        {/* Host Controls Badge & Upload */}
        <div className={`absolute top-4 right-4 flex items-center gap-2 z-30 ${isFullscreen ? 'hidden' : ''}`}>
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

      {/* Custom Progress Bar with Click & Drag Support */}
      <div className="space-y-2 mb-4">
        <div
          ref={progressBarRef}
          className={`relative w-full h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer ${!isHost ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={handleProgressBarClick}
          onMouseDown={handleProgressMouseDown}
        >
          {/* Progress Fill */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-100"
            style={{ width: `${localProgress}%` }}
          />

          {/* Draggable Handle */}
          {isHost && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-transform hover:scale-125"
              style={{ left: `calc(${localProgress}% - 8px)` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleProgressMouseDown(e as any);
              }}
            />
          )}
        </div>

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

          <Button variant="control" size="iconSm" onClick={toggleFullScreen}>
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