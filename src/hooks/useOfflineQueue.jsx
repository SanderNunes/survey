import { useState, useEffect, useCallback, useRef } from 'react';
import { db, initDB, DBInitError, isStoragePersisted } from '@/db/offlineDB';
import { storageService } from '@/services/storageService';
import { syncEngine }     from '@/services/syncEngine';
import { auditLogger, fireAndForget, AUDIT_ACTIONS } from '@/services/auditLogger';
import {
  SYNC_SCHEMA_VERSION,
  buildAudioManifestFromBlobs,
  buildAudioManifestFromRecordings,
  buildPayloadChecksum,
  getSubmissionMetadata,
} from '@/utils/syncIntegrity';

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

export async function migrateFromLocalStorage() {
  const LS_KEY = 'offline-cabinda-surveys';
  const raw    = localStorage.getItem(LS_KEY);
  if (!raw) return;

  try {
    const surveys = JSON.parse(raw);
    const remaining = [];

    for (const old of surveys) {
      if (old.status === 'synced') continue;

      const surveyId = String(old.id || crypto.randomUUID());

      // Check if already migrated (avoid double-import on partial failures)
      const exists = await db.surveys.where('surveyId').equals(surveyId).count();
      if (exists > 0) continue;

      const audioRows = [];
      for (const [qId, b64] of Object.entries(old.audioData || {})) {
        try {
          const blob = base64ToBlob(b64);
          const manifest = await buildAudioManifestFromBlobs([{
            surveyId,
            questionId: qId,
            blob,
            mimeType:   blob.type,
            sizeBytes:  blob.size,
            status:     'pending',
            uploadedAt: null,
          }]);
          audioRows.push({
            surveyId,
            questionId: qId,
            blob,
            mimeType:   blob.type,
            sizeBytes:  blob.size,
            hash:       manifest[0]?.hash || '',
            status:     'pending',
            uploadedAt: null,
          });
        } catch {
          // skip corrupt audio entries
        }
      }

      const createdAt = old.timestamp || new Date().toISOString();
      const data = {
        responses:   old.responses   || {},
        customInputs: old.customInputs || {},
        metadata:    old.metadata     || {},
        fingerprint: old.fingerprint,
      };
      if (!data.metadata.surveyId) data.metadata.surveyId = surveyId;
      const payloadChecksum = await buildPayloadChecksum(data);
      const audioManifest = await buildAudioManifestFromBlobs(audioRows);
      const province = data.responses?.province || old.province || 'Cabinda';

      try {
        await db.transaction('rw', db.surveys, db.audioBlobs, db.submissions, async () => {
          for (const row of audioRows) await db.audioBlobs.add(row);

          const surveyRow = {
            surveyId,
            province,
            retryCount:  0,
            status:      old.status === 'sync_failed' ? 'sync_failed' : 'pending',
            createdAt,
            syncedAt:    null,
            nextRetryAt: null,
            lastError:   null,
            data,
            schemaVersion: SYNC_SCHEMA_VERSION,
            payloadChecksum,
            audioManifest,
            syncLeaseOwner: null,
            syncLeaseUntil: null,
            syncPreviousStatus: null,
          };
          await db.surveys.add(surveyRow);
          await db.submissions.add(getSubmissionMetadata(surveyRow, { syncStatus: 'local' }));
        });
      } catch (err) {
        console.error('[useOfflineQueue] Failed to migrate localStorage survey:', surveyId, err);
        remaining.push(old);
      }
    }

    if (remaining.length > 0) localStorage.setItem(LS_KEY, JSON.stringify(remaining));
    else localStorage.removeItem(LS_KEY);
  } catch (err) {
    console.error('[useOfflineQueue] Migration from localStorage failed:', err);
  }
}

