import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoredVideoItem, AspectRatioMode, SubtitleTrack, PlayerSettings } from '../../types/video';
import { getActiveCue } from '../../services/subtitleParser';
import { SubtitleSettingsModal } from './SubtitleSettingsModal';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture2,
  Subtitles,
  Settings,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Sun,
  ListVideo,
  Check,
} from 'lucide-react';

interface VideoPlayerProps {
  video: StoredVideoItem;
  initialTime?: number;
  playlist?: StoredVideoItem[];
  currentIndex?: number;
  onClose: () => void;
  onTimeUpdate: (currentTime: number, duration: number, immediate?: boolean) => void;
  onPlayNext?: () => void;
  onPlayPrevious?: () => void;
  settings: PlayerSettings;
  onUpdateSettings: (settings: Partial<PlayerSettings>) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  initialTime = 0,
  playlist = [],
  currentIndex = -1,
  onClose,
  onTimeUpdate,
  onPlayNext,
  onPlayPrevious,
  settings,
  onUpdateSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(video.duration || 0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [showRemainingTime, setShowRemainingTime] = useState(false);

  // HUD and Gesture Feedback
  const [hudFeedback, setHudFeedback] = useState<{
    text: string;
    icon?: 'volume' | 'brightness' | 'seek-forward' | 'seek-backward' | 'speed';
  } | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subtitles
  const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>(video.subtitles || []);
  const [activeCueText, setActiveCueText] = useState<string | null>(null);

  // Scrub bar hover preview
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);

  // Aspect ratio & visual filter
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>(settings.aspectRatio || 'fit');
  const [brightness, setBrightness] = useState<number>(settings.brightness || 100);

