import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const localStore = new Map();

function installBrowserGlobals() {
  Object.defineProperty(globalThis, 'screen', {
    value: { width: 1024, height: 768 },
    configurable: true,
  });

  Object.defineProperty(globalThis, 'navigator', {
    value: {
      onLine: true,
      userAgent: 'vitest',
      platform: 'test',
      language: 'en-US',
      connection: { effectiveType: '4g' },
      storage: {
        estimate: vi.fn(async () => ({ quota: 100_000_000, usage: 1_000 })),
        persisted: vi.fn(async () => true),
        persist: vi.fn(async () => true),
      },
      serviceWorker: null,
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, 'window', {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, value) => localStore.set(key, String(value)),
      removeItem: (key) => localStore.delete(key),
      clear: () => localStore.clear(),
    },
    configurable: true,
  });

  URL.createObjectURL = vi.fn(() => 'blob:vitest');
  URL.revokeObjectURL = vi.fn();
}

describe('pre-launch offline sync hardening', () => {
  let db;
  let initDB;
  let syncEngine;
  let migrateFromLocalStorage;
  let buildAudioManifestFromRecordings;
  let buildPayloadChecksum;

  beforeAll(async () => {
    installBrowserGlobals();
    ({ db, initDB } = await import('@/db/offlineDB'));
    ({ syncEngine } = await import('@/services/syncEngine'));
    ({ migrateFromLocalStorage } = await import('@/hooks/useOfflineQueue'));
    ({ buildAudioManifestFromRecordings, buildPayloadChecksum } = await import('@/utils/syncIntegrity'));
  });

  beforeEach(async () => {
    localStorage.clear();
    db.close();
    await db.delete();
    await initDB();
    syncEngine.isSyncing = false;
  });

  async function addSurvey({ surveyId = 'survey-1', status = 'pending', data, audioRecordings = {}, checksum } = {}) {
    const surveyData = data || {
      responses: { province: 'Cabinda', municipality: 'Cabinda' },
      customInputs: {},
      metadata: { surveyId, interviewerName: 'Ana' },
    };
    const audioManifest = await buildAudioManifestFromRecordings(audioRecordings);
    const payloadChecksum = checksum ?? await buildPayloadChecksum(surveyData);
    for (const [questionId, recording] of Object.entries(audioRecordings)) {
      const manifest = audioManifest.find(entry => entry.questionId === questionId);
      await db.audioBlobs.add({
        surveyId,
        questionId,
        blob: recording.blob,
        mimeType: recording.blob.type,
        sizeBytes: recording.blob.size,
        hash: manifest?.hash || '',
        status: 'pending',
        uploadedAt: null,
      });
    }
    const id = await db.surveys.add({
      surveyId,
      status,
      createdAt: '2026-06-01T10:00:00.000Z',
      syncedAt: null,
      province: 'Cabinda',
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      data: surveyData,
      schemaVersion: 2,
      payloadChecksum,
      audioManifest,
    });
    return db.surveys.get(id);
  }

  it('migrates offline.html localStorage records into Dexie and clears only migrated rows', async () => {
    localStorage.setItem('offline-cabinda-surveys', JSON.stringify([{
      id: 'legacy-1',
      timestamp: '2026-06-01T09:00:00.000Z',
      status: 'pending',
      responses: { province: 'Cabinda', municipality: 'Cabinda' },
      customInputs: {},
      metadata: { interviewerName: 'Ana' },
      fingerprint: 'fp',
      audioData: {},
    }]));

    await migrateFromLocalStorage();

    const survey = await db.surveys.where('surveyId').equals('legacy-1').first();
    expect(survey.payloadChecksum).toBeTruthy();
    expect(survey.schemaVersion).toBe(2);
    expect(await db.submissions.where('surveyId').equals('legacy-1').count()).toBe(1);
    expect(localStorage.getItem('offline-cabinda-surveys')).toBeNull();
  });

  it('recovers expired syncing leases on init', async () => {
    await addSurvey({ surveyId: 'stuck-1', status: 'syncing' });
    await db.surveys.where('surveyId').equals('stuck-1').modify({
      syncPreviousStatus: 'pending',
      syncLeaseUntil: '2026-01-01T00:00:00.000Z',
    });

    await initDB();

    const recovered = await db.surveys.where('surveyId').equals('stuck-1').first();
    expect(recovered.status).toBe('pending');
    expect(recovered.syncLeaseUntil).toBeNull();
  });

  it('marks checksum mismatches as permanent failures without calling SharePoint', async () => {
    await addSurvey({ surveyId: 'bad-checksum', checksum: 'not-the-real-checksum' });
    const saveFn = vi.fn(async () => ({ success: true }));

    await syncEngine._runQueue(saveFn);

    const failed = await db.surveys.where('surveyId').equals('bad-checksum').first();
    expect(saveFn).not.toHaveBeenCalled();
    expect(failed.status).toBe('failed_permanent');
    expect(failed.lastError).toContain('checksum');
  });

  it('deletes full local data after verified SharePoint sync and keeps metadata receipt', async () => {
    const survey = await addSurvey({ surveyId: 'synced-1' });

    await syncEngine._syncOne(survey, async (payload) => {
      expect(payload.idempotencyKey).toBe('synced-1');
      return { success: true, itemId: 42, listName: 'Cabinda_PreLaunch_Survey' };
    });

    expect(await db.surveys.where('surveyId').equals('synced-1').count()).toBe(0);
    expect(await db.audioBlobs.where('surveyId').equals('synced-1').count()).toBe(0);
    const receipt = await db.submissions.where('surveyId').equals('synced-1').first();
    expect(receipt.syncStatus).toBe('synced');
    expect(receipt.spItemId).toBe(42);
  });

  it('keeps only failed audio locally after partial SharePoint attachment upload', async () => {
    const audioRecordings = {
      mainInsight: { blob: new Blob(['ok-audio'], { type: 'audio/webm' }) },
      newShopLocation: { blob: new Blob(['failed-audio'], { type: 'audio/webm' }) },
    };
    const survey = await addSurvey({ surveyId: 'partial-audio', audioRecordings });

    await syncEngine._syncOne(survey, async () => ({
      success: true,
      itemId: 99,
      listName: 'Cabinda_PreLaunch_Survey',
      audioUploadResult: {
        hasFailures: true,
        details: [
          { questionId: 'mainInsight', success: true },
          { questionId: 'newShopLocation', success: false, error: 'network' },
        ],
      },
    }));

    const queued = await db.surveys.where('surveyId').equals('partial-audio').first();
    const blobs = await db.audioBlobs.where('surveyId').equals('partial-audio').toArray();
    expect(queued.status).toBe('audio_pending');
    expect(queued.spItemId).toBe(99);
    expect(queued.audioManifest.map(entry => entry.questionId)).toEqual(['newShopLocation']);
    expect(blobs.map(blob => blob.questionId)).toEqual(['newShopLocation']);
    expect(blobs[0].status).toBe('upload_failed');
  });
});
