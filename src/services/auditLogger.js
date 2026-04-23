import { db } from '@/db/offlineDB';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';

const DEVICE_INFO = JSON.stringify({
  userAgent:        navigator.userAgent,
  platform:         navigator.platform,
  language:         navigator.language,
  screenResolution: `${screen.width}x${screen.height}`,
  connectionType:   navigator.connection?.effectiveType || 'unknown',
});

/**
 * Wraps an async fn so it NEVER throws or blocks the caller.
 */
export function fireAndForget(fn) {
  Promise.resolve().then(async () => {
    try { await fn(); } catch { /* intentionally swallowed */ }
  });
}

export const AUDIT_ACTIONS = {
  SURVEY_OPENED:          'survey_opened',
  SURVEY_AUTOSAVED:       'survey_autosaved',
  SURVEY_COMPLETED:       'survey_completed',
  SURVEY_SAVED_OFFLINE:   'survey_saved_offline',
  SYNC_STARTED:           'sync_started',
  SYNC_SUCCEEDED:         'sync_succeeded',
  SYNC_FAILED:            'sync_failed',
  SUBMISSION_CONFIRMED:   'submission_confirmed',
  RETRY_TRIGGERED:        'retry_triggered',
  DUPLICATE_DETECTED:     'duplicate_detected',
  AUDIO_UPLOAD_STARTED:   'audio_upload_started',
  AUDIO_UPLOAD_COMPLETED: 'audio_upload_completed',
  AUDIO_UPLOAD_FAILED:    'audio_upload_failed',
  STORAGE_WARNING:        'storage_warning',
  STORAGE_CRITICAL:       'storage_critical',
};

class AuditLogger {
  /**
   * Write one audit log entry to IndexedDB.
   * Always call via fireAndForget — never await directly from callers.
   */
  async logEvent(actionType, surveyId, opts = {}) {
    await db.auditLogs.add({
      logId:         crypto.randomUUID(),
      surveyId:      surveyId || 'unknown',
      surveyorId:    opts.surveyorId  || '',
      actionType,
      timestamp:     new Date().toISOString(),
      networkStatus: navigator.onLine ? 'online' : 'offline',
      deviceInfo:    DEVICE_INFO,
      syncStatus:    'pending',
      errorDetails:  opts.errorDetails || '',
      appVersion:    APP_VERSION,
      region:        opts.region   || opts.province || '',
      province:      opts.province || '',
      formType:      opts.formType || '',
      metadata:      opts.metadata ? JSON.stringify(opts.metadata) : '{}',
      synced:        false,
      syncedAt:      null,
      retryCount:    0,
    });
  }

  async getUnsyncedLogs(limit = 50) {
    // Dexie 4.x indexes booleans as 0/1 — use 0 to match false
    return db.auditLogs.where('synced').equals(0).limit(limit).sortBy('timestamp');
  }

  async markLogSynced(id) {
    await db.auditLogs.update(id, {
      synced:     true,
      syncedAt:   new Date().toISOString(),
      syncStatus: 'synced',
    });
  }

  /**
   * Batch-sync unsynced logs to SharePoint via spSyncFn.
   * Returns { synced: number, failed: number }.
   */
  async syncAuditLogs(spSyncFn) {
    if (!navigator.onLine || typeof spSyncFn !== 'function') return { synced: 0, failed: 0 };
    const logs = await this.getUnsyncedLogs(50);
    if (!logs.length) return { synced: 0, failed: 0 };

    const results = await spSyncFn(logs);
    let synced = 0, failed = 0;

    for (const r of results) {
      if (r.success) {
        await this.markLogSynced(r.id);
        synced++;
      } else {
        await db.auditLogs.where('id').equals(r.id).modify(row => {
          row.retryCount = (row.retryCount || 0) + 1;
        });
        failed++;
      }
    }

    return { synced, failed };
  }
}

export const auditLogger = new AuditLogger();
