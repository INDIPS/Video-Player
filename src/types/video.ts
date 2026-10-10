export type VideoCategory = 'Movies' | 'Courses' | 'Personal' | 'Clips' | 'Uncategorized';

export type AspectRatioMode = 'fit' | 'fill' | '16:9' | '4:3' | 'original';

export interface SubtitleCue {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  isDefault?: boolean;
  cues: SubtitleCue[];
}

export interface VideoMetadata {
  id: string;
  title: string;
  filename: string;
  size: number; // bytes
  mimeType: string;
  duration: number; // seconds
  width: number;
  height: number;
  aspectRatio: string; // e.g. "16:9", "4:3", "2.35:1"
  codec?: string;
  thumbnailUrl: string; // Data URL or object URL
  category: VideoCategory;
  tags: string[];
  isFavorite: boolean;
  dateAdded: number; // timestamp
  lastModified: number;
  subtitles?: SubtitleTrack[];
}

export interface StoredVideoItem extends VideoMetadata {
  blob?: Blob; // stored in IndexedDB for strictly offline playback
}

export interface WatchProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  progressPercent: number; // 0-100
  lastWatchedAt: number;
  completed: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SubtitleStyleSettings {
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number; // 0 to 1
  position: 'bottom' | 'top';
}

export interface PlayerSettings {
  volume: number; // 0 to 1
  isMuted: boolean;
  playbackRate: number; // 0.25 to 2.5
  brightness: number; // 50 to 150
  aspectRatio: AspectRatioMode;
  autoPlayNext: boolean;
  subtitlesEnabled: boolean;
  activeSubtitleTrackId: string | null;
  subtitleStyles: SubtitleStyleSettings;
}