// ─── Real connectivity probe ───────────────────────────────────────────────
// navigator.onLine returns true when connected to any network (e.g. a mobile tower
// with no data). Probe the actual SharePoint tenant to confirm data can flow.
// externalSignal lets callers cancel the probe (e.g. when the offline event fires).
const probeConnectivity = async (externalSignal) => {
  // Wrap fetch in our own AbortController so we can combine external abort + timeout
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 8000); // 8s for slow 3G
  externalSignal?.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    await fetch('https://africellcloud.sharepoint.com', {
      method: 'HEAD',
      mode: 'no-cors',   // avoids CORS errors; opaque response still confirms reachability
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

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
  const [dbError,      setDbError]      = useState(null); // DBInitError if storage failed to open
  const [storagePersisted, setStoragePersisted] = useState(true); // false = browser may evict (iOS)
  const dbReady       = useRef(false);
  const probeAbortRef = useRef(null); // AbortController for the in-flight connectivity probe

  // ── Init DB ──────────────────────────────────────────────────────────────
  useEffect(() => {
    initDB().then(async () => {
      dbReady.current = true;
      // false → browser denied persistence (common on iOS) → eviction risk worth surfacing
      if (isStoragePersisted() === false) setStoragePersisted(false);
      await migrateFromLocalStorage();
      refreshPendingCount();
      refreshStorageInfo();
    }).catch(err => {
      console.error('[useOfflineQueue] DB init failed:', err);
      // Surface a clear, user-actionable error instead of silently breaking saves.
      setDbError(err instanceof DBInitError ? err : new DBInitError('Erro de armazenamento local.', err));
    });
  }, []);

  // ── Network detection ────────────────────────────────────────────────────
  useEffect(() => {
    // Probe on mount: navigator.onLine is unreliable on mobile (true even with no data)
    if (navigator.onLine) {
      const ctrl = new AbortController();
      probeAbortRef.current = ctrl;
      probeConnectivity(ctrl.signal).then(setIsOnline);
    }

    const handleOnline = async () => {
      // Cancel any in-flight probe before starting a new one — prevents stale
      // probe results from overriding a subsequent offline event
      if (probeAbortRef.current) probeAbortRef.current.abort();
      const ctrl = new AbortController();
      probeAbortRef.current = ctrl;
      const online = await probeConnectivity(ctrl.signal);
      setIsOnline(online);
    };

    const handleOffline = () => {
      // Abort any in-flight probe immediately so it can't flip state back to true
      if (probeAbortRef.current) probeAbortRef.current.abort();
      probeAbortRef.current = null;
      setIsOnline(false);
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (probeAbortRef.current) probeAbortRef.current.abort();
    };
  }, []);

  // ── Background Sync message from Service Worker ──────────────────────────
  useEffect(() => {
    const handleSWMessage = (e) => {
      if (e.data?.type === 'BACKGROUND_SYNC_TRIGGERED') triggerSync();
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  });

  // ── Auto-sync 2 s after coming back online ───────────────────────────────
  useEffect(() => {
    if (!isOnline || !dbReady.current) return;
    const t = setTimeout(() => triggerSync(), 2000);
    return () => clearTimeout(t);
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync when the app returns to the foreground ──────────────────────────
  // Mobile browsers freeze background tabs; a surveyor reopening the app should
  // immediately flush whatever queued while it was hidden.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && dbReady.current) {
        triggerSync();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register Periodic Background Sync (best-effort, where supported) ──────
  useEffect(() => {
    (async () => {
      try {
        const reg = await navigator.serviceWorker?.ready;
        if (reg?.periodicSync) {
          const status = await navigator.permissions?.query?.({ name: 'periodic-background-sync' }).catch(() => null);
          if (!status || status.state === 'granted') {
            await reg.periodicSync.register('sync-surveys-periodic', { minInterval: 60 * 60 * 1000 }).catch(() => {});
          }
        }
      } catch { /* unsupported — one-off Background Sync + foreground triggers still cover it */ }
    })();
  }, []);

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
  }, [isOnline, syncAuditLogsFn]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const refreshPendingCount = async () => {
    try {
      const n = await db.surveys.where('status').anyOf(['pending', 'sync_failed', 'audio_pending', 'failed_permanent']).count();
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
    const createdAt = new Date().toISOString();
    const audioManifest = await buildAudioManifestFromRecordings(audioRecordings);
    const audioByQuestion = new Map(audioManifest.map(entry => [entry.questionId, entry]));
    const surveyDataWithId = {
      ...surveyData,
      metadata: {
        ...(surveyData?.metadata || {}),
        surveyId,
      },
    };
    const payloadChecksum = await buildPayloadChecksum(surveyDataWithId);

    try {
      // Atomic write: audio blobs + survey row succeed together or roll back together.
      // Prevents orphaned audio (blobs with no survey) or a half-saved survey if the
      // write throws midway (e.g. QuotaExceededError between the loop and the row add).
      await db.transaction('rw', db.surveys, db.audioBlobs, db.submissions, async () => {
        for (const [qId, rec] of Object.entries(audioRecordings)) {
          if (!rec?.blob) continue;
          await db.audioBlobs.add({
            surveyId,
            questionId: qId,
            blob:       rec.blob,
            mimeType:   rec.blob.type,
            sizeBytes:  rec.blob.size,
            hash:       audioByQuestion.get(qId)?.hash || '',
            status:     'pending',
            uploadedAt: null,
          });
        }

        // Store survey data (text only — no blobs here)
        const surveyRow = {
          surveyId,
          status:      'pending',
          createdAt,
          syncedAt:    null,
          province,
          retryCount:  0,
          nextRetryAt: null,
          lastError:   null,
          data:        surveyDataWithId,
          schemaVersion: SYNC_SCHEMA_VERSION,
          payloadChecksum,
          audioManifest,
          syncLeaseOwner: null,
          syncLeaseUntil: null,
          syncPreviousStatus: null,
        };
        await db.surveys.add(surveyRow);
        await db.submissions.add(getSubmissionMetadata(surveyRow, { syncStatus: 'local' }));
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

    // Return to the caller immediately — modal closes as soon as the DB write is done.
    // All post-save bookkeeping (counters, SW registration, sync) runs in the background.
    Promise.resolve().then(async () => {
      await refreshPendingCount();
      await refreshStorageInfo();
      if (isOnline) {
        syncEngine.registerBackgroundSync().catch(() => {});
        triggerSync();
      }
    }).catch(() => {});

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

  return { isOnline, pendingCount, storageInfo, syncProgress, saveSurvey, triggerSync, dbError, storagePersisted };
}
