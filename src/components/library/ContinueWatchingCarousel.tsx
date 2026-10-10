import React, { useRef } from 'react';
import { StoredVideoItem, WatchProgress } from '../../types/video';
import { Play, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface ContinueWatchingCarouselProps {
  videos: StoredVideoItem[];
  progressMap: Record<string, WatchProgress>;
  onPlayVideo: (video: StoredVideoItem, resumeTime: number) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ContinueWatchingCarousel: React.FC<ContinueWatchingCarouselProps> = ({
  videos,
  progressMap,
  onPlayVideo,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter videos that have active progress (> 2 seconds, < 95% progress)
  const continueItems = videos
    .map((v) => ({
      video: v,
      progress: progressMap[v.id],
    }))
    .filter(
      (item) =>
        item.progress &&
        item.progress.currentTime > 2 &&
        item.progress.progressPercent < 95
    )
    .sort((a, b) => (b.progress?.lastWatchedAt || 0) - (a.progress?.lastWatchedAt || 0));

  if (continueItems.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-semibold text-white tracking-tight">Continue Watching</h2>
          <span className="text-xs text-slate-400 font-mono">({continueItems.length})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x scroll-smooth"
      >
        {continueItems.map(({ video, progress }) => {
          const timeLeft = Math.max(0, (video.duration || 0) - (progress?.currentTime || 0));

          return (
            <div
              key={video.id}
              onClick={() => onPlayVideo(video, progress?.currentTime || 0)}
              className="flex-none w-72 group cursor-pointer bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all snap-start"
            >
              {/* Thumbnail with Overlay & Progress Bar */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Dark Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Center Hover Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Time Left Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[11px] font-mono text-slate-300">
                  {formatDuration(timeLeft)} left
                </div>

                {/* Bottom Resume Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${progress?.progressPercent || 0}%` }}
                  />
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="p-3">
                <h3 className="text-xs font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span>{progress?.progressPercent || 0}% watched</span>
                  <span>·</span>
                  <span>{video.category}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
