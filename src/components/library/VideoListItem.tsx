import React from 'react';
import { StoredVideoItem, WatchProgress } from '../../types/video';
import { Play, Heart, Trash2, Plus, Subtitles } from 'lucide-react';

interface VideoListItemProps {
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

export const VideoListItem: React.FC<VideoListItemProps> = ({
  video,
  progress,
  onPlay,
  onToggleFavorite,
  onDelete,
  onAddToPlaylist,
}) => {
  const hasSubtitles = video.subtitles && video.subtitles.length > 0;
  const progressPercent = progress?.progressPercent || 0;

  return (
    <div className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700/80 transition-all gap-4">
      {/* Left: Thumbnail & Title */}
      <div
        className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
        onClick={() => onPlay(video, progress?.currentTime || 0)}
      >
        <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-slate-950 shrink-0">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-4 h-4 text-white fill-current" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
              {video.title}
            </h3>
            {hasSubtitles && (
              <span className="p-0.5 rounded text-amber-400 shrink-0" title="Subtitles Available">
                <Subtitles className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <span>{video.category}</span>
            <span aria-hidden="true">·</span>
            <span>{video.filename}</span>
          </div>
        </div>
      </div>

      {/* Middle Metadata: Resolution, Duration, Size */}
      <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 tabular-nums shrink-0">
        <div className="w-16 text-right">
          <span>{video.width}×{video.height}</span>
        </div>
        <div className="w-14 text-right">
          <span>{formatDuration(video.duration)}</span>
        </div>
        <div className="w-16 text-right">
          <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
        </div>
        <div className="w-20">
          {progressPercent > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-[11px] text-slate-300">{progressPercent}%</span>
            </div>
          ) : (
            <span className="text-slate-600">Unwatched</span>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggleFavorite(video.id, !video.isFavorite)}
          className={`p-1.5 rounded-lg transition-colors ${
            video.isFavorite
              ? 'text-red-500 hover:bg-red-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={video.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
        >
          <Heart className={`w-4 h-4 ${video.isFavorite ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={() => onAddToPlaylist(video)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Add to Playlist"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(video.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete from Vault"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
