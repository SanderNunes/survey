import { useState, useEffect, useCallback, useRef } from 'react';
import { db, initDB } from '@/db/offlineDB';
import { storageService } from '@/services/storageService';
import { syncEngine }     from '@/services/syncEngine';
import { auditLogger, fireAndForget, AUDIT_ACTIONS } from '@/services/auditLogger';

export class StorageError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

// ─── One-time migration from the old localStorage queue ────────────────────

function base64ToBlob(dataUri) {
  const commaIdx = dataUri.indexOf(',');
  if (commaIdx === -1) throw new Error('Invalid data URI');
  const header = dataUri.slice(0, commaIdx);
  const b64    = dataUri.slice(commaIdx + 1);
  const mime   = header.match(/:(.*?);/)?.[1] || 'audio/wav';
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function migrateFromLocalStorage() {
  const LS_KEY = 'offline-cabinda-surveys';
  const raw    = localStorage.getItem(LS_KEY);
  if (!raw) return;

  try {
    const surveys = JSON.parse(raw);
    for (const old of surveys) {
      if (old.status === 'synced') continue;

      const surveyId = String(old.id || crypto.randomUUID());

      // Check if already migrated (avoid double-import on partial failures)
      const exists = await db.surveys.where('surveyId').equals(surveyId).count();
      if (exists > 0) continue;

      for (const [qId, b64] of Object.entries(old.audioData || {})) {
        try {
          const blob = base64ToBlob(b64);
          await db.audioBlobs.add({
            surveyId,
            questionId: qId,
            blob,
            mimeType:   blob.type,
            sizeBytes:  blob.size,
            status:     'pending',
            uploadedAt: null,
          });
        } catch {
          // skip corrupt audio entries
        }
      }

      await db.surveys.add({
        surveyId,
        province:    'cabinda',
        retryCount:  0,
        status:      old.status === 'sync_failed' ? 'sync_failed' : 'pending',
        createdAt:   old.timestamp || new Date().toISOString(),
        syncedAt:    null,
        nextRetryAt: null,
        lastError:   null,
        data: {
          responses:   old.responses   || {},
          customInputs: old.customInputs || {},
          metadata:    old.metadata     || {},
          fingerprint: old.fingerprint,
        },
      });
    }

    localStorage.removeItem(LS_KEY);
  } catch (err) {
    console.error('[useOfflineQueue] Migration from localStorage failed:', err);
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useOfflineQueue(saveFn)
 *
 * saveFn — the SharePoint save function (saveCabindaSurveyResponse).
 *           Receives the survey payload and must return { success, isDuplicate, ... }.
 *
 * Returns:
 *   isOnline       — current network state
 *   pendingCount   — number of surveys awaiting sync
 *   storageInfo    — { usageMB, quotaMB, usageRatio, isWarning, isCritical, ... }
 *   syncProgress   — { isActive, current, total }
 *   saveSurvey     — async ({ surveyData, audioRecordings, province }) → { success, surveyId }
 *   triggerSync    — manually kick off the sync queue
 */
export function useOfflineQueue(saveFn, syncAuditLogsFn) {
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [storageInfo,  setStorageInfo]  = useState(null);
  const [syncProgress, setSyncProgress] = useState({ isActive: false, current: 0, total: 0 });
  const dbReady = useRef(false);

  // ── Init DB ──────────────────────────────────────────────────────────────
  useEffect(() => {
    initDB().then(async () => {
      dbReady.current = true;
      await migrateFromLocalStorage();
      refreshPendingCount();
      refreshStorageInfo();
    }).catch(err => console.error('[useOfflineQueue] DB init failed:', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Network detection ────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Background Sync message from Service Worker ──────────────────────────
  useEffect(() => {
    const handleSWMessage = (e) => {
      if (e.data?.type === 'BACKGROUND_SYNC_TRIGGERED') triggerSync();
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-sync 2 s after coming back online ───────────────────────────────
  useEffect(() => {
    if (!isOnline || !dbReady.current) return;
    const t = setTimeout(() => triggerSync(), 2000);
    return () => clearTimeout(t);
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audit log auto-sync every 60 s while online ──────────────────────────
  useEffect(() => {
    if (!isOnline || !syncAuditLogsFn) return;

    const syncLogs = async () => {
      if (!dbReady.current) return;
      try {
        const pending = await db.auditLogs.filter(log => !log.synced).count();
        if (pending > 0) await auditLogger.syncAuditLogs(syncAuditLogsFn);
      } catch { /* never break the app */ }
    };

    // Sync once immediately (catches logs written while online)
    syncLogs();

    const interval = setInterval(syncLogs, 60000);
    return () => clearInterval(interval);
  }, [isOnline, syncAuditLogsFn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────
  const refreshPendingCount = async () => {
    try {
      const n = await db.surveys.where('status').anyOf(['pending', 'sync_failed']).count();
      setPendingCount(n);
    } catch { /* DB may not be ready yet */ }
  };

  const refreshStorageInfo = async () => {
    const info = await storageService.getQuotaInfo();
    setStorageInfo(info);
    if (info?.isCritical) {
      fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.STORAGE_CRITICAL, 'system', {
        metadata: { usageMB: info.usageMB, quotaMB: info.quotaMB, usageRatio: info.usageRatio },
      }));
    } else if (info?.isWarning) {
      fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.STORAGE_WARNING, 'system', {
        metadata: { usageMB: info.usageMB, quotaMB: info.quotaMB, usageRatio: info.usageRatio },
      }));
    }
  };

  // ── saveSurvey ────────────────────────────────────────────────────────────
  const saveSurvey = async ({ surveyData, audioRecordings = {}, province = 'cabinda' }) => {
    // Estimate storage needed
    const audioBytes   = Object.values(audioRecordings).reduce((s, r) => s + (r.blob?.size || 0), 0);
    const metaBytes    = new TextEncoder().encode(JSON.stringify(surveyData)).length;
    const totalEstimate = audioBytes + metaBytes;

    // Quota pre-check
    let canStore = await storageService.canStoreData(totalEstimate);
    if (!canStore.allowed) {
      // Try to free space from old synced surveys first
      await storageService.cleanupSyncedData(db);
      canStore = await storageService.canStoreData(totalEstimate);
      if (!canStore.allowed) {
        throw new StorageError(
          canStore.reason === 'storage_critical'
            ? 'Armazenamento crítico. Sincronize ou elimine inquéritos pendentes.'
            : 'Espaço insuficiente para guardar o inquérito.',
          canStore.reason,
        );
      }
    }

    const surveyId = crypto.randomUUID(); // idempotency key

    try {
      // Store audio blobs in IndexedDB (Blob stored natively — no Base64 overhead)
      for (const [qId, rec] of Object.entries(audioRecordings)) {
        if (!rec?.blob) continue;
        await db.audioBlobs.add({
          surveyId,
          questionId: qId,
          blob:       rec.blob,
          mimeType:   rec.blob.type,
          sizeBytes:  rec.blob.size,
          status:     'pending',
          uploadedAt: null,
        });
      }

      // Store survey data (text only — no blobs here)
      await db.surveys.add({
        surveyId,
        status:      'pending',
        createdAt:   new Date().toISOString(),
        syncedAt:    null,
        province,
        retryCount:  0,
        nextRetryAt: null,
        lastError:   null,
        data:        surveyData,
      });

      fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SURVEY_SAVED_OFFLINE, surveyId, {
        province,
        metadata: { audioCount: Object.keys(audioRecordings).length },
      }));
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
        await storageService.cleanupSyncedData(db);
        throw new StorageError('Quota de armazenamento excedida. A limpar dados sincronizados…', 'quota_exceeded');
      }
      throw err;
    }

    await refreshPendingCount();
    await refreshStorageInfo();

    if (isOnline) {
      await syncEngine.registerBackgroundSync();
      triggerSync();
    }

    return { success: true, surveyId };
  };

  // ── triggerSync ───────────────────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    if (!isOnline || !saveFn || !dbReady.current) return;

    setSyncProgress(p => ({ ...p, isActive: true }));

    await syncEngine.processQueue(saveFn, (progress) => {
      setSyncProgress({ isActive: true, ...progress });
    });

    // Audit log sync — runs after survey sync, never breaks it
    if (syncAuditLogsFn) {
      try { await auditLogger.syncAuditLogs(syncAuditLogsFn); } catch { /* intentional */ }
    }

    setSyncProgress({ isActive: false, current: 0, total: 0 });
    await refreshPendingCount();
    await refreshStorageInfo();
  }, [isOnline, saveFn, syncAuditLogsFn]);

  return { isOnline, pendingCount, storageInfo, syncProgress, saveSurvey, triggerSync };
}
