import { describe, expect, it, vi } from 'vitest';
import { savePreLaunchSurveySupabaseFirst } from './preLaunchSync.service';

function makeQuery(calls, rows = []) {
  const query = {
    select: vi.fn(() => query),
    filter: vi.fn(() => {
      calls.push('sharepoint-query');
      return query;
    }),
    top: vi.fn(() => async () => rows),
  };
  return query;
}

function makeSharePoint(calls, rows = []) {
  const items = {
    select: vi.fn(() => makeQuery(calls, rows)),
    filter: vi.fn(() => {
      calls.push('sharepoint-query');
      return makeQuery(calls, rows);
    }),
    add: vi.fn(async () => {
      calls.push('sharepoint-add');
      return { data: { Id: 42 } };
    }),
  };

  return {
    items,
    sp: {
      web: {
        lists: {
          getByTitle: vi.fn(() => ({ items })),
        },
      },
    },
  };
}

function makeSurvey(overrides = {}) {
  return {
    idempotencyKey: 'survey-order-1',
    responses: {
      province: 'Cabinda',
      municipality: 'Cabinda',
      ...overrides.responses,
    },
    customInputs: {},
    metadata: {
      completedAt: '2026-06-01T10:00:00.000Z',
      interviewerName: 'Ana',
      ...overrides.metadata,
    },
    ...overrides,
  };
}

describe('prelaunch Supabase-first sync flow', () => {
  it('writes Supabase before any SharePoint duplicate check or item insert', async () => {
    const calls = [];
    const { sp, items } = makeSharePoint(calls);
    const mirrorToSupabase = vi.fn(async ({ sharePoint }) => {
      calls.push('supabase');
      expect(sharePoint).toBeUndefined();
    });
    const acquireToken = vi.fn(async () => {
      calls.push('token');
      return 'token';
    });

    const result = await savePreLaunchSurveySupabaseFirst({
      surveyData: makeSurvey(),
      sp,
      acquireToken,
      uploadPreLaunchAudio: vi.fn(),
      mirrorToSupabase,
    });

    expect(result.success).toBe(true);
    expect(result.itemId).toBe(42);
    expect(calls).toEqual(['supabase', 'token', 'sharepoint-query', 'sharepoint-add']);
    expect(items.add).toHaveBeenCalledTimes(1);
  });

  it('returns a retryable failure without touching SharePoint when Supabase fails', async () => {
    const calls = [];
    const { sp, items } = makeSharePoint(calls);
    const acquireToken = vi.fn(async () => {
      calls.push('token');
      return 'token';
    });

    const result = await savePreLaunchSurveySupabaseFirst({
      surveyData: makeSurvey(),
      sp,
      acquireToken,
      uploadPreLaunchAudio: vi.fn(),
      mirrorToSupabase: vi.fn(async () => {
        calls.push('supabase');
        throw new Error('Supabase unavailable');
      }),
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.message).toContain('Supabase sync failed');
    expect(calls).toEqual(['supabase']);
    expect(acquireToken).not.toHaveBeenCalled();
    expect(items.add).not.toHaveBeenCalled();
  });

  it('returns a deferred SharePoint readiness result after the Supabase first write', async () => {
    const calls = [];
    const mirrorToSupabase = vi.fn(async () => {
      calls.push('supabase');
    });
    const acquireToken = vi.fn(async () => {
      calls.push('token');
      return 'token';
    });

    const result = await savePreLaunchSurveySupabaseFirst({
      surveyData: makeSurvey(),
      sp: null,
      acquireToken,
      uploadPreLaunchAudio: vi.fn(),
      mirrorToSupabase,
    });

    expect(result.success).toBe(false);
    expect(result.deferred).toBe(true);
    expect(result.reason).toBe('sharepoint_not_ready');
    expect(result.message).toBe('SharePoint not initialized');
    expect(calls).toEqual(['supabase']);
    expect(acquireToken).not.toHaveBeenCalled();
  });
});
