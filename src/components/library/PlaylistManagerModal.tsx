import React, { useState } from 'react';
import { Playlist, StoredVideoItem } from '../../types/video';
import { X, Plus, Trash2, ListVideo, Play, Check } from 'lucide-react';

interface PlaylistManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  videos: StoredVideoItem[];
  onCreatePlaylist: (name: string, description: string) => Promise<void>;
  onDeletePlaylist: (id: string) => Promise<void>;
  onToggleVideoInPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  onPlayPlaylist: (playlist: Playlist, startIndex?: number) => void;
  targetVideoForAdd?: StoredVideoItem | null;
}

export const PlaylistManagerModal: React.FC<PlaylistManagerModalProps> = ({
  isOpen,
  onClose,
  playlists,
  videos,
  onCreatePlaylist,
  onDeletePlaylist,
  onToggleVideoInPlaylist,
  onPlayPlaylist,
  targetVideoForAdd,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    playlists[0]?.id || ''
  );
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const currentPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await onCreatePlaylist(newPlaylistName.trim(), 'Custom offline playlist');
    setNewPlaylistName('');
    setIsCreating(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Playlist Manager"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ListVideo className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-semibold">Playlists & Queues</h2>
              <p className="text-xs text-slate-400">
                {targetVideoForAdd
                  ? `Select a playlist for "${targetVideoForAdd.title}"`
                  : 'Manage custom queues and sequential playback'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex flex-1 min-h-[380px] overflow-hidden">
          {/* Sidebar: Playlist List */}
          <div className="w-1/3 border-r border-slate-800 p-4 flex flex-col justify-between bg-slate-950/40">
            <div className="space-y-1 overflow-y-auto">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Your Playlists ({playlists.length})
              </span>

              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                    selectedPlaylistId === pl.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <span className="truncate pr-1">{pl.name}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      selectedPlaylistId === pl.id ? 'text-slate-950' : 'text-slate-500'
                    }`}
                  >
                    {pl.videoIds.length}
                  </span>
                </button>
              ))}

              {playlists.length === 0 && (
                <p className="text-xs text-slate-500 italic py-4">No playlists yet.</p>
              )}
            </div>

            {/* Create Playlist Section */}
            <div className="pt-3 border-t border-slate-800/80">
              {isCreating ? (
                <form onSubmit={handleCreate} className="space-y-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Playlist name..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="submit"
                      className="flex-1 py-1 rounded bg-amber-500 text-slate-950 text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-700 text-xs text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Playlist</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Panel: Selected Playlist Videos */}
          <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto">
            {currentPlaylist ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-semibold text-white">{currentPlaylist.name}</h3>
                    <p className="text-xs text-slate-400">
                      {currentPlaylist.videoIds.length} videos · Sequential playback enabled
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentPlaylist.videoIds.length > 0 && (
                      <button
                        onClick={() => {
                          onPlayPlaylist(currentPlaylist, 0);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-md transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play All</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDeletePlaylist(currentPlaylist.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* If quick-adding a single video from a card */}
                {targetVideoForAdd && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      Add <strong className="text-white">"{targetVideoForAdd.title}"</strong> to this playlist?
                    </span>
                    <button
                      onClick={() => onToggleVideoInPlaylist(currentPlaylist.id, targetVideoForAdd.id)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950"
                    >
                      {currentPlaylist.videoIds.includes(targetVideoForAdd.id) ? 'Remove' : 'Add'}
                    </button>
                  </div>
                )}

                {/* Video list inside playlist */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Videos in Queue
                  </span>

                  {currentPlaylist.videoIds.map((vidId, idx) => {
                    const video = videos.find((v) => v.id === vidId);
                    if (!video) return null;

                    return (
                      <div
                        key={vidId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 group hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-slate-500 w-4">{idx + 1}</span>
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-12 aspect-video rounded object-cover"
                          />
                          <div className="truncate">
                            <span className="text-xs font-medium text-white truncate block">
                              {video.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {video.aspectRatio} · {(video.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onPlayPlaylist(currentPlaylist, idx);
                              onClose();
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-400"
                            title="Play from here"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => onToggleVideoInPlaylist(currentPlaylist.id, vidId)}
                            className="p-1 rounded text-slate-500 hover:text-red-400"
                            title="Remove from playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {currentPlaylist.videoIds.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      Playlist is empty. Add videos from the Media Library.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Select or create a playlist on the left.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
