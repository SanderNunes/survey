import { db } from '@/db/offlineDB';
import { storageService } from './storageService';

const MAX_RETRIES = 5;
const BACKOFF_MS  = [2000, 4000, 8000, 16000, 32000]; // exponential: 2s→4s→8s→16s→32s

class SyncEngine {
  constructor() {
    this.isSyncing = false;
  }

  async processQueue(saveFn, onProgress) {
    if (this.isSyncing || !navigator.onLine) return;

    // Free old synced data before processing (reclaim storage)
    await storageService.cleanupSyncedData(db);

    this.isSyncing = true;
    try {
      const now     = new Date().toISOString();
      const pending = await db.surveys
        .where('status').anyOf(['pending', 'sync_failed'])
        .filter(s => !s.nextRetryAt || s.nextRetryAt <= now)
        .sortBy('createdAt');

      for (let i = 0; i < pending.length; i++) {
        const survey = pending[i];
        onProgress?.({ current: i + 1, total: pending.length, surveyId: survey.surveyId });

        if (survey.retryCount >= MAX_RETRIES) {
          await db.surveys.update(survey.id, { status: 'failed_permanent' });
          continue;
        }

        await this._syncOne(survey, saveFn);

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
      audioRecordings[r.questionId] = { blob: r.blob, url: URL.createObjectURL(r.blob) };
    }

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
          idempotencyKey: survey.surveyId, // UUID → SurveyId field in SharePoint
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout após 45s')), 45000)),
      ]);

      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));

      if (result.success || result.isDuplicate) {
        await db.surveys.update(survey.id, {
          status:   'synced',
          syncedAt: new Date().toISOString(),
        });

        // Delete audio blobs immediately — no permanent local audio storage after sync
        await db.audioBlobs.where('surveyId').equals(survey.surveyId).delete();
      } else {
        throw new Error(result.message || 'saveFn returned failure');
      }
    } catch (err) {
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));

      const retryCount = (survey.retryCount || 0) + 1;
      const backoff    = BACKOFF_MS[Math.min(retryCount - 1, BACKOFF_MS.length - 1)];

      await db.surveys.update(survey.id, {
        status:      retryCount >= MAX_RETRIES ? 'failed_permanent' : 'sync_failed',
        retryCount,
        lastError:   err.message,
        nextRetryAt: new Date(Date.now() + backoff).toISOString(),
      });

      await db.syncLog.add({
        surveyId:   survey.surveyId,
        action:     'sync_failed',
        error:      err.message,
        retryCount,
        timestamp:  new Date().toISOString(),
      });
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
