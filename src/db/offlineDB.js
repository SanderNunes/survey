import Dexie from 'dexie';

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

  // Recovery: a survey left mid-sync (app crashed) is re-queued. audio_pending
  // surveys are left as-is — the sync engine re-uploads only their missing audio.
  try {
    await db.surveys.where('status').equals('syncing').modify({ status: 'pending' });
  } catch (err) {
    console.warn('[OfflineDB] Stuck-survey recovery skipped:', err?.message || err);
  }

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
