import { SubtitleCue, SubtitleTrack } from '../types/video';

/**
 * Converts timestamp strings (00:01:23,456 or 00:01:23.456 or 01:23.456) to seconds
 */
export function timeStringToSeconds(timeStr: string): number {
  const cleanStr = timeStr.trim().replace(',', '.');
  const parts = cleanStr.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    return parseFloat(parts[0]) || 0;
  }
  return 0;
}

/**
 * Strips HTML formatting tags from subtitle text while preserving line breaks
 */
export function sanitizeSubtitleText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // remove HTML tags like <i>, <b>, <font>
    .replace(/\{[^}]*\}/g, '') // remove ASS override tags like {\an8}
    .trim();
}

/**
 * Parse an SRT or VTT string into an array of SubtitleCues
 */
export function parseSubtitleText(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Normalize newline characters
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  let cueIndex = 0;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0 || (lines.length === 1 && lines[0].startsWith('WEBVTT'))) {
      continue;
    }

    // Look for timing line (e.g., 00:00:10,000 --> 00:00:15,000)
    let timingIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timingIndex = i;
        break;
      }
    }

    if (timingIndex === -1) continue;

    const timingLine = lines[timingIndex];
    const [startRaw, endRawWithParams] = timingLine.split('-->');
    if (!startRaw || !endRawWithParams) continue;

    const startSeconds = timeStringToSeconds(startRaw.trim());
    // WebVTT can have cue settings after the end timestamp (e.g. "00:00:05.000 line:0 position:20%")
    const endRaw = endRawWithParams.trim().split(/\s+/)[0];
    const endSeconds = timeStringToSeconds(endRaw);

    const textLines = lines.slice(timingIndex + 1);
    const text = sanitizeSubtitleText(textLines.join('\n'));

    if (text && endSeconds > startSeconds) {
      cues.push({
        id: `cue-${cueIndex++}`,
        start: startSeconds,
        end: endSeconds,
        text,
      });
    }
  }

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Parse an uploaded Subtitle File (.srt or .vtt)
 */
export async function parseSubtitleFile(file: File): Promise<SubtitleTrack> {
  const text = await file.text();
  const cues = parseSubtitleText(text);

  let label = file.name.replace(/\.(srt|vtt|ass)$/i, '');
  // Extract potential language tag (e.g., movie.en.srt -> "en")
  const parts = label.split('.');
  let lang = 'en';
  if (parts.length > 1) {
    const possibleLang = parts[parts.length - 1];
    if (possibleLang.length === 2 || possibleLang.length === 3) {
      lang = possibleLang;
    }
  }

  return {
    id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    label: file.name,
    language: lang,
    cues,
  };
}

/**
 * Find currently active cue at currentTime using binary search
 */
export function getActiveCue(cues: SubtitleCue[], currentTime: number): SubtitleCue | null {
  if (!cues || cues.length === 0) return null;

  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];

    if (currentTime >= cue.start && currentTime <= cue.end) {
      return cue;
    }

    if (currentTime < cue.start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Linear check in case of overlapping cues
  for (const cue of cues) {
    if (currentTime >= cue.start && currentTime <= cue.end) {
      return cue;
    }
  }

  return null;
}
