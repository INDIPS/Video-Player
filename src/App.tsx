import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StoredVideoItem, VideoCategory, Playlist } from './types/video';
import { dbService } from './services/db';
import { processImportedFiles, openDirectoryWithFileSystemAPI, extractFilesFromDataTransfer } from './services/fileScanner';
import { generateDemoMediaVault } from './services/sampleMedia';
import { useWatchProgress } from './hooks/useWatchProgress';
import { Header } from './components/common/Header';
import { VideoPlayer } from './components/player/VideoPlayer';
import { ContinueWatchingCarousel } from './components/library/ContinueWatchingCarousel';
import { VideoCard } from './components/library/VideoCard';
import { VideoListItem } from './components/library/VideoListItem';
import { PlaylistManagerModal } from './components/library/PlaylistManagerModal';
import { StorageManagerModal } from './components/library/StorageManagerModal';
import { ArchitectureBlueprintModal } from './components/library/ArchitectureBlueprintModal';
import {
  Search,
  LayoutGrid,
  LayoutList,
  Sparkles,
  Upload,
  HardDrive,
  Heart,
  SlidersHorizontal,
  Film,
  Plus,
} from 'lucide-react';

export default function App() {
  const [videos, setVideos] = useState<StoredVideoItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Playback State
  const [activeVideo, setActiveVideo] = useState<StoredVideoItem | null>(null);
  const [activeResumeTime, setActiveResumeTime] = useState<number>(0);
  const [activePlaylistQueue, setActivePlaylistQueue] = useState<StoredVideoItem[]>([]);
  const [activePlaylistIndex, setActivePlaylistIndex] = useState<number>(-1);

  // View & Filter State
  const [activeView, setActiveView] = useState<'library' | 'playlists' | 'storage' | 'docs'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'duration' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [playlistTargetVideo, setPlaylistTargetVideo] = useState<StoredVideoItem | null>(null);

  // Background import & generation progress
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Watch Progress Hook
  const {
    allProgress,
    saveWatchTime,
    playerSettings,
    updatePlayerSettings,
    reloadData: reloadProgressData,
  } = useWatchProgress();

  // Load Library Data from IndexedDB
  const loadData = useCallback(async () => {
    try {
      const [allVideos, allPlaylists] = await Promise.all([
        dbService.getAllVideos(),
        dbService.getAllPlaylists(),
      ]);
      setVideos(allVideos);
      setPlaylists(allPlaylists);
    } catch (err) {
      console.warn('Failed to load library from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Initial View switching from header
  const handleSelectView = (view: 'library' | 'playlists' | 'storage' | 'docs') => {
    setActiveView(view);
    if (view === 'playlists') setIsPlaylistModalOpen(true);
    if (view === 'storage') setIsStorageModalOpen(true);
    if (view === 'docs') setIsDocsModalOpen(true);
  };

  // Import local files
  const handleImportFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessingFiles(true);
    setImportStatus(`Analyzing ${files.length} file(s)...`);

    try {
      const parsedItems = await processImportedFiles(files, (curr, total, name) => {
        setImportStatus(`Processing [${curr}/${total}]: ${name}`);
      });

      for (const item of parsedItems) {
        await dbService.saveVideo(item);
      }

      await loadData();
      setImportStatus('');
    } catch (err) {
      console.error('File import error:', err);
      alert('Error importing files. Please ensure valid video files were selected.');
    } finally {
      setIsProcessingFiles(false);
      setImportStatus('');
    }
  };

  // Import directory via File System Access API
  const handleImportDirectory = async () => {
    setIsProcessingFiles(true);
    setImportStatus('Scanning directory structure...');

    try {
      const parsedItems = await openDirectoryWithFileSystemAPI((curr, total, name) => {
        setImportStatus(`Extracting [${curr}/${total}]: ${name}`);
      });

      for (const item of parsedItems) {
        await dbService.saveVideo(item);
      }

      await loadData();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Directory scanner error:', err);
      }
    } finally {
      setIsProcessingFiles(false);
      setImportStatus('');
    }
  };

  // Procedural Sample Media Generator
  const handleGenerateDemo = async () => {
    setIsGeneratingDemo(true);
    setImportStatus('Generating synthetic 1080p offline demo vault with subtitles...');

    try {
      const samples = await generateDemoMediaVault();
      for (const sample of samples) {
        await dbService.saveVideo(sample);
      }

      // Also create a sample playlist
      const samplePlaylist: Playlist = {
        id: `pl-demo-${Date.now()}`,
        name: 'Showcase Cinema Reel',
        description: 'Synthetic offline media showcase reel',
        videoIds: samples.map((s) => s.id),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await dbService.savePlaylist(samplePlaylist);

      await loadData();
      await reloadProgressData();
    } catch (err) {
      console.error('Demo generation error:', err);
    } finally {
      setIsGeneratingDemo(false);
      setImportStatus('');
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsProcessingFiles(true);
      setImportStatus('Parsing dropped items & directories...');
      try {
        const files = await extractFilesFromDataTransfer(e.dataTransfer.items);
        await handleImportFiles(files);
      } catch (err) {
        console.error('Drag drop error:', err);
      } finally {
        setIsProcessingFiles(false);
      }
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string, isFav: boolean) => {
    await dbService.updateVideoMetadata(id, { isFavorite: isFav });
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, isFavorite: isFav } : v)));
  };

  // Delete Video safely
  const handleDeleteVideo = async (id: string) => {
    if (window.confirm('Delete this video from your offline vault?')) {
      await dbService.deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      // Remove from playlists if present
      for (const pl of playlists) {
        if (pl.videoIds.includes(id)) {
          const updated = {
            ...pl,
            videoIds: pl.videoIds.filter((vId) => vId !== id),
            updatedAt: Date.now(),
          };
          await dbService.savePlaylist(updated);
        }
      }
      loadData();
    }
  };

  // Play video with optional resume timestamp
  const handlePlayVideo = (video: StoredVideoItem, resumeTime: number = 0, queue: StoredVideoItem[] = [], index: number = -1) => {
    setActiveVideo(video);
    setActiveResumeTime(resumeTime);
    setActivePlaylistQueue(queue);
    setActivePlaylistIndex(index);
  };

  // Play a full playlist sequentially
  const handlePlayPlaylist = (playlist: Playlist, startIndex = 0) => {
    const queue = playlist.videoIds
      .map((id) => videos.find((v) => v.id === id))
      .filter((v): v is StoredVideoItem => v !== undefined);

    if (queue.length > 0 && queue[startIndex]) {
      handlePlayVideo(queue[startIndex], 0, queue, startIndex);
    }
  };

  const handlePlayNextInQueue = () => {
    if (activePlaylistQueue.length > 0 && activePlaylistIndex < activePlaylistQueue.length - 1) {
      const nextIdx = activePlaylistIndex + 1;
      const nextVideo = activePlaylistQueue[nextIdx];
      setActiveVideo(nextVideo);
      setActivePlaylistIndex(nextIdx);
      setActiveResumeTime(0);
    }
  };

  const handlePlayPreviousInQueue = () => {
    if (activePlaylistQueue.length > 0 && activePlaylistIndex > 0) {
      const prevIdx = activePlaylistIndex - 1;
      const prevVideo = activePlaylistQueue[prevIdx];
      setActiveVideo(prevVideo);
      setActivePlaylistIndex(prevIdx);
      setActiveResumeTime(0);
    }
  };

  // Playlist Management Handlers
  const handleCreatePlaylist = async (name: string, description: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      videoIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await dbService.savePlaylist(newPl);
    await loadData();
  };

  const handleDeletePlaylist = async (id: string) => {
    await dbService.deletePlaylist(id);
    await loadData();
  };

  const handleToggleVideoInPlaylist = async (playlistId: string, videoId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;

    const exists = pl.videoIds.includes(videoId);
    const updated: Playlist = {
      ...pl,
      videoIds: exists ? pl.videoIds.filter((id) => id !== videoId) : [...pl.videoIds, videoId],
      updatedAt: Date.now(),
    };

    await dbService.savePlaylist(updated);
    await loadData();
  };

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    return videos
      .filter((v) => {
        // Category filter
        if (selectedCategory !== 'All' && v.category !== selectedCategory) {
          return false;
        }
        // Favorite filter
        if (onlyFavorites && !v.isFavorite) {
          return false;
        }
        // Search query filter (instant fuzzy match by title, filename, or tags)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = v.title.toLowerCase().includes(q);
          const matchesFilename = v.filename.toLowerCase().includes(q);
          const matchesTags = v.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchesTitle && !matchesFilename && !matchesTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'date') cmp = a.dateAdded - b.dateAdded;
        else if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
        else if (sortBy === 'duration') cmp = a.duration - b.duration;
        else if (sortBy === 'size') cmp = a.size - b.size;

        return sortOrder === 'desc' ? -cmp : cmp;
      });
  }, [videos, selectedCategory, onlyFavorites, searchQuery, sortBy, sortOrder]);

  const totalVaultSize = useMemo(() => {
    return videos.reduce((acc, v) => acc + (v.size || 0), 0);
  }, [videos]);

  const categories: string[] = ['All', 'Movies', 'Courses', 'Personal', 'Clips'];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative"
    >
      {/* Drag & Drop Visual Scrim */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 border-4 border-dashed border-amber-500 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none space-y-4">
          <Upload className="w-16 h-16 text-amber-500 animate-bounce" />
          <div className="text-xl font-bold text-white">Drop video files or folders here</div>
          <p className="text-sm text-slate-400">
            Files will be indexed and stored safely inside local offline storage
          </p>
        </div>
      )}

      {/* Top Bar Contract Navigation */}
      <Header
        activeView={activeView}
        onSelectView={handleSelectView}
        onImportFiles={handleImportFiles}
        onImportDirectory={handleImportDirectory}
        onGenerateDemo={handleGenerateDemo}
        isGeneratingDemo={isGeneratingDemo}
      />

      {/* Toast / Status banner when scanning or generating */}
      {(isProcessingFiles || isGeneratingDemo || importStatus) && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-200">
          <div className="w-2.5 h-2.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          <span>{importStatus || 'Processing media files...'}</span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Continue Watching Section */}
        {videos.length > 0 && (
          <ContinueWatchingCarousel
            videos={videos}
            progressMap={allProgress}
            onPlayVideo={(v, time) => handlePlayVideo(v, time)}
          />
        )}

        {/* Library Control Bar: Search & Filtering */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-slate-850">
          {/* Left: Search input */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fuzzy search title, tags, or file..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Center: Interactive Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                onlyFavorites
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
              <span>Favorites</span>
            </button>
          </div>

          {/* Right: Sort & View Toggle */}
          <div className="flex items-center justify-between lg:justify-end gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'duration' | 'size')}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="date">Date Added</option>
                <option value="title">Title</option>
                <option value="duration">Duration</option>
                <option value="size">File Size</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Compact List View"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Grid / List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading IndexedDB offline vault...</span>
          </div>
        ) : filteredVideos.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  progress={allProgress[video.id]}
                  onPlay={(v, time) => handlePlayVideo(v, time)}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDeleteVideo}
                  onAddToPlaylist={(v) => {
                    setPlaylistTargetVideo(v);
                    setIsPlaylistModalOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVideos.map((video) => (
                <VideoListItem
                  key={video.id}
                  video={video}
                  progress={allProgress[video.id]}
                  onPlay={(v, time) => handlePlayVideo(v, time)}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDeleteVideo}
                  onAddToPlaylist={(v) => {
                    setPlaylistTargetVideo(v);
                    setIsPlaylistModalOpen(true);
                  }}
                />
              ))}
            </div>
          )
        ) : videos.length === 0 ? (
          /* Empty State: Initial Onboarding */
          <div className="py-16 px-6 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
              <Film className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Your Offline Video Vault is Ready</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Import local files (.mp4, .mkv, .webm, .mov) or folders. Everything runs strictly
                offline inside sandboxed IndexedDB storage with zero external tracking.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleGenerateDemo}
                disabled={isGeneratingDemo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Sample Vault (3 Clips)</span>
              </button>

              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'video/*,.mp4,.mkv,.webm,.mov';
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files) handleImportFiles(Array.from(target.files));
                  };
                  input.click();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-medium text-xs transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Select Local Videos</span>
              </button>
            </div>
          </div>
        ) : (
          /* Filter No Results State */
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-slate-400">No media found matching current filter or search criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setOnlyFavorites(false);
              }}
              className="px-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-amber-400 hover:text-amber-300"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Floating Storage & Vault Bar Footer */}
      <footer className="border-t border-slate-850 bg-slate-950/80 px-6 py-3 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-amber-500" />
            <span>Vault: {videos.length} videos</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-300">{(totalVaultSize / (1024 * 1024)).toFixed(1)} MB consumed</span>
          <span aria-hidden="true">·</span>
          <span>Strictly Local Storage</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDocsModalOpen(true)}
            className="hover:text-amber-400 transition-colors"
          >
            Architecture & Specs
          </button>
          <button
            onClick={() => setIsStorageModalOpen(true)}
            className="hover:text-amber-400 transition-colors"
          >
            Manage Storage
          </button>
        </div>
      </footer>

      {/* Active Fullscreen Video Player */}
      {activeVideo && (
        <VideoPlayer
          video={activeVideo}
          initialTime={activeResumeTime}
          playlist={activePlaylistQueue}
          currentIndex={activePlaylistIndex}
          onClose={() => setActiveVideo(null)}
          onTimeUpdate={(time, dur, immediate) => {
            saveWatchTime(activeVideo.id, time, dur, immediate);
          }}
          onPlayNext={handlePlayNextInQueue}
          onPlayPrevious={handlePlayPreviousInQueue}
          settings={playerSettings}
          onUpdateSettings={updatePlayerSettings}
        />
      )}

      {/* Playlist Manager Modal */}
      <PlaylistManagerModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setPlaylistTargetVideo(null);
        }}
        playlists={playlists}
        videos={videos}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onToggleVideoInPlaylist={handleToggleVideoInPlaylist}
        onPlayPlaylist={handlePlayPlaylist}
        targetVideoForAdd={playlistTargetVideo}
      />

      {/* Storage Manager Modal */}
      <StorageManagerModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        videos={videos}
        onRefreshLibrary={loadData}
      />

      {/* Architecture Blueprint Modal */}
      <ArchitectureBlueprintModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />
    </div>
  );
}
