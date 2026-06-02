import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/offlineDB';
import {
  createProvinceScope,
  isInProvinceScope,
  mergeStats,
  readUnsyncedSurveyorStats,
} from './useSurveyorStats';

describe('useSurveyorStats scoped aggregation', () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it('matches Bié scope by province aliases and Kuito municipality aliases', () => {
    const bieScope = createProvinceScope(['bie']);

    expect(isInProvinceScope({ province: 'Bié', municipality: 'Kuito' }, bieScope)).toBe(true);
    expect(isInProvinceScope({ province: 'bie', municipality: '' }, bieScope)).toBe(true);
    expect(isInProvinceScope({ province: '', municipality: 'cuito' }, bieScope)).toBe(true);
    expect(isInProvinceScope({ province: 'Cabinda', municipality: 'Cabinda' }, bieScope)).toBe(false);
  });

  it('aggregates only local-unsynced Bié surveys for the selected surveyor', async () => {
    const now = new Date().toISOString();
    const survey = ({ surveyId, province, municipality, interviewerName = 'Ana', status = 'pending' }) => ({
      surveyId,
      status,
      createdAt: now,
      syncedAt: null,
      province,
      retryCount: 0,
      data: {
        responses: { province, municipality },
        metadata: { interviewerName },
      },
    });

    await db.surveys.bulkAdd([
      survey({ surveyId: 'bie-local', province: 'Bié', municipality: 'Kuito' }),
      survey({ surveyId: 'cabinda-local', province: 'Cabinda', municipality: 'Cabinda' }),
      survey({ surveyId: 'bie-other-surveyor', province: 'Bié', municipality: 'Kuito', interviewerName: 'Bruno' }),
      survey({ surveyId: 'bie-audio-only', province: 'Bié', municipality: 'Kuito', status: 'audio_pending' }),
    ]);

    const result = await readUnsyncedSurveyorStats('Ana', createProvinceScope(['Bié']));

    expect(result.rows.map((row) => row.surveyId)).toEqual(['bie-local']);
    expect(result.stats.total).toBe(1);
    expect(result.stats.today).toBe(1);
    expect(result.stats.municipalities).toEqual({ Kuito: 1 });
  });

  it('merges SharePoint and local-unsynced stats without dropping municipality counts', () => {
    const merged = mergeStats(
      { total: 4, today: 1, municipalities: { Kuito: 4 } },
      { total: 2, today: 2, municipalities: { Kuito: 1, Desconhecido: 1 } }
    );

    expect(merged).toEqual({
      total: 6,
      today: 3,
      municipalities: { Kuito: 5, Desconhecido: 1 },
    });
  });
});
