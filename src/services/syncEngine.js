import { db } from '@/db/offlineDB';
import { storageService } from './storageService';
import { auditLogger, fireAndForget, AUDIT_ACTIONS } from '@/services/auditLogger';

// Extended backoff: fast retries first, then patient retry for hours on poor networks
const BACKOFF_MS = [
  2_000, 4_000, 8_000, 16_000, 32_000,   // attempts 1–5: under 1 minute
  120_000, 300_000, 900_000,              // attempts 6–8: 2m, 5m, 15m
  3_600_000, 14_400_000,                  // attempts 9–10+: 1h, 4h
];

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    // Belt-and-suspenders: reset flag immediately when browser goes offline
    // so the next reconnect can trigger a fresh sync without waiting for timeouts
    window.addEventListener('offline', () => { this.isSyncing = false; });
  }

  async processQueue(saveFn, onProgress) {
    if (this.isSyncing || !navigator.onLine) return;

    // Cross-tab mutex: if another tab is already syncing the shared Dexie rows,
    // skip here to avoid two tabs inserting the same survey twice. Falls back to
    // the in-instance isSyncing guard where Web Locks is unsupported.
    if (navigator.locks?.request) {
      await navigator.locks.request('survey-sync', { ifAvailable: true }, async (lock) => {
        if (!lock) return; // another tab holds it — let that tab do the work
        await this._runQueue(saveFn, onProgress);
      });
    } else {
      await this._runQueue(saveFn, onProgress);
    }
  }

  async _runQueue(saveFn, onProgress) {
    if (this.isSyncing || !navigator.onLine) return;

    // Free old synced data before processing (reclaim storage)
    await storageService.cleanupSyncedData(db);

    this.isSyncing = true;
    try {
      const now     = new Date().toISOString();
      // 'audio_pending' = survey already in SharePoint, only its audio still needs uploading.
      const pending = await db.surveys
        .where('status').anyOf(['pending', 'sync_failed', 'audio_pending'])
        .filter(s => !s.nextRetryAt || s.nextRetryAt <= now)
        .sortBy('createdAt');

      for (let i = 0; i < pending.length; i++) {
        if (!navigator.onLine) break; // stop the batch immediately if network is lost

        const survey = pending[i];
        onProgress?.({ current: i + 1, total: pending.length, surveyId: survey.surveyId });

        fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SYNC_STARTED, survey.surveyId, {
          province: survey.province,
          metadata: { retryCount: survey.retryCount, batchIndex: i, batchTotal: pending.length, mode: survey.status === 'audio_pending' ? 'audio_only' : 'full' },
        }));

        if (survey.status === 'audio_pending') {
          await this._syncAudioOnly(survey, saveFn);
        } else {
          await this._syncOne(survey, saveFn);
        }

        // Small delay between submissions to avoid SharePoint rate-limit
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async _syncOne(survey, saveFn) {
    await db.surveys.update(survey.id, { status: 'syncing' });

    // Load audio blobs stored in IndexedDB and create object URLs
    const audioRecordings = {};
    const blobs = await db.audioBlobs.where('surveyId').equals(survey.surveyId).toArray();
    for (const r of blobs) {
      audioRecordings[r.questionId] = {
        blob:      r.blob,
        url:       URL.createObjectURL(r.blob),
        sizeBytes: r.sizeBytes || r.blob?.size || 0,
      };
    }

    // Adaptive timeout: 60s minimum, scaled up by audio size for slow 3G (~100 B/ms upload)
    const totalAudioBytes = Object.values(audioRecordings).reduce((s, r) => s + r.sizeBytes, 0);
    const timeoutMs = Math.min(300_000, Math.max(60_000, totalAudioBytes / 100));

    // Race against the offline event so we fail fast instead of waiting for the full timeout
    let offlineHandler = null;
    const offlinePromise = new Promise((_, reject) => {
      offlineHandler = () => reject(new Error('Conexão perdida (offline)'));
      window.addEventListener('offline', offlineHandler, { once: true });
    });
    const cleanupOfflineListener = () => {
      if (offlineHandler) window.removeEventListener('offline', offlineHandler);
    };

    try {
      const result = await Promise.race([
        saveFn({
          ...survey.data,
          audioRecordings,
          metadata: {
            ...survey.data.metadata,
            syncedAt:          new Date().toISOString(),
            originalOfflineId: survey.surveyId,
          },
          idempotencyKey: survey.surveyId,
        }),
        new Promise((_, rej) => setTimeout(
          () => rej(new Error(`Timeout após ${Math.round(timeoutMs / 1000)}s [${survey.surveyId.slice(0, 8)} · ${survey.data?.responses?.municipality || survey.province}]`)),
          timeoutMs,
        )),
        offlinePromise,
      ]);

      cleanupOfflineListener();
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));

      if (result.success || result.isDuplicate) {
        const audioFailed = result.audioUploadResult?.hasFailures;

        if (!audioFailed) {
          // Fully synced (survey + any audio) — safe to remove local audio copies.
          await db.surveys.update(survey.id, { status: 'synced', syncedAt: new Date().toISOString() });
          await db.audioBlobs.where('surveyId').equals(survey.surveyId).delete();
        } else {
          // Survey row IS in SharePoint, but audio upload partially failed. Keep the
          // survey as 'audio_pending' (NOT synced) and remember the SharePoint item so
          // the next sync re-uploads ONLY the missing audio — never a duplicate survey.
          await db.surveys.update(survey.id, {
            status:      'audio_pending',
            spItemId:    result.itemId ?? survey.spItemId ?? null,
            listName:    result.listName ?? survey.listName ?? null,
            nextRetryAt: new Date(Date.now() + BACKOFF_MS[0]).toISOString(),
            updatedAt:   new Date().toISOString(),
          });
          // Delete blobs whose question uploaded OK; keep only the failed ones for retry.
          // This prevents the audio-only retry from re-uploading already-present audio.
          const details = result.audioUploadResult?.details || [];
          const succeededQ = new Set(details.filter(d => d.success).map(d => d.questionId));
          if (succeededQ.size > 0) {
            await db.audioBlobs.where('surveyId').equals(survey.surveyId)
              .and(b => succeededQ.has(b.questionId)).delete();
          }
          await db.audioBlobs.where('surveyId').equals(survey.surveyId).modify({ status: 'upload_failed' });
        }

        if (result.isDuplicate) {
          fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.DUPLICATE_DETECTED, survey.surveyId, {
            province: survey.province,
          }));
        } else {
          fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SYNC_SUCCEEDED, survey.surveyId, {
            province: survey.province,
            metadata: { itemId: result.itemId },
          }));
          fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SUBMISSION_CONFIRMED, survey.surveyId, {
            province: survey.province,
          }));
        }
      } else {
        throw new Error(result.message || 'saveFn returned failure');
      }
    } catch (err) {
      cleanupOfflineListener();
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));

      const retryCount = (survey.retryCount || 0) + 1;
      const backoff    = BACKOFF_MS[Math.min(retryCount - 1, BACKOFF_MS.length - 1)];

      await db.surveys.update(survey.id, {
        status:      'sync_failed',
        retryCount,
        lastError:   err.message,
        nextRetryAt: new Date(Date.now() + backoff).toISOString(),
      });

      await db.syncLog.add({
        surveyId:  survey.surveyId,
        action:    'sync_failed',
        error:     err.message,
        retryCount,
        timestamp: new Date().toISOString(),
      });

      fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SYNC_FAILED, survey.surveyId, {
        province:     survey.province,
        errorDetails: err.message,
        metadata:     { retryCount, backoffMs: backoff, isPermanentFailure: false },
      }));
      fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.RETRY_TRIGGERED, survey.surveyId, {
        province: survey.province,
        metadata: { retryCount, nextRetryAt: new Date(Date.now() + backoff).toISOString() },
      }));
    }
  }

  /**
   * Re-upload only the audio for a survey already created in SharePoint.
   * Never re-creates the survey item (no duplicate risk). On full success the
   * survey becomes 'synced' and local blobs are deleted; otherwise it stays
   * 'audio_pending' and retries with backoff.
   */
  async _syncAudioOnly(survey, saveFn) {
    if (!survey.spItemId || !survey.listName) {
      // Missing the target item — fall back to a full sync so nothing is stranded.
      return this._syncOne(survey, saveFn);
    }

    await db.surveys.update(survey.id, { status: 'syncing' });

    const audioRecordings = {};
    const blobs = await db.audioBlobs.where('surveyId').equals(survey.surveyId).toArray();
    for (const r of blobs) {
      audioRecordings[r.questionId] = { blob: r.blob, url: URL.createObjectURL(r.blob), sizeBytes: r.sizeBytes || r.blob?.size || 0 };
    }

    const totalAudioBytes = Object.values(audioRecordings).reduce((s, r) => s + r.sizeBytes, 0);
    const timeoutMs = Math.min(300_000, Math.max(60_000, totalAudioBytes / 100));

    let offlineHandler = null;
    const offlinePromise = new Promise((_, reject) => {
      offlineHandler = () => reject(new Error('Conexão perdida (offline)'));
      window.addEventListener('offline', offlineHandler, { once: true });
    });
    const cleanup = () => { if (offlineHandler) window.removeEventListener('offline', offlineHandler); };

    try {
      const result = await Promise.race([
        saveFn({ audioOnly: true, spItemId: survey.spItemId, listName: survey.listName, audioRecordings }),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout áudio após ${Math.round(timeoutMs / 1000)}s`)), timeoutMs)),
        offlinePromise,
      ]);
      cleanup();
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));

      if (result.success) {
        await db.surveys.update(survey.id, { status: 'synced', syncedAt: new Date().toISOString() });
        await db.audioBlobs.where('surveyId').equals(survey.surveyId).delete();
        fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SYNC_SUCCEEDED, survey.surveyId, {
          province: survey.province, metadata: { itemId: survey.spItemId, mode: 'audio_only' },
        }));
      } else {
        throw new Error(result.message || 'audio-only sync returned failure');
      }
    } catch (err) {
      cleanup();
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));
      const retryCount = (survey.retryCount || 0) + 1;
      const backoff    = BACKOFF_MS[Math.min(retryCount - 1, BACKOFF_MS.length - 1)];
      await db.surveys.update(survey.id, {
        status:      'audio_pending',
        retryCount,
        lastError:   err.message,
        nextRetryAt: new Date(Date.now() + backoff).toISOString(),
      });
      fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SYNC_FAILED, survey.surveyId, {
        province: survey.province, errorDetails: err.message, metadata: { retryCount, mode: 'audio_only' },
      }));
    }
  }

  async registerBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('sync-surveys');
      return true;
    } catch {
      return false;
    }
  }
}

export const syncEngine = new SyncEngine();
