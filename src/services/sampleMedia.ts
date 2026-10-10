import { StoredVideoItem } from '../types/video';
import { extractVideoMetadataAndThumbnail } from './thumbnailGenerator';

/**
 * Generates an offline synthetic sample video blob using HTML5 Canvas + Web Audio + MediaRecorder.
 * This guarantees 100% offline, zero network requests, and immediate rich playback testing.
 */
export async function createSyntheticSampleVideo(options: {
  title: string;
  category: 'Movies' | 'Courses' | 'Personal' | 'Clips';
  durationSeconds: number;
  theme: 'cosmic' | 'code' | 'synthwave';
  tags: string[];
  subtitlesText: { start: number; end: number; text: string }[];
}): Promise<StoredVideoItem> {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Setup AudioContext & synthesizer oscillator for realistic offline audio track
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const dest = audioCtx.createMediaStreamDestination();

  // Create subtle ambient musical tones
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = options.theme === 'synthwave' ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(options.theme === 'synthwave' ? 110 : 220, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  // Combine canvas video stream + synthesized audio stream
  const videoStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 2500000 });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const startTime = performance.now();
  const totalFrames = options.durationSeconds * 30;
  let currentFrame = 0;

  return new Promise((resolve, reject) => {
    recorder.onstop = async () => {
      osc.stop();
      audioCtx.close();
      const videoBlob = new Blob(chunks, { type: mimeType });

      try {
        const info = await extractVideoMetadataAndThumbnail(videoBlob, 1.5);
        const item: StoredVideoItem = {
          id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: options.title,
          filename: `${options.title.toLowerCase().replace(/\s+/g, '_')}.webm`,
          size: videoBlob.size,
          mimeType,
          duration: options.durationSeconds,
          width,
          height,
          aspectRatio: '16:9',
          codec: mimeType.includes('vp9') ? 'VP9 / Opus' : 'H.264 / AAC',
          thumbnailUrl: info.thumbnailUrl,
          category: options.category,
          tags: options.tags,
          isFavorite: options.category === 'Movies',
          dateAdded: Date.now() - Math.floor(Math.random() * 86400000 * 3),
          lastModified: Date.now(),
          blob: videoBlob,
          subtitles: [
            {
              id: 'sample-sub-en',
              label: 'English [Original]',
              language: 'en',
              isDefault: true,
              cues: options.subtitlesText.map((s, idx) => ({
                id: `cue-${idx}`,
                start: s.start,
                end: s.end,
                text: s.text,
              })),
            },
          ],
        };
        resolve(item);
      } catch (err) {
        reject(err);
      }
    };

    recorder.start(100);

    // Frame rendering loop
    const renderLoop = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / options.durationSeconds);

      // Background rendering based on theme
      if (options.theme === 'cosmic') {
        // Deep space gradient
        const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.6, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Animated celestial rings
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(progress * Math.PI * 2);
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.15 + i * 0.12})`;
          ctx.lineWidth = 2 + i;
          ctx.beginPath();
          ctx.ellipse(0, 0, 160 + i * 45, 80 + i * 25, (i * Math.PI) / 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (options.theme === 'synthwave') {
        // Neon grid sunset
        ctx.fillStyle = '#090514';
        ctx.fillRect(0, 0, width, height);

        // Horizon sun
        const sunGrad = ctx.createLinearGradient(width / 2, height * 0.2, width / 2, height * 0.65);
        sunGrad.addColorStop(0, '#f59e0b');
        sunGrad.addColorStop(1, '#ec4899');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.55, 140, 0, Math.PI * 2);
        ctx.fill();

        // Retro ground perspective grid lines
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.lineWidth = 1.5;
        for (let x = -width; x <= width * 2; x += 80) {
          ctx.beginPath();
          ctx.moveTo(width / 2, height * 0.55);
          ctx.lineTo(x + ((progress * 120) % 80), height);
          ctx.stroke();
        }
      } else {
        // Technical / Course blueprint theme
        ctx.fillStyle = '#0b132b';
        ctx.fillRect(0, 0, width, height);

        // Grid matrix
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Cinematic center title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(options.title, width / 2, height / 2 - 20);

      // Metadata kicker
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${options.category.toUpperCase()}  ·  OFFLINE VAULT SAMPLE  ·  1080P MASTER`, width / 2, height / 2 + 25);

      // Timecode HUD Box
      const currentTimeSec = Math.min(options.durationSeconds, elapsed);
      const mm = String(Math.floor(currentTimeSec / 60)).padStart(2, '0');
      const ss = String(Math.floor(currentTimeSec % 60)).padStart(2, '0');
      const ms = String(Math.floor((currentTimeSec % 1) * 100)).padStart(2, '0');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(width / 2 - 140, height - 110, 280, 44);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - 140, height - 110, 280, 44);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 22px "JetBrains Mono", monospace';
      ctx.fillText(`TC: ${mm}:${ss}.${ms}`, width / 2, height - 80);

      currentFrame++;
      if (elapsed < options.durationSeconds) {
        requestAnimationFrame(renderLoop);
      } else {
        recorder.stop();
      }
    };

    renderLoop();
  });
}

/**
 * Creates a default set of 3 curated offline media clips if the library is empty
 */
export async function generateDemoMediaVault(): Promise<StoredVideoItem[]> {
  const item1 = await createSyntheticSampleVideo({
    title: 'Interstellar Horizons: Deep Space 4K',
    category: 'Movies',
    durationSeconds: 12,
    theme: 'cosmic',
    tags: ['Sci-Fi', 'Cinematic', 'Space', '4K'],
    subtitlesText: [
      { start: 0.5, end: 3.5, text: 'Signal established with outer exploratory probe.' },
      { start: 4.0, end: 7.5, text: 'Gravitational lensing detected near perimeter accretion disk.' },
      { start: 8.0, end: 11.5, text: 'Navigation lock confirmed. Preparing deceleration burn.' },
    ],
  });

  const item2 = await createSyntheticSampleVideo({
    title: 'Full-Stack Media Architecture Masterclass',
    category: 'Courses',
    durationSeconds: 10,
    theme: 'code',
    tags: ['Education', 'Architecture', 'TypeScript', 'IndexedDB'],
    subtitlesText: [
      { start: 0.5, end: 3.0, text: 'Welcome to Module 3: Zero-latency Local Media Architecture.' },
      { start: 3.5, end: 6.5, text: 'IndexedDB stores raw video blobs for high-efficiency sandboxed playback.' },
      { start: 7.0, end: 9.8, text: 'Notice how frame seek accuracy eliminates network overhead.' },
    ],
  });

  const item3 = await createSyntheticSampleVideo({
    title: 'Neon Odyssey: City Skyline Night Drive',
    category: 'Clips',
    durationSeconds: 11,
    theme: 'synthwave',
    tags: ['Synthwave', 'Music', 'Retro', 'Night'],
    subtitlesText: [
      { start: 0.5, end: 4.0, text: '♪ Bassline synth resonates through nocturnal skyline ♪' },
      { start: 4.5, end: 8.0, text: 'Cruising through the illuminated metropolitan transit corridor.' },
      { start: 8.5, end: 10.8, text: 'Speed corrected to 1.0x with full audio pitch preservation.' },
    ],
  });

  return [item1, item2, item3];
}