  // Speed Menu
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);

  // Touch gesture tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number; type?: 'left' | 'right' } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Blob URL management
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('');

  useEffect(() => {
    let url = '';
    if (video.blob) {
      url = URL.createObjectURL(video.blob);
      setVideoSourceUrl(url);
    } else {
      setVideoSourceUrl(video.thumbnailUrl || '');
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [video]);

  // Sync available subtitles
  useEffect(() => {
    setAvailableSubtitles(video.subtitles || []);
  }, [video.subtitles]);

  // Show temporary HUD message
  const triggerHud = useCallback((text: string, icon?: 'volume' | 'brightness' | 'seek-forward' | 'seek-backward' | 'speed') => {
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    setHudFeedback({ text, icon });
    hudTimeoutRef.current = setTimeout(() => {
      setHudFeedback(null);
    }, 1200);
  }, []);

  // Controls Visibility management (auto-hide after 3s of stillness)
  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
        setShowSpeedMenu(false);
        setShowAspectMenu(false);
      }, 2800);
    }
  }, [isPlaying]);

  const handleUserActivity = () => {
    resetControlsTimer();
  };

  // Initial resume seek
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleLoadedMetadata = () => {
      if (vid.duration) setDuration(vid.duration);
      if (initialTime > 0 && initialTime < vid.duration) {
        vid.currentTime = initialTime;
      }
      vid.playbackRate = settings.playbackRate;
      vid.volume = settings.isMuted ? 0 : settings.volume;
      vid.preservesPitch = true;
    };

    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [initialTime, settings.playbackRate, settings.volume, settings.isMuted]);

  // Video Event Handlers
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused) {
      vid.play().then(() => {
        setIsPlaying(true);
        resetControlsTimer();
      }).catch((e) => console.warn('Play error:', e));
    } else {
      vid.pause();
      setIsPlaying(false);
      setIsControlsVisible(true);
      // Immediately save progress on pause
      onTimeUpdate(vid.currentTime, vid.duration, true);
    }
  }, [resetControlsTimer, onTimeUpdate]);

  const seekRelative = useCallback((seconds: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    const target = Math.max(0, Math.min(vid.duration || duration, vid.currentTime + seconds));
    vid.currentTime = target;
    setCurrentTime(target);
    triggerHud(seconds > 0 ? `+${seconds}s` : `${seconds}s`, seconds > 0 ? 'seek-forward' : 'seek-backward');
    resetControlsTimer();
  }, [duration, resetControlsTimer, triggerHud]);

  const stepFrame = useCallback((forward: boolean) => {
    const vid = videoRef.current;
    if (!vid) return;
    if (!vid.paused) vid.pause();
    // Assuming standard ~30fps frame delta
    const frameDelta = 1 / 30;
    const target = Math.max(0, Math.min(vid.duration || duration, vid.currentTime + (forward ? frameDelta : -frameDelta)));
    vid.currentTime = target;
    setCurrentTime(target);
    triggerHud(forward ? '+1 Frame' : '-1 Frame');
  }, [duration, triggerHud]);

  // Volume Changes
  const handleVolumeChange = useCallback((newVolume: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    const clamped = Math.max(0, Math.min(1, newVolume));
    vid.volume = clamped;
    vid.muted = clamped === 0;
    onUpdateSettings({ volume: clamped, isMuted: clamped === 0 });
    triggerHud(`${Math.round(clamped * 100)}%`, 'volume');
  }, [onUpdateSettings, triggerHud]);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const newMuted = !settings.isMuted;
    vid.muted = newMuted;
    if (!newMuted && settings.volume === 0) {
      vid.volume = 0.5;
      onUpdateSettings({ volume: 0.5, isMuted: false });
    } else {
      onUpdateSettings({ isMuted: newMuted });
    }
    triggerHud(newMuted ? 'Muted' : `${Math.round(vid.volume * 100)}%`, 'volume');
  }, [settings.isMuted, settings.volume, onUpdateSettings, triggerHud]);

  // Speed Changes
  const handleSpeedChange = useCallback((rate: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = rate;
    vid.preservesPitch = true;
    onUpdateSettings({ playbackRate: rate });
    setShowSpeedMenu(false);
    triggerHud(`${rate}x Speed`, 'speed');
  }, [onUpdateSettings, triggerHud]);

  // Brightness Changes
  const handleBrightnessChange = useCallback((delta: number) => {
    setBrightness((prev) => {
      const next = Math.max(50, Math.min(150, prev + delta));
      onUpdateSettings({ brightness: next });
      triggerHud(`Brightness: ${next}%`, 'brightness');
      return next;
    });
  }, [onUpdateSettings, triggerHud]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  }, []);

  // PiP toggle
  const togglePiP = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await vid.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  }, []);

  // Progress bar scrub click & drag
  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    const bar = progressBarRef.current;
    if (!vid || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * duration;

    vid.currentTime = targetTime;
    setCurrentTime(targetTime);
    onTimeUpdate(targetTime, duration);
  }, [duration, onTimeUpdate]);

  const handleMouseMoveOnBar = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleMouseLeaveBar = () => {
    setHoverPosition(null);
  };

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'KeyJ':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'KeyL':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange((videoRef.current?.volume || 0.5) + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange((videoRef.current?.volume || 0.5) - 0.05);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyP':
          e.preventDefault();
          togglePiP();
          break;
        case 'KeyC':
          e.preventDefault();
          onUpdateSettings({ subtitlesEnabled: !settings.subtitlesEnabled });
          triggerHud(settings.subtitlesEnabled ? 'Captions Off' : 'Captions On');
          break;
        case 'BracketLeft':
          e.preventDefault();
          handleSpeedChange(Math.max(0.25, settings.playbackRate - 0.25));
          break;
        case 'BracketRight':
          e.preventDefault();
          handleSpeedChange(Math.min(2.5, settings.playbackRate + 0.25));
          break;
        case 'Comma':
          e.preventDefault();
          stepFrame(false);
          break;
        case 'Period':
          e.preventDefault();
          stepFrame(true);
          break;
        case 'Escape':
          if (showPlaylistDrawer) setShowPlaylistDrawer(false);
          if (isSubtitleModalOpen) setIsSubtitleModalOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    seekRelative,
    handleVolumeChange,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    handleSpeedChange,
    stepFrame,
    settings,
    onUpdateSettings,
    triggerHud,
    showPlaylistDrawer,
    isSubtitleModalOpen,
  ]);

  // Touch & Swipe Gestures (Double tap to skip, vertical swipe for volume/brightness)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    resetControlsTimer();
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const isRightHalf = touch.clientX > rect.left + rect.width / 2;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      type: isRightHalf ? 'right' : 'left',
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchStart = touchStartRef.current;
    if (!touchStart) return;

    const changedTouch = e.changedTouches[0];
    const deltaX = changedTouch.clientX - touchStart.x;
    const deltaY = changedTouch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    // Detect Vertical Swipe (Volume on right, Brightness on left)
    if (Math.abs(deltaY) > 40 && Math.abs(deltaY) > Math.abs(deltaX) && deltaTime < 500) {
      if (touchStart.type === 'right') {
        // Right side: Volume
        const volDelta = deltaY < 0 ? 0.1 : -0.1;
        handleVolumeChange((videoRef.current?.volume || 0.5) + volDelta);
      } else {
        // Left side: Brightness
        const brightDelta = deltaY < 0 ? 10 : -10;
        handleBrightnessChange(brightDelta);
      }
      touchStartRef.current = null;
      return;
    }

    // Detect Double Tap for 10s skip
    const now = Date.now();
    const lastTap = lastTapRef.current;
    if (lastTap && now - lastTap.time < 300) {
      const containerWidth = containerRef.current?.clientWidth || 0;
      if (changedTouch.clientX < containerWidth * 0.35) {
        seekRelative(-10);
      } else if (changedTouch.clientX > containerWidth * 0.65) {
        seekRelative(10);
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = {
        x: changedTouch.clientX,
        y: changedTouch.clientY,
        time: now,
      };
    }

    touchStartRef.current = null;
  };

  // Video Time Update & Subtitle Tracking
  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;

    const cur = vid.currentTime;
    setCurrentTime(cur);

    // Save progress periodically
    onTimeUpdate(cur, vid.duration || duration);

    // Track active subtitle cue
    if (settings.subtitlesEnabled && availableSubtitles.length > 0) {
      const activeTrack =
        availableSubtitles.find((t) => t.id === settings.activeSubtitleTrackId) ||
        availableSubtitles.find((t) => t.isDefault) ||
        availableSubtitles[0];

      if (activeTrack && activeTrack.cues) {
        const cue = getActiveCue(activeTrack.cues, cur);
        setActiveCueText(cue ? cue.text : null);
      } else {
        setActiveCueText(null);
      }
    } else {
      setActiveCueText(null);
    }

    // Update buffered time
    if (vid.buffered && vid.buffered.length > 0) {
      for (let i = 0; i < vid.buffered.length; i++) {
        if (vid.buffered.start(i) <= cur && cur <= vid.buffered.end(i)) {
          setBufferedTime(vid.buffered.end(i));
          break;
        }
      }
    }
  };

  // Cleanup on close / unmount: ensure final progress is stored
  const handleClose = () => {
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      onTimeUpdate(vid.currentTime, vid.duration || duration, true);
    }
    onClose();
  };

  // Computed Aspect Ratio classes
  const getAspectRatioStyle = (): string => {
    switch (aspectMode) {
      case 'fill':
        return 'object-cover w-full h-full';
      case '16:9':
        return 'aspect-video object-contain w-full h-full';
      case '4:3':
        return 'aspect-4/3 object-contain w-full h-full';
      case 'original':
        return 'object-none max-w-full max-h-full';
      case 'fit':
      default:
        return 'object-contain w-full h-full';
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Element */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{ filter: `brightness(${brightness}%)` }}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={videoSourceUrl}
          playsInline
          className={getAspectRatioStyle()}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            if (settings.autoPlayNext && onPlayNext) {
              onPlayNext();
            }
          }}
          onWaiting={() => {}}
          onPlaying={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Subtitles Overlay */}
      {settings.subtitlesEnabled && activeCueText && (
        <div
          className={`absolute left-0 right-0 px-8 flex justify-center pointer-events-none z-20 ${
            settings.subtitleStyles.position === 'top' ? 'top-16' : 'bottom-24'
          }`}
        >
          <div
            className="rounded px-4 py-1.5 text-center leading-relaxed tracking-wide transition-all shadow-lg max-w-3xl whitespace-pre-line"
            style={{
              color: settings.subtitleStyles.textColor,
              backgroundColor: `rgba(0, 0, 0, ${settings.subtitleStyles.backgroundOpacity})`,
              fontSize:
                settings.subtitleStyles.fontSize === 'sm'
                  ? '14px'
                  : settings.subtitleStyles.fontSize === 'base'
                  ? '17px'
                  : settings.subtitleStyles.fontSize === 'lg'
                  ? '21px'
                  : settings.subtitleStyles.fontSize === 'xl'
                  ? '26px'
                  : '32px',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {activeCueText}
          </div>
        </div>
      )}

      {/* Center HUD Feedback Indicator (Gestures & Shortcut confirms) */}
      {hudFeedback && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
          <div className="bg-slate-900/85 text-white backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-700/60 shadow-2xl animate-in zoom-in-95 duration-100">
            {hudFeedback.icon === 'volume' && <Volume2 className="w-8 h-8 text-amber-400" />}
            {hudFeedback.icon === 'brightness' && <Sun className="w-8 h-8 text-amber-400" />}
            {hudFeedback.icon === 'seek-forward' && <RotateCw className="w-8 h-8 text-amber-400" />}
            {hudFeedback.icon === 'seek-backward' && <RotateCcw className="w-8 h-8 text-amber-400" />}
            {hudFeedback.icon === 'speed' && <Settings className="w-8 h-8 text-amber-400" />}
            <span className="text-xl font-bold tracking-tight">{hudFeedback.text}</span>
          </div>
        </div>
      )}

      {/* Top Controls Overlay */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          isControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-white backdrop-blur-md border border-slate-700/40 transition-colors"
            title="Return to Media Library (Esc)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-white tracking-tight truncate max-w-md md:max-w-xl">
              {video.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{video.aspectRatio}</span>
              <span>·</span>
              <span>{video.codec || 'Standard'}</span>
              <span>·</span>
              <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        </div>

        {/* Right Header Buttons */}
        <div className="flex items-center gap-2">
          {playlist.length > 1 && (
            <button
              onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border backdrop-blur-md transition-colors ${
                showPlaylistDrawer
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                  : 'bg-slate-900/60 text-white border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              <ListVideo className="w-4 h-4" />
              <span className="hidden sm:inline">
                Playlist ({currentIndex + 1}/{playlist.length})
              </span>
            </button>
          )}

          <button
            onClick={() => setIsSubtitleModalOpen(true)}
            className={`p-2 rounded-xl backdrop-blur-md border transition-colors ${
              settings.subtitlesEnabled
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-900/60 text-white border-slate-700/40 hover:bg-slate-800'
            }`}
            title="Subtitles & Audio Track Settings (C)"
          >
            <Subtitles className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Playlist Drawer */}
      {showPlaylistDrawer && playlist.length > 0 && (
        <div
          className="absolute right-4 top-20 bottom-24 w-80 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-30 flex flex-col space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-sm font-semibold text-white">Playlist Queue</span>
            <span className="text-xs text-slate-400">{playlist.length} items</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {playlist.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  if (idx !== currentIndex && onPlayNext && onPlayPrevious) {
                    if (idx > currentIndex) onPlayNext();
                    else onPlayPrevious();
                  }
                }}
                className={`p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                  idx === currentIndex
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-xs font-mono w-4 text-slate-500">{idx + 1}</span>
                <div className="flex-1 truncate">
                  <div className="text-xs font-medium truncate">{item.title}</div>
                  <div className="text-[11px] text-slate-400">{formatTime(item.duration)}</div>
                </div>
                {idx === currentIndex && (
                  <span className="text-[10px] uppercase font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/20">
                    Playing
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 z-30 transition-opacity duration-300 ${
          isControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Interactive Scrub Timeline with Hover Preview */}
        <div
          ref={progressBarRef}
          onClick={handleScrub}
          onMouseMove={handleMouseMoveOnBar}
          onMouseLeave={handleMouseLeaveBar}
          className="relative w-full h-3 group cursor-pointer flex items-center"
        >
          {/* Background track */}
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full group-hover:h-2.5 transition-all overflow-hidden relative">
            {/* Buffered bar */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-slate-600/60 rounded-full"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Played progress bar */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-amber-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrubber Thumb Knob */}
          <div
            className="absolute -ml-2 w-4 h-4 bg-amber-400 border-2 border-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverPosition !== null && (
            <div
              className="absolute -top-9 -translate-x-1/2 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs font-mono text-white shadow-xl pointer-events-none"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Primary Controls Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Group: Playback & Volume */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Skip Previous Video (if in playlist) */}
            {playlist.length > 1 && (
              <button
                onClick={onPlayPrevious}
                disabled={currentIndex <= 0}
                className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800/60 transition-colors"
                title="Previous in Playlist"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="p-2.5 sm:p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-transform active:scale-95 shadow-lg"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Skip Next Video (if in playlist) */}
            {playlist.length > 1 && (
              <button
                onClick={onPlayNext}
                disabled={currentIndex >= playlist.length - 1}
                className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800/60 transition-colors"
                title="Next in Playlist"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Quick Seek Buttons */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Seek Backward 10s (Left Arrow / J)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => seekRelative(10)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Seek Forward 10s (Right Arrow / L)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Frame step buttons (fine-grained inspection) */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                onClick={() => stepFrame(false)}
                className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Step backward 1 frame (,)"
              >
                -1F
              </button>
              <button
                onClick={() => stepFrame(true)}
                className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Step forward 1 frame (.)"
              >
                +1F
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1 group ml-1 sm:ml-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                title="Mute / Unmute (M)"
              >
                {settings.isMuted || settings.volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : settings.volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.isMuted ? 0 : settings.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                title="Volume"
              />
            </div>

            {/* Time Stamp Display */}
            <div
              onClick={() => setShowRemainingTime(!showRemainingTime)}
              className="text-xs font-mono text-slate-300 hover:text-white cursor-pointer select-none tabular-nums ml-2"
              title="Click to toggle remaining time"
            >
              <span>{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{showRemainingTime ? `-${formatTime(Math.max(0, duration - currentTime))}` : formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Group: Aspect Ratio, Speed, Subtitles, PiP, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowAspectMenu(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 transition-colors"
                title="Playback Speed ([ and ])"
              >
                {settings.playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-11 right-0 w-28 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-2xl backdrop-blur-md z-40 space-y-1">
                  {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full flex items-center justify-between px-2.5 py-1 text-xs rounded-md transition-colors ${
                        settings.playbackRate === speed
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{speed}x</span>
                      {settings.playbackRate === speed && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aspect Ratio Selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => {
                  setShowAspectMenu(!showAspectMenu);
                  setShowSpeedMenu(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 uppercase transition-colors"
                title="Aspect Ratio"
              >
                {aspectMode}
              </button>
              {showAspectMenu && (
                <div className="absolute bottom-11 right-0 w-32 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-2xl backdrop-blur-md z-40 space-y-1">
                  {(['fit', 'fill', '16:9', '4:3', 'original'] as AspectRatioMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setAspectMode(mode);
                        onUpdateSettings({ aspectRatio: mode });
                        setShowAspectMenu(false);
                        triggerHud(`Aspect: ${mode.toUpperCase()}`);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1 text-xs rounded-md transition-colors uppercase ${
                        aspectMode === mode
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{mode}</span>
                      {aspectMode === mode && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture-in-Picture Button */}
            <button
              onClick={togglePiP}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Picture-in-Picture (P)"
            >
              <PictureInPicture2 className="w-5 h-5" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Subtitles & Audio Settings Modal */}
      <SubtitleSettingsModal
        isOpen={isSubtitleModalOpen}
        onClose={() => setIsSubtitleModalOpen(false)}
        subtitles={availableSubtitles}
        activeTrackId={settings.activeSubtitleTrackId}
        onSelectTrack={(trackId) => onUpdateSettings({ activeSubtitleTrackId: trackId })}
        onAddCustomTrack={(track) => setAvailableSubtitles((prev) => [...prev, track])}
        styles={settings.subtitleStyles}
        onUpdateStyles={(styles) =>
          onUpdateSettings({ subtitleStyles: { ...settings.subtitleStyles, ...styles } })
        }
        subtitlesEnabled={settings.subtitlesEnabled}
        onToggleSubtitles={(enabled) => onUpdateSettings({ subtitlesEnabled: enabled })}
      />
    </div>
  );
};
