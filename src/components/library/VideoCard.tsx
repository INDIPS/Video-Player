import React, { useState } from 'react';
import { StoredVideoItem, WatchProgress } from '../../types/video';
import { Play, Heart, Trash2, MoreVertical, Plus, Subtitles } from 'lucide-react';

interface VideoCardProps {
  video: StoredVideoItem;
  progress?: WatchProgress;
  onPlay: (video: StoredVideoItem, resumeTime?: number) => void;
  onToggleFavorite: (id: string, isFav: boolean) => void;
  onDelete: (id: string) => void;
  onAddToPlaylist: (video: StoredVideoItem) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  progress,
  onPlay,
  onToggleFavorite,
  onDelete,
  onAddToPlaylist,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const hasSubtitles = video.subtitles && video.subtitles.length > 0;
  const progressPercent = progress?.progressPercent || 0;
  const isCompleted = progress?.completed;

  return (
    <div className="group relative bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700 hover:shadow-xl transition-all flex flex-col">
      {/* Thumbnail Container */}
      <div
        className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer"
        onClick={() => onPlay(video, progress?.currentTime || 0)}
      >
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

        {/* Play Overlay Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl transition-transform active:scale-95">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* Category */}
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-950/80 backdrop-blur-xs text-slate-300 border border-slate-800">
            {video.category}
          </span>

          <div className="flex items-center gap-1">
            {hasSubtitles && (
              <span className="p-1 rounded bg-slate-950/80 backdrop-blur-xs text-amber-400 border border-slate-800" title="Subtitles Available">
                <Subtitles className="w-3 h-3" />
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950/80 backdrop-blur-xs text-slate-400 border border-slate-800">
              {video.aspectRatio}
            </span>
          </div>
        </div>

        {/* Bottom Badges: Duration & Progress */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-xs font-mono text-slate-200">
            {formatDuration(video.duration)}
          </span>
        </div>

        {/* Watch Progress Bar */}
        {progressPercent > 0 && !isCompleted && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 pointer-events-none">
            <div className="h-full bg-amber-500" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      {/* Info Card Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onPlay(video, progress?.currentTime || 0)}
              className="text-sm font-semibold text-white leading-snug line-clamp-2 cursor-pointer hover:text-amber-400 transition-colors"
              title={video.title}
            >
              {video.title}
            </h3>

            {/* Quick Actions Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-7 w-44 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl z-20 space-y-0.5"
                  onClick={() => setShowMenu(false)}
                >
                  <button
                    onClick={() => onToggleFavorite(video.id, !video.isFavorite)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors text-left"
                  >
                    <Heart className={`w-3.5 h-3.5 ${video.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{video.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}</span>
                  </button>
                  <button
                    onClick={() => onAddToPlaylist(video)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors text-left"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Playlist</span>
                  </button>
                  <button
                    onClick={() => onDelete(video.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from Vault</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Clean Unboxed Metadata Line (per zero-pill design rules) */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
            <span aria-hidden="true">·</span>
            <span>{video.codec || 'Video'}</span>
            {isCompleted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">Watched</span>
              </>
            )}
          </div>
        </div>

        {/* Tags Row */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 overflow-hidden">
            {video.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[11px] text-slate-400 hover:text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
