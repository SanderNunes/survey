import Dexie from 'dexie';

export const db = new Dexie('AfricellSurveyDB');

db.version(1).stores({
  surveys:    '++id, surveyId, status, createdAt, syncedAt, province, retryCount',
  audioBlobs: '++id, surveyId, questionId, status, uploadedAt',
  syncLog:    '++id, surveyId, action, timestamp',
});

export async function initDB() {
  await db.open();

  // Reset surveys stuck in 'syncing' status (app crashed mid-sync)
  await db.surveys.where('status').equals('syncing').modify({ status: 'pending' });

  if (navigator.storage?.persist) {
    const granted = await navigator.storage.persist();
    if (!granted) console.warn('[OfflineDB] Storage NOT persisted — browser may evict data');
  }

  return db;
}
