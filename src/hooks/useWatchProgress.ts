import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchProgress, PlayerSettings } from '../types/video';
import { dbService, DEFAULT_PLAYER_SETTINGS } from '../services/db';

export function useWatchProgress() {
  const [allProgress, setAllProgress] = useState<Record<string, WatchProgress>>({});
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load progress and user settings from IndexedDB on startup
  const reloadData = useCallback(async () => {
    try {
      const [progressList, savedSettings] = await Promise.all([
        dbService.getAllProgress(),
        dbService.getSetting<PlayerSettings>('player_settings', DEFAULT_PLAYER_SETTINGS),
      ]);

      const map: Record<string, WatchProgress> = {};
      for (const item of progressList) {
        map[item.videoId] = item;
      }
      setAllProgress(map);
      setPlayerSettings(savedSettings);
    } catch (err) {
      console.warn('Failed to load watch progress & settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Throttled progress save
  const lastSaveTimeRef = useRef<number>(0);

  const saveWatchTime = useCallback(async (videoId: string, currentTime: number, duration: number, immediate = false) => {
    if (!videoId || !duration || isNaN(currentTime) || isNaN(duration)) return;

    const now = Date.now();
    if (!immediate && now - lastSaveTimeRef.current < 2500) {
      return;
    }
    lastSaveTimeRef.current = now;

    const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));
    const completed = progressPercent >= 95;

    const record: WatchProgress = {
      videoId,
      currentTime: completed ? 0 : currentTime, // Reset if completed so it plays from start next time
      duration,
      progressPercent,
      lastWatchedAt: now,
      completed,
    };

    try {
      await dbService.saveProgress(record);
      setAllProgress((prev) => ({ ...prev, [videoId]: record }));
    } catch (err) {
      console.warn('Error saving progress to IndexedDB:', err);
    }
  }, []);

  const getProgressForVideo = useCallback((videoId: string): WatchProgress | undefined => {
    return allProgress[videoId];
  }, [allProgress]);

  const clearProgressForVideo = useCallback(async (videoId: string) => {
    try {
      await dbService.deleteProgress(videoId);
      setAllProgress((prev) => {
        const copy = { ...prev };
        delete copy[videoId];
        return copy;
      });
    } catch (err) {
      console.warn('Error clearing progress:', err);
    }
  }, []);

  const updatePlayerSettings = useCallback(async (updates: Partial<PlayerSettings>) => {
    setPlayerSettings((prev) => {
      const next = { ...prev, ...updates };
      dbService.saveSetting('player_settings', next).catch((err) => {
        console.warn('Error saving player settings:', err);
      });
      return next;
    });
  }, []);

  return {
    allProgress,
    isLoading,
    playerSettings,
    saveWatchTime,
    getProgressForVideo,
    clearProgressForVideo,
    updatePlayerSettings,
    reloadData,
  };
}
