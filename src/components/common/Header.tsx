import React, { useState, useRef, useEffect } from 'react';
import { Film, Upload, FolderUp, Sparkles, ChevronDown } from 'lucide-react';

interface HeaderProps {
  activeView: 'library' | 'playlists' | 'storage' | 'docs';
  onSelectView: (view: 'library' | 'playlists' | 'storage' | 'docs') => void;
  onImportFiles: (files: File[]) => void;
  onImportDirectory: () => void;
  onGenerateDemo: () => void;
  isGeneratingDemo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onImportFiles,
  onImportDirectory,
  onGenerateDemo,
  isGeneratingDemo,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(Array.from(e.target.files));
      setIsDropdownOpen(false);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(Array.from(e.target.files));
      setIsDropdownOpen(false);
    }
  };

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/80 bg-slate-950 sticky top-0 z-40 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSelectView('library');
        }}
        className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <Film className="w-4 h-4" />
        </div>
        <span>AeroCinema</span>
      </a>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onSelectView('library')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'library' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Library
        </button>
        <button
          onClick={() => onSelectView('playlists')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'playlists' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Playlists
        </button>
        <button
          onClick={() => onSelectView('storage')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'storage' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Storage
        </button>
        <button
          onClick={() => onSelectView('docs')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'docs' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Architecture
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Import Media</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="video/*,.mp4,.mkv,.webm,.avi,.mov,.srt,.vtt"
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderChange}
          // @ts-expect-error webkitdirectory attribute
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
        />

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
            >
              <Upload className="w-4 h-4 text-amber-500" />
              <div>
                <div className="font-semibold">Select Files</div>
                <div className="text-[11px] text-slate-400">MP4, MKV, WebM, MOV</div>
              </div>
            </button>

            <button
              onClick={() => {
                if ('showDirectoryPicker' in window) {
                  onImportDirectory();
                } else {
                  folderInputRef.current?.click();
                }
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
            >
              <FolderUp className="w-4 h-4 text-sky-400" />
              <div>
                <div className="font-semibold">Bulk Folder Scan</div>
                <div className="text-[11px] text-slate-400">Scan directory recursively</div>
              </div>
            </button>

            <div className="border-t border-slate-800 my-1" />

            <button
              onClick={() => {
                onGenerateDemo();
                setIsDropdownOpen(false);
              }}
              disabled={isGeneratingDemo}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition-colors text-left disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold">Generate Sample Vault</div>
                <div className="text-[11px] text-amber-400/80">3 offline clips with subtitles</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
