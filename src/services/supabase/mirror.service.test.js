import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPreLaunchSharePointItemData } from '@/services/preLaunchSurveyMapper';

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  storageFrom: vi.fn(),
  inserts: [],
  uploads: [],
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseMocks.createClient,
}));

describe('Supabase prelaunch sync', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_MIRROR_ENABLED', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubEnv('VITE_SUPABASE_AUDIO_BUCKET', 'survey-audio');

    supabaseMocks.inserts = [];
    supabaseMocks.uploads = [];
    supabaseMocks.from.mockImplementation((table) => ({
      insert: vi.fn(async (row) => {
        supabaseMocks.inserts.push({ table, row });
        return { error: null };
      }),
    }));
    supabaseMocks.storageFrom.mockImplementation((bucket) => ({
      upload: vi.fn(async (path, blob, options) => {
        supabaseMocks.uploads.push({ bucket, path, blob, options });
        return { error: null };
      }),
    }));
    supabaseMocks.createClient.mockReturnValue({
      from: supabaseMocks.from,
      storage: { from: supabaseMocks.storageFrom },
    });
  });

  it('builds SharePoint-compatible pre-launch fields from a survey payload', () => {
    const itemData = buildPreLaunchSharePointItemData({
      idempotencyKey: 'survey-1',
      responses: {
        province: 'Cabinda',
        municipality: 'Cabinda',
        phoneNumber: '923456789',
        mainInsight: '[Gravação de Áudio - 10:00]',
      },
      customInputs: {},
      audioRecordings: {
        mainInsight: { blob: new Blob(['audio'], { type: 'audio/webm' }) },
      },
      metadata: {
        completedAt: '2026-06-01T10:00:00.000Z',
        duration: 42,
        interviewerName: 'Ana',
        fingerprint: 'fp-1',
      },
    }, { isDuplicatePhone: true });

    expect(itemData.SurveyId).toBe('survey-1');
    expect(itemData.Provincia).toBe('Cabinda');
    expect(itemData.Municipio).toBe('Cabinda');
    expect(itemData.TemGravacoes).toBe('Sim');
    expect(itemData.CamposComGravacao).toBe('mainInsight');
    expect(itemData.InsightPrincipal).toContain('Audio recording captured at');
    expect(itemData.Duplicado).toBe(true);
    expect(itemData.DataPreenchimento).toBe('2026-06-01T10:00:00.000Z');
  });

  it('writes a survey row and audio object into Supabase before SharePoint exists', async () => {
    const { mirrorPreLaunchSurveyToSupabase } = await import('./mirror.service');
    const surveyData = {
      idempotencyKey: 'survey-2',
      responses: {
        province: 'Bié',
        municipality: 'Kuito',
        phoneNumber: '923456789',
      },
      customInputs: {},
      audioRecordings: {
        mainInsight: { blob: new Blob(['audio'], { type: 'audio/webm' }) },
      },
      metadata: {
        surveyId: 'survey-2',
        completedAt: '2026-06-01T10:00:00.000Z',
        interviewerName: 'Ana',
      },
    };
    const itemData = buildPreLaunchSharePointItemData(surveyData);

    await mirrorPreLaunchSurveyToSupabase({
      surveyData,
      itemData,
    });

    const surveyInsert = supabaseMocks.inserts.find((insert) => insert.table === 'survey_submissions');
    const audioInsert = supabaseMocks.inserts.find((insert) => insert.table === 'survey_audio_files');

    expect(surveyInsert.row.survey_id).toBe('survey-2');
    expect(surveyInsert.row.sharepoint_item_id).toBeNull();
    expect(surveyInsert.row.sharepoint_list_name).toBeNull();
    expect(surveyInsert.row.status).toBe('synced_to_supabase');
    expect(surveyInsert.row.province).toBe('Bié');
    expect(surveyInsert.row.has_audio).toBe(true);
    expect(surveyInsert.row.sharepoint_fields.SurveyId).toBe('survey-2');
    expect(surveyInsert.row.sharepoint_receipt).toEqual({});
    expect(supabaseMocks.uploads[0].bucket).toBe('survey-audio');
    expect(supabaseMocks.uploads[0].path).toMatch(/^prelaunch\/bie\/survey-2\/maininsight-/);
    expect(audioInsert.row.survey_id).toBe('survey-2');
    expect(audioInsert.row.question_id).toBe('mainInsight');
  });

  it('treats duplicate Supabase inserts and storage conflicts as successful retries', async () => {
    const duplicate = { code: '23505', message: 'duplicate key value violates unique constraint' };
    supabaseMocks.from.mockImplementation((table) => ({
      insert: vi.fn(async (row) => {
        supabaseMocks.inserts.push({ table, row });
        return { error: duplicate };
      }),
    }));
    supabaseMocks.storageFrom.mockImplementation((bucket) => ({
      upload: vi.fn(async (path, blob, options) => {
        supabaseMocks.uploads.push({ bucket, path, blob, options });
        return { error: { statusCode: '409', message: 'The resource already exists' } };
      }),
    }));

    const { mirrorPreLaunchSurveyToSupabase } = await import('./mirror.service');
    const surveyData = {
      idempotencyKey: 'survey-3',
      responses: { province: 'Zaire', municipality: 'Soyo' },
      customInputs: {},
      audioRecordings: {
        mainInsight: { blob: new Blob(['audio'], { type: 'audio/webm' }) },
      },
      metadata: { surveyId: 'survey-3', completedAt: '2026-06-01T10:00:00.000Z' },
    };

    await expect(mirrorPreLaunchSurveyToSupabase({
      surveyData,
      itemData: buildPreLaunchSharePointItemData(surveyData),
    })).resolves.toEqual({ success: true });
  });
});
