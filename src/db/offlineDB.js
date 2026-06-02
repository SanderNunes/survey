import Dexie from 'dexie';
import {
  SYNC_SCHEMA_VERSION,
  buildAudioManifestFromBlobs,
  buildPayloadChecksum,
  getSubmissionMetadata,
} from '@/utils/syncIntegrity';

export const db = new Dexie('AfricellSurveyDB');

db.version(1).stores({
  surveys:    '++id, surveyId, status, createdAt, syncedAt, province, retryCount',
  audioBlobs: '++id, surveyId, questionId, status, uploadedAt',
  syncLog:    '++id, surveyId, action, timestamp',
});

db.version(2).stores({
  auditLogs: '++id, logId, surveyId, surveyorId, actionType, timestamp, synced, syncedAt, formType, province',
});

// v3 — drafts (in-progress surveys, crash recovery). New survey fields
// (spItemId, listName, version, updatedAt) and the 'audio_pending' status are
// unindexed, so the surveys store definition is unchanged.
db.version(3).stores({
  drafts: '++id, draftId, province, updatedAt',
});

// v4 — submissions: a permanent, metadata-only log of every completed survey
// (one tiny row each: surveyor, province, municipality, timestamp). Unlike the
// `surveys` store, these rows are NEVER cleaned up after sync, so they back the
// surveyor's all-time / today / per-municipality counts even offline.
db.version(4).stores({
  submissions: '++id, surveyorId, province, municipality, createdAt',
});

// v5 — sync hardening metadata. The extra fields are mostly unindexed payload
// metadata, but these indexes let recovery/admin tools find receipts and leases.
db.version(5).stores({
  surveys: '++id, surveyId, status, createdAt, syncedAt, province, retryCount, nextRetryAt, syncLeaseUntil, spItemId',
  audioBlobs: '++id, surveyId, questionId, status, uploadedAt',
  submissions: '++id, surveyId, surveyorId, province, municipality, createdAt, syncedAt',
});

/** Typed error so the UI can distinguish a broken DB from a normal empty state. */
export class DBInitError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'DBInitError';
    this.cause = cause;
  }
}

// Another tab holding an older/newer schema open can block our upgrade. Surface it
// rather than hanging silently.
db.on('blocked', () => {
  console.warn('[OfflineDB] Upgrade blocked — another tab has the DB open with a different version.');
});
// If another tab triggers a version change, close here so it isn't stuck.
db.on('versionchange', () => {
  console.warn('[OfflineDB] Version change requested by another tab — closing this connection.');
  db.close();
});

/**
 * Remove audio blobs whose owning survey AND draft no longer exist. These can
 * accumulate if the app is killed between deleting a survey/draft and deleting
 * its blobs. Best-effort: never throws.
 */
async function cleanupOrphanBlobs() {
  try {
    const [surveyIds, draftIds, blobs] = await Promise.all([
      db.surveys.toArray().then(rows => new Set(rows.map(r => r.surveyId))),
      db.drafts.toArray().then(rows => new Set(rows.map(r => r.draftId))),
      db.audioBlobs.toArray(),
    ]);
    const orphans = blobs.filter(b => !surveyIds.has(b.surveyId) && !draftIds.has(b.surveyId));
    if (orphans.length > 0) {
      await db.audioBlobs.bulkDelete(orphans.map(o => o.id));
      console.warn(`[OfflineDB] Removed ${orphans.length} orphaned audio blob(s).`);
    }
  } catch (err) {
    console.warn('[OfflineDB] Orphan cleanup skipped:', err?.message || err);
  }
}

export async function upsertSubmissionReceipt(survey, overrides = {}) {
  const receipt = getSubmissionMetadata(survey, overrides);
  if (!receipt.surveyId) return null;

  const existing = await db.submissions.where('surveyId').equals(receipt.surveyId).first();
  if (existing) {
    await db.submissions.update(existing.id, receipt);
    return { ...existing, ...receipt };
  }
  const id = await db.submissions.add(receipt);
  return { id, ...receipt };
}

export async function finalizeSyncedSurvey(survey, receipt = {}) {
  const syncedAt = receipt.syncedAt || new Date().toISOString();
  const finalizedSurvey = {
    ...survey,
    status: 'synced',
    syncedAt,
    spItemId: receipt.spItemId ?? survey.spItemId ?? null,
    listName: receipt.listName ?? survey.listName ?? null,
  };
  const submission = getSubmissionMetadata(finalizedSurvey, {
    syncStatus: 'synced',
    syncedAt,
    spItemId: finalizedSurvey.spItemId,
    listName: finalizedSurvey.listName,
  });

  await db.transaction('rw', db.surveys, db.audioBlobs, db.submissions, async () => {
    const existing = submission.surveyId
      ? await db.submissions.where('surveyId').equals(submission.surveyId).first()
      : null;
    if (existing) await db.submissions.update(existing.id, submission);
    else if (submission.surveyId) await db.submissions.add(submission);

    await db.audioBlobs.where('surveyId').equals(survey.surveyId).delete();
    if (survey.id != null) await db.surveys.delete(survey.id);
  });
}

