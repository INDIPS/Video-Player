import React, { useState } from 'react';
import { X, Layers, Database, Cpu, Terminal, CheckCircle2, Copy, Check } from 'lucide-react';

interface ArchitectureBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureBlueprintModal: React.FC<ArchitectureBlueprintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'schema' | 'setup'>('blueprint');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Architecture and Execution Documentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-semibold">Technical Architecture & Execution Blueprint</h2>
              <p className="text-xs text-slate-400">Offline Video Vault System Architecture & Implementation Specifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'blueprint'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            1. Architecture Blueprint
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'schema'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            2. State & Data Schema
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'setup'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            3. Setup & Execution Instructions
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {activeTab === 'blueprint' && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  Component Hierarchy & Layout Breakdown
                </h3>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-300">
                  <pre>{`App.tsx (Root State, Router & Global Modals)
├── Header.tsx (3-Zone Top Bar: Brand · View Filters · Import Dropdown)
├── ContinueWatchingCarousel.tsx (Progress-tracked recent media items)
├── Library Toolbar (Search Input · Category Filters · Sort · Grid/List Switch)
├── Media Library View
│   ├── VideoCard.tsx (Grid layout with dynamic scrub preview)
│   └── VideoListItem.tsx (Compact tabular data row)
├── VideoPlayer.tsx (Primary Cinema Engine)
│   ├── HTML5 <video> with Pitch-corrected playbackRate & WebGL Brightness
│   ├── SubtitleOverlay (Real-time binary-search Cue synchronization)
│   ├── Touch & Swipe Gesture Engine (Volume / Brightness / ±10s ripple HUD)
│   ├── Interactive Timeline Scrubber (Buffered range + hover timestamp)
│   └── SubtitleSettingsModal.tsx (Custom fonts, opacity & external SRT/VTT parser)
├── PlaylistManagerModal.tsx (Queue management & sequential playback)
└── StorageManagerModal.tsx (IndexedDB quota inspection & purge controls)`}</pre>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  Key Architectural Strengths
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <li className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                    <strong className="text-white block mb-1">Strictly Offline (Zero Leak)</strong>
                    All media blobs and metadata reside in client-side IndexedDB. No external analytics, telemetry, or remote API queries.
                  </li>
                  <li className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                    <strong className="text-white block mb-1">High Memory Efficiency</strong>
                    Object URLs generated from video blobs are revoked upon unmount. Off-screen canvas captures downscaled 480px WebP thumbnails to conserve storage.
                  </li>
                  <li className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                    <strong className="text-white block mb-1">Sub-Frame Accurate Audio Pitch</strong>
                    Utilizes HTML5 AudioContext and video <code className="text-amber-400">preservesPitch = true</code> for chipmunk-free 0.25x–2.5x variable speed playback.
                  </li>
                  <li className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                    <strong className="text-white block mb-1">Automatic Subtitle Association</strong>
                    Folder scanning pairs matching subtitle files (<code className="text-amber-400">.srt</code>, <code className="text-amber-400">.vtt</code>) with video files by base name prefix.
                  </li>
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" />
                  IndexedDB Storage Schema (`AeroCinemaDB` v1)
                </h3>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
                  <pre>{`// Store: "videos" (KeyPath: "id")
interface StoredVideoItem {
  id: string;               // UUID / hash identifier
  title: string;            // Human-readable title
  filename: string;         // e.g. "Cosmic_Horizons.mp4"
  size: number;             // Exact file byte length
  mimeType: string;         // "video/mp4", "video/webm", etc.
  duration: number;         // Float duration in seconds
  width: number;            // Pixel resolution width
  height: number;           // Pixel resolution height
  aspectRatio: string;      // "16:9", "4:3", "2.35:1"
  codec?: string;           // Extracted or container tag
  thumbnailUrl: string;     // Base64 WebP cached frame
  category: string;         // 'Movies' | 'Courses' | 'Personal' | 'Clips'
  tags: string[];           // Extracted keywords
  isFavorite: boolean;      // User favorite flag
  dateAdded: number;        // Epoch timestamp
  lastModified: number;     // File modification timestamp
  blob?: Blob;              // Raw binary video data (sandboxed)
  subtitles?: SubtitleTrack[]; // Parsed subtitles with cues
}

// Store: "progress" (KeyPath: "videoId")
interface WatchProgress {
  videoId: string;          // Foreign key to videos
  currentTime: number;      // Exact resume timestamp in seconds
  duration: number;         // Total video duration
  progressPercent: number;  // 0-100 percentage
  lastWatchedAt: number;    // Epoch timestamp
  completed: boolean;       // Marked true when > 95%
}

// Store: "playlists" (KeyPath: "id")
interface Playlist {
  id: string;
  name: string;
  description: string;
  videoIds: string[];       // Sequential video ID queue
  createdAt: number;
  updatedAt: number;
}`}</pre>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="space-y-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-500" />
                    Setup, Execution & Bundling Guide
                  </h3>
                  <button
                    onClick={() =>
                      handleCopy(`npm install
npm run dev
npm run build`)
                    }
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Commands'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-3">
                  <div>
                    <span className="text-slate-500"># 1. Install dependencies</span>
                    <p className="text-amber-400">npm install</p>
                  </div>
                  <div>
                    <span className="text-slate-500"># 2. Start local development server (Port 3000)</span>
                    <p className="text-amber-400">npm run dev</p>
                  </div>
                  <div>
                    <span className="text-slate-500"># 3. Type check & production compilation</span>
                    <p className="text-amber-400">npm run build</p>
                  </div>
                  <div>
                    <span className="text-slate-500"># 4. Packaging as Desktop Application (Electron / Tauri)</span>
                    <p className="text-slate-400">
                      // The output in `dist/` can be wrapped directly via Tauri (cargo tauri build)
                      <br />
                      // or Electron Forge for native desktop packaging with local filesystem permissions.
                    </p>
                  </div>
                </div>
              </section>

              <section className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <span className="font-semibold text-white block">Testing Without Uploading Large Files:</span>
                <p className="text-slate-300">
                  Click the <strong className="text-amber-400">"Generate Sample Media Vault"</strong> button in
                  the top right "Import Media" menu. The in-browser audio & canvas synthesizer will procedurally generate
                  three 1080p video clips with multi-track subtitles, synchronized timecodes, and category metadata
                  directly in your browser with zero network calls!
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
