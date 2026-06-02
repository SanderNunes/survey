import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/db/offlineDB';
import {
  PRELAUNCH_MUNICIPALITIES_BY_PROVINCE,
  normalizePreLaunchProvince,
} from '@/config/preLaunchSurvey';
import { normalizeSurveyValue } from '@/utils/surveyValueMapping';

const INTERVIEWER_NAME_KEY = 'cabinda_interviewer_name';
const UNSYNCED_STATUSES = ['pending', 'sync_failed', 'syncing', 'failed_permanent'];
const EMPTY_PROVINCE_SCOPE = [];

export const emptyStats = { total: 0, today: 0, municipalities: {} };

export const cloneStats = (stats = emptyStats) => ({
  total: stats.total || 0,
  today: stats.today || 0,
  municipalities: { ...(stats.municipalities || {}) },
});

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const isSameSurveyor = (rowName, interviewerName) => {
  const expected = normalizeName(interviewerName);
  return !!expected && normalizeName(rowName) === expected;
};

const normalizeScopeKey = (value) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();

export function createProvinceScope(provinceScope = []) {
  if (!Array.isArray(provinceScope) || provinceScope.length === 0) return null;

  const provinces = [...new Set(
    provinceScope
      .map((province) => normalizePreLaunchProvince(province))
      .filter(Boolean)
  )];
  if (provinces.length === 0) return null;

  const municipalities = [...new Set(
    provinces.flatMap((province) => PRELAUNCH_MUNICIPALITIES_BY_PROVINCE[province] || [])
  )];

  return {
    provinces,
    provinceKeys: new Set(provinces.map(normalizeScopeKey)),
    municipalityKeys: new Set(municipalities.map(normalizeScopeKey)),
  };
}

export function isInProvinceScope({ province, municipality } = {}, provinceScope = null) {
  const scope = Array.isArray(provinceScope) ? createProvinceScope(provinceScope) : provinceScope;
  if (!scope) return true;

  const normalizedProvince = normalizePreLaunchProvince(province);
  if (normalizedProvince && scope.provinceKeys.has(normalizeScopeKey(normalizedProvince))) {
    return true;
  }

  const normalizedMunicipality = normalizeSurveyValue('Municipio', municipality);
  return !!normalizedMunicipality && scope.municipalityKeys.has(normalizeScopeKey(normalizedMunicipality));
}

export const addSurveyToStats = (stats, { municipality, createdAt }) => {
  const todayKey = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const mun = normalizeSurveyValue('Municipio', municipality) || 'Desconhecido';
  stats.total += 1;
  stats.municipalities[mun] = (stats.municipalities[mun] || 0) + 1;
  if (createdAt && new Date(createdAt).toLocaleDateString('en-CA') === todayKey) {
    stats.today += 1;
  }
};

export const mergeStats = (base, overlay) => {
  const merged = cloneStats(base);
  merged.total += overlay.total || 0;
  merged.today += overlay.today || 0;
  for (const [mun, count] of Object.entries(overlay.municipalities || {})) {
    merged.municipalities[mun] = (merged.municipalities[mun] || 0) + count;
  }
  return merged;
};

/**
 * Resolve the surveyor's display name the same way the survey form does:
 * the confirmed interviewer name in localStorage, falling back to the signed-in
 * account name. This is what `NomeEntrevistador` is written with on SharePoint.
 */
export function getInterviewerName(currentUserName) {
  return (localStorage.getItem(INTERVIEWER_NAME_KEY) || currentUserName || '').trim();
}

/** Aggregate the permanent local submission log into { total, today, municipalities }. */
async function readLocalStats(interviewerName, provinceScope = null) {
  if (!interviewerName) return cloneStats();
  const rows = await db.submissions
    .filter(row => isSameSurveyor(row.surveyorId, interviewerName))
    .toArray();
  const stats = cloneStats();
  for (const row of rows) {
    if (!isInProvinceScope(row, provinceScope)) continue;
    addSurveyToStats(stats, row);
  }
  return stats;
}

