import { db, finalizeSyncedSurvey } from '@/db/offlineDB';
import { storageService } from './storageService';
import { auditLogger, fireAndForget, AUDIT_ACTIONS } from '@/services/auditLogger';
import {
  SYNC_SCHEMA_VERSION,
  buildAudioManifestFromBlobs,
  buildPayloadChecksum,
  filterAudioManifest,
} from '@/utils/syncIntegrity';

// Extended backoff: fast retries first, then patient retry for hours on poor networks
const BACKOFF_MS = [
  2_000, 4_000, 8_000, 16_000, 32_000,   // attempts 1–5: under 1 minute
  120_000, 300_000, 900_000,              // attempts 6–8: 2m, 5m, 15m
  3_600_000, 14_400_000,                  // attempts 9–10+: 1h, 4h
];
const SYNC_LEASE_MS = 10 * 60 * 1000;
const SHAREPOINT_NOT_READY_MESSAGE = 'SharePoint not initialized';

function isSharePointNotReadyMessage(message = '') {
  return String(message || '').includes(SHAREPOINT_NOT_READY_MESSAGE);
}

class PermanentSyncError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermanentSyncError';
    this.permanent = true;
  }
}

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.instanceId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Belt-and-suspenders: reset flag immediately when browser goes offline
    // so the next reconnect can trigger a fresh sync without waiting for timeouts
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => { this.isSyncing = false; });
    }
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

        try {
          if (survey.status === 'audio_pending') {
            await this._syncAudioOnly(survey, saveFn);
          } else {
            await this._syncOne(survey, saveFn);
          }
        } catch (err) {
          if (err.permanent) await this._markPermanentFailure(survey, err);
          else await this._markTransientFailure(survey, err, { status: survey.status === 'audio_pending' ? 'audio_pending' : 'sync_failed' });
        }

        // Small delay between submissions to avoid SharePoint rate-limit
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async _leaseSurvey(survey) {
    const lease = {
      status: 'syncing',
      syncPreviousStatus: survey.status,
      syncLeaseOwner: this.instanceId,
      syncLeaseUntil: new Date(Date.now() + SYNC_LEASE_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.surveys.update(survey.id, lease);
    return { ...survey, ...lease };
  }

  async _ensureSurveyIntegrity(survey) {
    if (!survey?.surveyId) throw new PermanentSyncError('Dados locais corrompidos: SurveyId ausente.');
    if (!survey.data || typeof survey.data !== 'object') {
      throw new PermanentSyncError('Dados locais corrompidos: respostas ausentes.');
    }

    const blobs = await db.audioBlobs.where('surveyId').equals(survey.surveyId).toArray();
    const payloadChecksum = await buildPayloadChecksum(survey.data);
    if (survey.payloadChecksum && survey.payloadChecksum !== payloadChecksum) {
      throw new PermanentSyncError('Dados locais corrompidos: checksum das respostas não confere.');
    }

    const currentManifest = await buildAudioManifestFromBlobs(blobs);
    const expectedManifest = Array.isArray(survey.audioManifest) ? survey.audioManifest : currentManifest;
    const blobByQuestion = new Map(currentManifest.map(entry => [entry.questionId, entry]));

    for (const expected of expectedManifest) {
      const current = blobByQuestion.get(expected.questionId);
      if (!current) {
        throw new PermanentSyncError(`Dados locais corrompidos: áudio ausente para ${expected.questionId}.`);
      }
      if (expected.hash && current.hash && expected.hash !== current.hash) {
        throw new PermanentSyncError(`Dados locais corrompidos: checksum do áudio ${expected.questionId} não confere.`);
      }
      if (expected.sizeBytes && current.sizeBytes && expected.sizeBytes !== current.sizeBytes) {
        throw new PermanentSyncError(`Dados locais corrompidos: tamanho do áudio ${expected.questionId} não confere.`);
      }
    }

    const patch = {};
    if (!survey.schemaVersion) patch.schemaVersion = SYNC_SCHEMA_VERSION;
    if (!survey.payloadChecksum) patch.payloadChecksum = payloadChecksum;
    if (!Array.isArray(survey.audioManifest)) patch.audioManifest = currentManifest;
    for (const blob of blobs) {
      const entry = currentManifest.find(m => m.questionId === blob.questionId);
      const blobPatch = {};
      if (!blob.hash && entry?.hash) blobPatch.hash = entry.hash;
      if (!blob.sizeBytes && entry?.sizeBytes) blobPatch.sizeBytes = entry.sizeBytes;
      if (!blob.mimeType && entry?.mimeType) blobPatch.mimeType = entry.mimeType;
      if (Object.keys(blobPatch).length > 0) await db.audioBlobs.update(blob.id, blobPatch);
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date().toISOString();
      await db.surveys.update(survey.id, patch);
    }

    return { ...survey, ...patch };
  }

  async _markPermanentFailure(survey, err) {
    await db.surveys.update(survey.id, {
      status: 'failed_permanent',
      retryCount: survey.retryCount || 0,
      lastError: err.message,
      nextRetryAt: null,
      syncLeaseOwner: null,
      syncLeaseUntil: null,
      syncPreviousStatus: null,
      updatedAt: new Date().toISOString(),
    });

    await db.syncLog.add({
      surveyId:  survey.surveyId,
      action:    'sync_failed',
      error:     err.message,
      permanent: true,
      timestamp: new Date().toISOString(),
    });

    fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SYNC_FAILED, survey.surveyId, {
      province: survey.province,
      errorDetails: err.message,
      metadata: { isPermanentFailure: true },
    }));
  }

  async _markTransientFailure(survey, err, { status = 'sync_failed', mode = 'full' } = {}) {
    const retryCount = (survey.retryCount || 0) + 1;
    const backoff    = BACKOFF_MS[Math.min(retryCount - 1, BACKOFF_MS.length - 1)];
    const nextRetryAt = new Date(Date.now() + backoff).toISOString();

    await db.surveys.update(survey.id, {
      status,
      retryCount,
      lastError:   err.message,
      nextRetryAt,
      syncLeaseOwner: null,
      syncLeaseUntil: null,
      syncPreviousStatus: null,
      updatedAt: new Date().toISOString(),
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
      metadata:     { retryCount, backoffMs: backoff, isPermanentFailure: false, mode },
    }));
    fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.RETRY_TRIGGERED, survey.surveyId, {
      province: survey.province,
      metadata: { retryCount, nextRetryAt, mode },
    }));
  }

  _resultToError(result) {
    const err = new Error(result?.message || 'saveFn returned failure');
    err.permanent = !!result?.permanentFailure;
    err.authExpired = !!result?.authExpired;
    err.retryable = result?.retryable !== false;
    err.deferred = !!result?.deferred ||
      result?.reason === 'sharepoint_not_ready' ||
      isSharePointNotReadyMessage(err.message);
    return err;
  }

  async _markDeferred(survey, err, { status = 'pending' } = {}) {
    const restoredStatus = survey.syncPreviousStatus && survey.syncPreviousStatus !== 'syncing'
      ? survey.syncPreviousStatus
      : status;

    await db.surveys.update(survey.id, {
      status: restoredStatus,
      lastError: err.message,
      nextRetryAt: null,
      syncLeaseOwner: null,
      syncLeaseUntil: null,
      syncPreviousStatus: null,
      updatedAt: new Date().toISOString(),
    });
  }

  async _syncOne(survey, saveFn) {
    survey = await this._ensureSurveyIntegrity(survey);
    survey = await this._leaseSurvey(survey);

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
        if ((result.isDuplicate || result.audioUploadResult) && !result.itemId && Object.keys(audioRecordings).length > 0) {
          throw new Error('SharePoint confirmou duplicado, mas não devolveu o item para verificar áudio.');
        }

        const audioFailed = result.audioUploadResult?.hasFailures;
        const syncedAt = new Date().toISOString();
        const receipt = {
          syncedAt,
          spItemId: result.itemId ?? survey.spItemId ?? null,
          listName: result.listName ?? survey.listName ?? null,
        };

        if (!audioFailed) {
          // Fully synced (survey + any audio) — keep metadata only.
          await finalizeSyncedSurvey(survey, receipt);
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
          const failedQ = new Set(details.filter(d => !d.success).map(d => d.questionId));
          const remainingManifest = failedQ.size > 0
            ? filterAudioManifest(survey.audioManifest || [], failedQ).map(entry => ({ ...entry, status: 'upload_failed' }))
            : (survey.audioManifest || []).map(entry => ({ ...entry, status: 'upload_failed' }));
          if (succeededQ.size > 0) {
            await db.audioBlobs.where('surveyId').equals(survey.surveyId)
              .and(b => succeededQ.has(b.questionId)).delete();
          }
          await db.audioBlobs.where('surveyId').equals(survey.surveyId).modify({ status: 'upload_failed' });
          await db.surveys.update(survey.id, {
            audioManifest: remainingManifest,
            syncLeaseOwner: null,
            syncLeaseUntil: null,
            syncPreviousStatus: null,
          });
        }

        if (result.isDuplicate) {
          fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.DUPLICATE_DETECTED, survey.surveyId, {
            province: survey.province,
          }));
          fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SUBMISSION_CONFIRMED, survey.surveyId, {
            province: survey.province,
            metadata: { itemId: result.itemId, duplicateReceipt: true },
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
        throw this._resultToError(result);
      }
    } catch (err) {
      cleanupOfflineListener();
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));

      if (err.deferred) {
        await this._markDeferred(survey, err, { status: survey.spItemId ? 'audio_pending' : 'pending' });
        return;
      }

      if (err.permanent) {
        await this._markPermanentFailure(survey, err);
        return;
      }

      await this._markTransientFailure(survey, err, { status: 'sync_failed' });
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

    survey = await this._ensureSurveyIntegrity(survey);
    survey = await this._leaseSurvey(survey);

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
        saveFn({
          ...survey.data,
          audioOnly: true,
          spItemId: survey.spItemId,
          listName: survey.listName,
          audioRecordings,
          metadata: {
            ...survey.data?.metadata,
            syncedAt:          new Date().toISOString(),
            originalOfflineId: survey.surveyId,
            surveyId:          survey.surveyId,
          },
          idempotencyKey: survey.surveyId,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout áudio após ${Math.round(timeoutMs / 1000)}s`)), timeoutMs)),
        offlinePromise,
      ]);
      cleanup();
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));

      if (result.success || result.audioUploadResult) {
        const audioFailed = result.audioUploadResult?.hasFailures;

        if (audioFailed) {
          const details = result.audioUploadResult?.details || [];
          const succeededQ = new Set(details.filter(d => d.success).map(d => d.questionId));
          const failedQ = new Set(details.filter(d => !d.success).map(d => d.questionId));
          const remainingManifest = failedQ.size > 0
            ? filterAudioManifest(survey.audioManifest || [], failedQ).map(entry => ({ ...entry, status: 'upload_failed' }))
            : (survey.audioManifest || []).map(entry => ({ ...entry, status: 'upload_failed' }));

          if (succeededQ.size > 0) {
            await db.audioBlobs.where('surveyId').equals(survey.surveyId)
              .and(b => succeededQ.has(b.questionId)).delete();
          }
          await db.audioBlobs.where('surveyId').equals(survey.surveyId).modify({ status: 'upload_failed' });
          await db.surveys.update(survey.id, {
            status: 'audio_pending',
            audioManifest: remainingManifest,
            lastError: result.audioUploadResult?.error || 'Áudio ainda por sincronizar.',
            nextRetryAt: new Date(Date.now() + BACKOFF_MS[0]).toISOString(),
            syncLeaseOwner: null,
            syncLeaseUntil: null,
            syncPreviousStatus: null,
            updatedAt: new Date().toISOString(),
          });
          return;
        }

        await finalizeSyncedSurvey(survey, {
          syncedAt: new Date().toISOString(),
          spItemId: survey.spItemId,
          listName: survey.listName,
        });
        fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SYNC_SUCCEEDED, survey.surveyId, {
          province: survey.province, metadata: { itemId: survey.spItemId, mode: 'audio_only' },
        }));
      } else {
        throw this._resultToError(result);
      }
    } catch (err) {
      cleanup();
      Object.values(audioRecordings).forEach(r => URL.revokeObjectURL(r.url));
      if (err.deferred) {
        await this._markDeferred(survey, err, { status: 'audio_pending' });
        return;
      }
      if (err.permanent) {
        await this._markPermanentFailure(survey, err);
        return;
      }
      await this._markTransientFailure(survey, err, { status: 'audio_pending', mode: 'audio_only' });
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