async function recoverExpiredSyncLeases() {
  try {
    const now = new Date().toISOString();
    const stuck = await db.surveys
      .where('status').equals('syncing')
      .filter(s => !s.syncLeaseUntil || s.syncLeaseUntil <= now)
      .toArray();

    for (const survey of stuck) {
      await db.surveys.update(survey.id, {
        status: survey.syncPreviousStatus === 'audio_pending' || survey.spItemId ? 'audio_pending' : 'pending',
        syncLeaseOwner: null,
        syncLeaseUntil: null,
        syncPreviousStatus: null,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[OfflineDB] Stuck-survey recovery skipped:', err?.message || err);
  }
}

async function backfillIntegrityMetadata() {
  try {
    const rows = await db.surveys.toArray();
    for (const survey of rows) {
      const patch = {};
      const active = ['pending', 'syncing', 'sync_failed', 'audio_pending'].includes(survey.status);

      if (!survey.surveyId && active) {
        await db.surveys.update(survey.id, {
          status: 'failed_permanent',
          lastError: 'Dados locais corrompidos: SurveyId ausente.',
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      if (active && (!survey.data || typeof survey.data !== 'object')) {
        await db.surveys.update(survey.id, {
          status: 'failed_permanent',
          lastError: 'Dados locais corrompidos: respostas ausentes.',
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      const blobs = survey.surveyId
        ? await db.audioBlobs.where('surveyId').equals(survey.surveyId).toArray()
        : [];

      for (const blobRow of blobs) {
        const blobPatch = {};
        if (!blobRow.mimeType && blobRow.blob?.type) blobPatch.mimeType = blobRow.blob.type;
        if (!blobRow.sizeBytes && blobRow.blob?.size) blobPatch.sizeBytes = blobRow.blob.size;
        if (!blobRow.hash && blobRow.blob) {
          const manifest = await buildAudioManifestFromBlobs([blobRow]);
          if (manifest[0]?.hash) blobPatch.hash = manifest[0].hash;
        }
        if (Object.keys(blobPatch).length > 0) await db.audioBlobs.update(blobRow.id, blobPatch);
      }

      const refreshedBlobs = survey.surveyId
        ? await db.audioBlobs.where('surveyId').equals(survey.surveyId).toArray()
        : [];

      if (!survey.schemaVersion) patch.schemaVersion = SYNC_SCHEMA_VERSION;
      if (!survey.payloadChecksum && survey.data) {
        patch.payloadChecksum = await buildPayloadChecksum(survey.data);
      }
      if (!Array.isArray(survey.audioManifest)) {
        patch.audioManifest = await buildAudioManifestFromBlobs(refreshedBlobs);
      }
      if (!survey.createdAt) patch.createdAt = new Date().toISOString();

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = new Date().toISOString();
        await db.surveys.update(survey.id, patch);
      }

      if (survey.data && survey.surveyId) {
        await upsertSubmissionReceipt({ ...survey, ...patch }, {
          syncStatus: survey.status === 'synced' ? 'synced' : 'local',
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[OfflineDB] Integrity backfill skipped:', err?.message || err);
  }
}

// Whether the browser granted persistent storage (false = eviction risk, e.g. iOS).
// null = unknown/unsupported. Read after initDB() resolves.
export let storagePersisted = null;
export const isStoragePersisted = () => storagePersisted;

export async function initDB() {
  try {
    await db.open();
  } catch (err) {
    // VersionError / corruption / blocked. Try a single controlled recovery for
    // genuine corruption; otherwise surface a typed error for the UI to warn on.
    console.error('[OfflineDB] Failed to open IndexedDB:', err);
    if (err?.name === 'VersionError' || err?.name === 'DatabaseClosedError') {
      throw new DBInitError('A base de dados local precisa de ser reiniciada. Recarregue a aplicação.', err);
    }
    throw new DBInitError('Não foi possível abrir o armazenamento local.', err);
  }

  await recoverExpiredSyncLeases();
  await backfillIntegrityMetadata();

  await cleanupOrphanBlobs();

  if (navigator.storage?.persist) {
    try {
      // persisted() reports the current grant; only request if not already granted.
      const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      storagePersisted = already || await navigator.storage.persist();
      if (!storagePersisted) console.warn('[OfflineDB] Storage NOT persisted — browser may evict data');
    } catch { storagePersisted = null; /* unsupported — unknown */ }
  }

  return db;
}
