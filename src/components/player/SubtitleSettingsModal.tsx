import React, { useRef } from 'react';
import { SubtitleTrack, SubtitleStyleSettings } from '../../types/video';
import { parseSubtitleFile } from '../../services/subtitleParser';
import { X, Upload, Check, Type, Palette } from 'lucide-react';

interface SubtitleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleTrack[];
  activeTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  onAddCustomTrack: (track: SubtitleTrack) => void;
  styles: SubtitleStyleSettings;
  onUpdateStyles: (newStyles: Partial<SubtitleStyleSettings>) => void;
  subtitlesEnabled: boolean;
  onToggleSubtitles: (enabled: boolean) => void;
}

export const SubtitleSettingsModal: React.FC<SubtitleSettingsModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  activeTrackId,
  onSelectTrack,
  onAddCustomTrack,
  styles,
  onUpdateStyles,
  subtitlesEnabled,
  onToggleSubtitles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const track = await parseSubtitleFile(file);
      onAddCustomTrack(track);
      onSelectTrack(track.id);
      onToggleSubtitles(true);
    } catch (err) {
      console.error('Failed to parse subtitle file:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Subtitle and Audio Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Type className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold">Subtitles & Closed Captions</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3 border border-slate-800/80">
          <span className="text-sm font-medium">Display Subtitles</span>
          <button
            onClick={() => onToggleSubtitles(!subtitlesEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              subtitlesEnabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                subtitlesEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Track Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Available Tracks
          </label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            <button
              onClick={() => onSelectTrack(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                activeTrackId === null
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>Off (No subtitles)</span>
              {activeTrackId === null && <Check className="w-4 h-4 text-amber-400" />}
            </button>

            {subtitles.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  onSelectTrack(track.id);
                  onToggleSubtitles(true);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeTrackId === track.id
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-medium truncate">{track.label}</div>
                  <div className="text-xs text-slate-400">
                    {track.cues.length} cues · {track.language.toUpperCase()}
                  </div>
                </div>
                {activeTrackId === track.id && <Check className="w-4 h-4 shrink-0 text-amber-400" />}
              </button>
            ))}
          </div>

          {/* Import External Subtitle File */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".srt,.vtt,.ass"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-700 text-xs font-medium text-slate-300 hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/5 transition-all mt-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Load External Subtitle (.srt / .vtt)</span>
          </button>
        </div>

        {/* Styling Controls */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span>Custom Styling</span>
          </div>

          {/* Font Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Font Size</span>
              <span className="text-slate-400 capitalize">{styles.fontSize}</span>
            </div>
            <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['sm', 'base', 'lg', 'xl', '2xl'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateStyles({ fontSize: size })}
                  className={`py-1 text-xs font-medium rounded transition-colors ${
                    styles.fontSize === size
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Text Color</span>
            </div>
            <div className="flex gap-2">
              {[
                { name: 'White', color: '#ffffff' },
                { name: 'Yellow', color: '#fef08a' },
                { name: 'Cyan', color: '#67e8f9' },
                { name: 'Amber', color: '#f59e0b' },
              ].map((item) => (
                <button
                  key={item.color}
                  onClick={() => onUpdateStyles({ textColor: item.color })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs transition-colors ${
                    styles.textColor === item.color
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block border border-black/40"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Opacity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Background Opacity</span>
              <span className="tabular-nums text-slate-400">{Math.round(styles.backgroundOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={styles.backgroundOpacity}
              onChange={(e) => onUpdateStyles({ backgroundOpacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="relative rounded-lg bg-slate-950 h-16 flex items-center justify-center border border-slate-800 overflow-hidden">
          <div
            className="px-3 py-1 rounded tracking-wide text-center"
            style={{
              color: styles.textColor,
              backgroundColor: `rgba(0, 0, 0, ${styles.backgroundOpacity})`,
              fontSize:
                styles.fontSize === 'sm'
                  ? '13px'
                  : styles.fontSize === 'base'
                  ? '15px'
                  : styles.fontSize === 'lg'
                  ? '17px'
                  : styles.fontSize === 'xl'
                  ? '20px'
                  : '24px',
            }}
          >
            Sample Subtitle Preview
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
