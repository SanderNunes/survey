import { useState, useEffect } from 'react';
import { useSharePoint } from './useSharePoint';

export const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingData, setPendingData] = useState([]);
  const { saveSurveyResponse } = useSharePoint();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending data on mount
    let pending = [];
    try {
      pending = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    } catch {
      pending = [];
    }
    setPendingData(pending);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = (data) => {
    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { 
      ...data, 
      timestamp, 
      id: Date.now(),
      status: 'pending'
    };
    
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    } catch {
      existing = [];
    }
    const updated = [...existing, dataWithTimestamp];
    localStorage.setItem('offline-surveys', JSON.stringify(updated));
    
    setPendingData(updated);
    return dataWithTimestamp.id;
  };

  const syncPendingData = async () => {
    if (!isOnline) return false;

    let pending = [];
    try {
      pending = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    } catch {
      pending = [];
    }
    if (pending.length === 0) return true;

    const results = { synced: [], failed: [] };

    for (const survey of pending) {
      // FIX 10: guard against missing responses
      if (!survey.responses) continue;

      // FIX 8: convert base64 audio back to blobs
      const audioRecordings = {};
      if (survey.audioData) {
        for (const [key, base64Data] of Object.entries(survey.audioData)) {
          try {
            const response = await fetch(base64Data);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            audioRecordings[key] = { blob, url };
          } catch {
            // skip this audio if conversion fails
          }
        }
      }

      // FIX 9: wrap each iteration so one failure doesn't block the rest
      try {
        await saveSurveyResponse({
          responses: survey.responses,
          customInputs: survey.customInputs || {},
          audioRecordings,
        });
        results.synced.push(survey.id);
      } catch (err) {
        console.error('Failed to sync survey:', survey.id, err);
        results.failed.push(survey.id);
      } finally {
        // Always revoke created blob URLs
        Object.values(audioRecordings).forEach(r => { if (r.url) URL.revokeObjectURL(r.url); });
      }
    }

    // Only remove successfully synced surveys from localStorage
    const remaining = pending.filter(s => !results.synced.includes(s.id));
    localStorage.setItem('offline-surveys', JSON.stringify(remaining));
    setPendingData(remaining);

    return results.failed.length === 0;
  };

  return {
    isOnline,
    pendingData,
    saveOfflineData,
    syncPendingData
  };
};