/** Surveys still local-only. These overlay server stats without double-counting synced rows. */
export async function readUnsyncedSurveyorStats(interviewerName, provinceScope = null) {
  if (!interviewerName) return { stats: cloneStats(), rows: [] };

  const rows = await db.surveys
    .where('status')
    .anyOf(UNSYNCED_STATUSES)
    .filter(survey =>
      isSameSurveyor(survey.data?.metadata?.interviewerName, interviewerName) &&
      isInProvinceScope({
        province: survey.province || survey.data?.responses?.province,
        municipality: survey.data?.responses?.municipality,
      }, provinceScope)
    )
    .toArray();

  const stats = cloneStats();
  for (const survey of rows) {
    addSurveyToStats(stats, {
      municipality: survey.data?.responses?.municipality,
      createdAt: survey.createdAt,
    });
  }

  return {
    stats,
    rows: rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  };
}

/**
 * useSurveyorStats — the logged-in surveyor's personal progress.
 *
 * Reads the permanent local `submissions` store immediately (works offline), and
 * when online reconciles against SharePoint (authoritative — covers other devices
 * and pre-existing data) via getMySurveyStats. Local-only pending surveys are
 * overlaid on top of server results so current-device work is still visible.
 *
 * Returns { stats, sharePointStats, localUnsyncedStats, source: 'server' | 'local',
 * loading, interviewerName, refresh, error, lastUpdatedAt, pendingOverlayCount }.
 */
export function useSurveyorStats({ getMySurveyStats, isOnline, currentUserName, provinceScope = EMPTY_PROVINCE_SCOPE }) {
  const [stats, setStats]   = useState(emptyStats);
  const [sharePointStats, setSharePointStats] = useState(emptyStats);
  const [localUnsyncedStats, setLocalUnsyncedStats] = useState(emptyStats);
  const [source, setSource] = useState('local');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [pendingOverlayCount, setPendingOverlayCount] = useState(0);

  const interviewerName = getInterviewerName(currentUserName);
  const provinceScopeKey = Array.isArray(provinceScope) ? provinceScope.map(String).join('|') : '';
  const scopedProvinces = useMemo(
    () => createProvinceScope(provinceScopeKey ? provinceScopeKey.split('|') : EMPTY_PROVINCE_SCOPE),
    [provinceScopeKey]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Local first — always available, instant, offline-safe.
    let local = cloneStats();
    let unsyncedLocal = { stats: cloneStats(), rows: [] };
    try {
      [local, unsyncedLocal] = await Promise.all([
        readLocalStats(interviewerName, scopedProvinces),
        readUnsyncedSurveyorStats(interviewerName, scopedProvinces),
      ]);
    } catch { /* db may not be ready */ }
    setStats(local);
    setSharePointStats(cloneStats());
    setLocalUnsyncedStats(unsyncedLocal.stats);
    setSource('local');
    setPendingOverlayCount(unsyncedLocal.stats.total || 0);
    setLastUpdatedAt(new Date().toISOString());

    // Reconcile with SharePoint when possible; prefer server numbers plus
    // current local-only work that SharePoint cannot know about yet.
    if (isOnline && getMySurveyStats && interviewerName) {
      try {
        const [server, unsynced] = await Promise.all([
          getMySurveyStats(interviewerName, { provinces: scopedProvinces?.provinces || [] }),
          readUnsyncedSurveyorStats(interviewerName, scopedProvinces).catch(() => ({ stats: cloneStats(), rows: [] })),
        ]);
        if (server) {
          const normalizedServer = cloneStats(server);
          setSharePointStats(normalizedServer);
          setLocalUnsyncedStats(unsynced.stats);
          setStats(mergeStats(normalizedServer, unsynced.stats));
          setSource('server');
          setPendingOverlayCount(unsynced.stats.total || 0);
          setLastUpdatedAt(new Date().toISOString());
        }
      } catch (err) {
        setError(err?.message || 'Failed to load surveyor stats.');
      }
    }
    setLoading(false);
  }, [isOnline, getMySurveyStats, interviewerName, scopedProvinces]);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    stats,
    sharePointStats,
    localUnsyncedStats,
    source,
    loading,
    interviewerName,
    refresh,
    error,
    lastUpdatedAt,
    pendingOverlayCount,
  };
}
