import { StoredVideoItem, VideoCategory, SubtitleTrack } from '../types/video';
import { extractVideoMetadataAndThumbnail } from './thumbnailGenerator';
import { parseSubtitleFile } from './subtitleParser';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v', '.ogv'];
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass'];

export interface ScanProgressCallback {
  (current: number, total: number, filename: string): void;
}

export function isVideoFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isSubtitleFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUBTITLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getBaseNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? filename : filename.substring(0, lastDot);
}

function inferCategoryFromPathOrName(name: string, path?: string): VideoCategory {
  const combined = `${path || ''}/${name}`.toLowerCase();
  if (combined.includes('movie') || combined.includes('film') || combined.includes('cinema')) {
    return 'Movies';
  }
  if (combined.includes('course') || combined.includes('tutorial') || combined.includes('lecture') || combined.includes('lesson')) {
    return 'Courses';
  }
  if (combined.includes('personal') || combined.includes('family') || combined.includes('vacation') || combined.includes('trip')) {
    return 'Personal';
  }
  if (combined.includes('clip') || combined.includes('short') || combined.includes('highlight')) {
    return 'Clips';
  }
  return 'Uncategorized';
}

function inferTagsFromFilename(name: string): string[] {
  const tags: Set<string> = new Set();
  const lower = name.toLowerCase();

  if (lower.includes('1080p')) tags.add('1080p');
  if (lower.includes('4k') || lower.includes('2160p')) tags.add('4K');
  if (lower.includes('720p')) tags.add('720p');
  if (lower.includes('hdr')) tags.add('HDR');
  if (lower.includes('course')) tags.add('Course');
  if (lower.includes('movie')) tags.add('Movie');

  // Add extension as tag (e.g., MP4, MKV)
  const ext = name.split('.').pop()?.toUpperCase();
  if (ext && ext.length <= 4) tags.add(ext);

  return Array.from(tags);
}

/**
 * Process a batch of files (both videos and subtitles) and pair them intelligently
 */
export async function processImportedFiles(
  files: File[],
  onProgress?: ScanProgressCallback
): Promise<StoredVideoItem[]> {
  const videoFiles: File[] = [];
  const subtitleFiles: File[] = [];

  for (const file of files) {
    if (isVideoFile(file.name)) {
      videoFiles.push(file);
    } else if (isSubtitleFile(file.name)) {
      subtitleFiles.push(file);
    }
  }

  // Pre-parse subtitles and map by normalized base name
  const subtitlesByBaseName: Record<string, SubtitleTrack[]> = {};
  for (const subFile of subtitleFiles) {
    try {
      const track = await parseSubtitleFile(subFile);
      const baseName = getBaseNameWithoutExtension(subFile.name).toLowerCase();
      // Remove any language code suffix (e.g. "movie.en" -> "movie")
      const rootName = baseName.replace(/\.(en|es|fr|de|ja|zh|it|ru|pt)$/i, '');

      if (!subtitlesByBaseName[rootName]) {
        subtitlesByBaseName[rootName] = [];
      }
      subtitlesByBaseName[rootName].push(track);
    } catch (err) {
      console.warn('Failed to parse subtitle file:', subFile.name, err);
    }
  }

  const results: StoredVideoItem[] = [];
  const total = videoFiles.length;

  for (let i = 0; i < videoFiles.length; i++) {
    const file = videoFiles[i];
    if (onProgress) {
      onProgress(i + 1, total, file.name);
    }

    try {
      const info = await extractVideoMetadataAndThumbnail(file);
      const baseName = getBaseNameWithoutExtension(file.name).toLowerCase();
      const matchedSubs = subtitlesByBaseName[baseName] || [];

      const category = inferCategoryFromPathOrName(file.name, (file as File & { webkitRelativePath?: string }).webkitRelativePath);
      const tags = inferTagsFromFilename(file.name);

      const item: StoredVideoItem = {
        id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: getBaseNameWithoutExtension(file.name).replace(/[._-]/g, ' '),
        filename: file.name,
        size: file.size,
        mimeType: file.type || 'video/mp4',
        duration: info.duration,
        width: info.width,
        height: info.height,
        aspectRatio: info.aspectRatio,
        codec: file.type ? file.type.replace('video/', '').toUpperCase() : 'Standard',
        thumbnailUrl: info.thumbnailUrl,
        category,
        tags,
        isFavorite: false,
        dateAdded: Date.now(),
        lastModified: file.lastModified || Date.now(),
        blob: file,
        subtitles: matchedSubs.length > 0 ? matchedSubs : undefined,
      };

      results.push(item);
    } catch (err) {
      console.error(`Error processing video ${file.name}:`, err);
    }
  }

  return results;
}

/**
 * Modern Directory Picker using File System Access API
 */
export async function openDirectoryWithFileSystemAPI(
  onProgress?: ScanProgressCallback
): Promise<StoredVideoItem[]> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Directory picker is not supported in this browser. Please use folder upload.');
  }

  // Access File System Access API
  const windowWithPicker = window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> };
  const dirHandle = await windowWithPicker.showDirectoryPicker();
  const collectedFiles: File[] = [];

  // Recursive directory reader
  async function readDirectory(handle: FileSystemDirectoryHandle, currentPath = '') {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        if (isVideoFile(entry.name) || isSubtitleFile(entry.name)) {
          const file = await fileHandle.getFile();
          Object.defineProperty(file, 'webkitRelativePath', {
            value: `${currentPath}/${entry.name}`,
          });
          collectedFiles.push(file);
        }
      } else if (entry.kind === 'directory') {
        await readDirectory(entry as FileSystemDirectoryHandle, `${currentPath}/${entry.name}`);
      }
    }
  }

  await readDirectory(dirHandle, dirHandle.name);
  return processImportedFiles(collectedFiles, onProgress);
}

/**
 * Recursively extracts files from Drag and Drop DataTransferItem list
 */
export async function extractFilesFromDataTransfer(
  items: DataTransferItemList
): Promise<File[]> {
  const files: File[] = [];

  const traverseFileTree = async (item: FileSystemEntry, path = ''): Promise<void> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        (item as FileSystemFileEntry).file((file) => {
          if (isVideoFile(file.name) || isSubtitleFile(file.name)) {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: `${path}${file.name}`,
            });
            files.push(file);
          }
          resolve();
        }, () => resolve());
      } else if (item.isDirectory) {
        const dirReader = (item as FileSystemDirectoryEntry).createReader();
        dirReader.readEntries(async (entries) => {
          for (const entry of entries) {
            await traverseFileTree(entry, `${path}${item.name}/`);
          }
          resolve();
        }, () => resolve());
      } else {
        resolve();
      }
    });
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
    if (entry) {
      promises.push(traverseFileTree(entry));
    } else {
      const file = item.getAsFile();
      if (file && (isVideoFile(file.name) || isSubtitleFile(file.name))) {
        files.push(file);
      }
    }
  }

  await Promise.all(promises);
  return files;
}
