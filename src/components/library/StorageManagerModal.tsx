import React, { useState, useEffect } from 'react';
import { StoredVideoItem } from '../../types/video';
import { dbService } from '../../services/db';
import { X, HardDrive, Trash2, ShieldCheck, PieChart, RefreshCw } from 'lucide-react';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: StoredVideoItem[];
  onRefreshLibrary: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
  videos,
  onRefreshLibrary,
}) => {
  const [usedBytes, setUsedBytes] = useState(0);
  const [quotaBytes, setQuotaBytes] = useState(0);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStorageData();
    }
  }, [isOpen, videos]);

  const loadStorageData = async () => {
    const stats = await dbService.getStorageUsage();
    setUsedBytes(stats.usedBytes);
    setQuotaBytes(stats.quotaBytes);
  };

  if (!isOpen) return null;

  // Breakdown by category
  const categoryStats: Record<string, { count: number; bytes: number }> = {};
  for (const v of videos) {
    const cat = v.category || 'Uncategorized';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, bytes: 0 };
    }
    categoryStats[cat].count += 1;
    categoryStats[cat].bytes += v.size || 0;
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to purge all stored media and playback progress? This cannot be undone.')) {
      setIsClearing(true);
      await dbService.clearAllData();
      await onRefreshLibrary();
      setIsClearing(false);
      onClose();
    }
  };

  const usagePercent = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Storage Management"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold">Local Storage & Vault Tracking</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Storage Meter */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Offline Media Consumed</span>
            <span className="font-mono font-semibold text-white">
              {formatBytes(usedBytes)} {quotaBytes > 0 ? `/ ${formatBytes(quotaBytes)}` : ''}
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(3, usagePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Strictly Local & Offline
            </span>
            <span className="font-mono">{videos.length} video files</span>
          </div>
        </div>

        {/* Breakdown by Category */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <PieChart className="w-3.5 h-3.5 text-amber-500" />
            <span>Category Space Allocation</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {Object.entries(categoryStats).map(([cat, stat]) => (
              <div
                key={cat}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200">{cat}</span>
                  <span className="text-[11px] text-slate-400">({stat.count} items)</span>
                </div>
                <span className="font-mono text-slate-300">{formatBytes(stat.bytes)}</span>
              </div>
            ))}

            {Object.keys(categoryStats).length === 0 && (
              <p className="text-xs text-slate-500 italic py-2">No media stored currently.</p>
            )}
          </div>
        </div>

        {/* Privacy & Sandboxing Notice */}
        <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-800 text-xs text-slate-400 space-y-1">
          <span className="font-medium text-slate-300 block">Sandbox Storage Guarantee</span>
          <p>
            Media blobs and watch timestamps reside purely inside your local browser's sandboxed
            IndexedDB engine. Zero network requests, telemetry, or external trackers are initialized.
          </p>
        </div>

        {/* Danger Zone: Purge all */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={loadStorageData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={isClearing || videos.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Vault Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
