/**
 * High-performance video metadata extraction & thumbnail generator.
 * Creates clean snapshot canvases and ensures strict memory release.
 */

export interface ExtractedVideoInfo {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  thumbnailUrl: string;
}

function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return '16:9';
  const ratio = width / height;

  if (Math.abs(ratio - 16 / 9) < 0.08) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.08) return '4:3';
  if (Math.abs(ratio - 21 / 9) < 0.1) return '21:9';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  if (Math.abs(ratio - 9 / 16) < 0.08) return '9:16';

  // Fallback to simplified fraction or decimal
  return `${width}:${height}`;
}

/**
 * Extracts metadata and a thumbnail preview at a target seek position
 */
export async function extractVideoMetadataAndThumbnail(
  fileOrBlob: Blob,
  seekTimeSeconds?: number
): Promise<ExtractedVideoInfo> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(fileOrBlob);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    let isResolved = false;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const timeout = setTimeout(() => {
      if (!isResolved) {
        cleanup();
        reject(new Error('Video metadata extraction timed out.'));
      }
    }, 15000);

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const aspectRatio = calculateAspectRatio(width, height);

      // Seek to target or 1.5s or 10% of duration (avoid black opening frame)
      let seekTo = seekTimeSeconds !== undefined ? seekTimeSeconds : Math.min(2.0, Math.max(0.5, duration * 0.1));
      if (seekTo > duration) seekTo = Math.max(0, duration / 2);

      video.currentTime = seekTo;
    };

    video.onseeked = () => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);

      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        // Render to thumbnail canvas (max width 480 for fast storage in IndexedDB)
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 480 / width);
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/webp', 0.82) || canvas.toDataURL('image/jpeg', 0.82);

          cleanup();
          resolve({
            duration: video.duration || 0,
            width: video.videoWidth || 1280,
            height: video.videoHeight || 720,
            aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight),
            thumbnailUrl,
          });
          return;
        }
      } catch (err) {
        console.warn('Canvas thumbnail snapshot failed:', err);
      }

      cleanup();
      // Resolve with SVG placeholder if canvas fails (e.g. DRM or unsupported internal codec)
      resolve({
        duration: video.duration || 0,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
        aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight),
        thumbnailUrl: createDefaultFallbackThumbnail(),
      });
    };

    video.onerror = () => {
      if (!isResolved) {
        clearTimeout(timeout);
        cleanup();
        reject(new Error(`Failed to decode video file: ${video.error?.message || 'Unsupported format'}`));
      }
    };
  });
}

/**
 * Creates a clean SVG thumbnail fallback
 */
export function createDefaultFallbackThumbnail(title: string = 'Video'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270" fill="none">
    <rect width="480" height="270" fill="#0f172a"/>
    <circle cx="240" cy="135" r="42" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <polygon points="234,120 254,135 234,150" fill="#f59e0b"/>
    <text x="240" y="210" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="500">${escapeXml(title)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
