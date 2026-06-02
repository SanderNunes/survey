import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Cloud,
  CloudOff,
  Database,
  HardDrive,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useSurveyorStats } from '@/hooks/useSurveyorStats';
import { db } from '@/db/offlineDB';
import {
  PRELAUNCH_MUNICIPALITIES_BY_PROVINCE,
  PRELAUNCH_MUNICIPALITY_TARGETS,
  PRELAUNCH_PROVINCE_TARGETS,
} from '@/config/preLaunchSurvey';

const QUEUE_STATUSES = ['pending', 'sync_failed', 'syncing', 'audio_pending', 'failed_permanent'];
const LOCALE_MAP = { en: 'en-US', pt: 'pt-AO', fr: 'fr-FR' };
const DASHBOARD_PROVINCE_SCOPE = ['Bié'];
const DASHBOARD_TOTAL_TARGET = DASHBOARD_PROVINCE_SCOPE.reduce(
  (sum, province) => sum + (PRELAUNCH_PROVINCE_TARGETS[province] || 0),
  0,
);

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const sameSurveyor = (survey, interviewerName) => {
  const expected = normalizeName(interviewerName);
  return !!expected && normalizeName(survey.data?.metadata?.interviewerName) === expected;
};

const formatNumber = (value) => new Intl.NumberFormat().format(value || 0);

function pct(done, target) {
  if (!target) return 0;
  return Math.min(100, Math.max(0, Math.round((done / target) * 100)));
}

function StatCard({ icon, label, value, sub, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-400" title={label}>
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold leading-none text-gray-900">{value}</p>
          {sub && <p className="mt-1 truncate text-xs text-gray-500" title={sub}>{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.primary}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ children, icon, className }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {icon}
      {children}
    </span>
  );
}

function Notice({ icon, children, tone = 'amber' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  const iconTones = {
    amber: 'text-amber-600',
    red: 'text-red-500',
    blue: 'text-blue-500',
  };
  const noticeIcon = icon
    ? React.cloneElement(icon, {
        className: `mt-0.5 h-4 w-4 flex-shrink-0 ${iconTones[tone]} ${icon.props.className || ''}`,
      })
    : <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconTones[tone]}`} />;

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 ${tones[tone]}`}>
      {noticeIcon}
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}

function ProgressRow({ name, done, target, muted = false }) {
  const value = pct(done, target);
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className={`truncate font-semibold ${muted ? 'text-gray-500' : 'text-gray-700'}`} title={name}>
          {name}
        </span>
        <span className="flex-shrink-0 text-gray-500">{formatNumber(done)}/{formatNumber(target)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${muted ? 'bg-gray-300' : 'bg-primary'}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function QueueBadge({ status, isCurrent, t }) {
  if (isCurrent || status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('dashboard.statusSyncing')}
      </span>
    );
  }
  if (status === 'sync_failed') {
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{t('dashboard.statusFailed')}</span>;
  }
  if (status === 'failed_permanent') {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{t('dashboard.statusPermanent')}</span>;
  }
  if (status === 'audio_pending') {
    return <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-600">{t('dashboard.statusAudioPending')}</span>;
  }
  return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{t('dashboard.statusPending')}</span>;
}

export default function SurveyorDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const localeTag = LOCALE_MAP[i18n.language] || 'en-US';

  const {
    saveCabindaSurveyResponse,
    syncAuditLogsToSharePoint,
    getMySurveyStats,
    currentUserName,
  } = useSharePoint();

  const {
    isOnline,
    pendingCount,
    syncProgress,
    triggerSync,
    storageInfo,
    dbError,
    storagePersisted,
  } = useOfflineQueue(saveCabindaSurveyResponse, syncAuditLogsToSharePoint);

  const {
    stats,
    sharePointStats,
    localUnsyncedStats,
    source,
    loading,
    interviewerName,
    refresh,
    error: statsError,
    lastUpdatedAt,
    pendingOverlayCount,
  } = useSurveyorStats({
    getMySurveyStats,
    isOnline,
    currentUserName,
    provinceScope: DASHBOARD_PROVINCE_SCOPE,
  });

  const [queueItems, setQueueItems] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const loadQueueItems = useCallback(async () => {
    if (!interviewerName) {
      setQueueItems([]);
      return;
    }

    setQueueLoading(true);
    try {
      const rows = await db.surveys
        .where('status')
        .anyOf(QUEUE_STATUSES)
        .filter(survey => sameSurveyor(survey, interviewerName))
        .toArray();
      setQueueItems(rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
    } catch {
      setQueueItems([]);
    } finally {
      setQueueLoading(false);
    }
  }, [interviewerName]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), loadQueueItems()]);
  }, [refresh, loadQueueItems]);

  const retrySurvey = useCallback(async (surveyId) => {
    await db.surveys.where('surveyId').equals(surveyId).modify({
      status: 'pending',
      retryCount: 0,
      lastError: null,
      nextRetryAt: null,
    });
    await loadQueueItems();
    triggerSync();
  }, [loadQueueItems, triggerSync]);

  // Re-pull stats once a sync run finishes (synced rows may change server totals).
  useEffect(() => {
    if (!syncProgress.isActive) refreshAll();
  }, [syncProgress.isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadQueueItems(); }, [loadQueueItems, pendingCount, syncProgress.surveyId]);

  const provinceRows = useMemo(() => {
    const municipalities = stats?.municipalities || {};
    return DASHBOARD_PROVINCE_SCOPE.map((province) => {
      const municipalityNames = PRELAUNCH_MUNICIPALITIES_BY_PROVINCE[province] || [];
      const target = PRELAUNCH_PROVINCE_TARGETS[province] || municipalityNames.reduce(
        (sum, mun) => sum + (PRELAUNCH_MUNICIPALITY_TARGETS[mun] || 0),
        0,
      );
      const done = municipalityNames.reduce((sum, mun) => sum + (municipalities[mun] || 0), 0);
      return {
        province,
        done,
        target,
        municipalities: municipalityNames.map(mun => ({
          name: mun,
          done: municipalities[mun] || 0,
          target: PRELAUNCH_MUNICIPALITY_TARGETS[mun] || 0,
        })),
      };
    });
  }, [stats]);

  const allDone = stats?.total || 0;
  const overallPct = pct(allDone, DASHBOARD_TOTAL_TARGET);
  const remaining = Math.max(0, DASHBOARD_TOTAL_TARGET - allDone);
  const visibleQueueItems = queueItems.slice(0, 5);
  const hiddenQueueCount = Math.max(0, queueItems.length - visibleQueueItems.length);
  const lastUpdatedText = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-400">{t('dashboard.greeting')}</p>
            <h1 className="truncate text-2xl font-bold text-primaryDark sm:text-3xl">
              {interviewerName || t('dashboard.surveyor')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.biePrelaunch')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              icon={isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              className={isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
            >
              {isOnline ? t('ui.online') : t('ui.offline')}
            </StatusPill>
            <StatusPill
              icon={source === 'server' ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              className={source === 'server' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}
            >
              {source === 'server'
                ? pendingOverlayCount > 0
                  ? t('dashboard.serverWithLocal', { count: pendingOverlayCount })
                  : t('dashboard.sourceServer')
                : t('dashboard.sourceLocal')}
            </StatusPill>
            <button
              type="button"
              onClick={refreshAll}
              disabled={loading || queueLoading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
              title={t('dashboard.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${loading || queueLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<ClipboardList className="h-4 w-4" />}
                label={t('dashboard.combinedTotal')}
                value={formatNumber(stats.total)}
                sub={t('dashboard.ofTarget', { count: formatNumber(stats.total), target: formatNumber(DASHBOARD_TOTAL_TARGET) })}
              />
              <StatCard
                icon={<Cloud className="h-4 w-4" />}
                label={t('dashboard.sharePoint')}
                value={formatNumber(sharePointStats.total)}
                sub={source === 'server' ? t('dashboard.sharePointSynced') : t('dashboard.waitingForData')}
              />
              <StatCard
                icon={<Database className="h-4 w-4" />}
                label={t('dashboard.localUnsynced')}
                value={formatNumber(localUnsyncedStats.total)}
                sub={t('dashboard.localNotInSharePoint')}
                tone="amber"
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label={t('dashboard.today')}
                value={formatNumber(stats.today)}
                sub={lastUpdatedText ? t('dashboard.lastUpdated', { time: lastUpdatedText }) : t('dashboard.waitingForData')}
                tone="green"
              />
            </div>

            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-bold text-gray-900">{t('dashboard.overallProgress')}</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('dashboard.remaining', { count: formatNumber(remaining) })}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-bold leading-none text-gray-900">{overallPct}%</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">{t('dashboard.completed')}</p>
                </div>
              </div>

              <div className="mb-5 h-3 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${overallPct}%` }} />
              </div>

              {allDone === 0 && !loading ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                  <p className="text-sm font-semibold text-gray-700">{t('dashboard.noProgress')}</p>
                  <p className="mt-1 text-xs text-gray-500">{t('dashboard.noProgressHint')}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {provinceRows.map((province) => (
                    <div key={province.province} className="min-w-0">
                      <ProgressRow name={province.province} done={province.done} target={province.target} />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {province.municipalities.map((mun) => (
                          <ProgressRow key={mun.name} name={mun.name} done={mun.done} target={mun.target} muted />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <button
              type="button"
              onClick={() => navigate('/home/survey')}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primaryDark active:scale-[0.99]"
            >
              <Plus className="h-5 w-5" />
              <span>{t('dashboard.startSurvey')}</span>
            </button>

            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{t('dashboard.syncTitle')}</h2>
                  <p className="mt-0.5 text-xs text-gray-500">{t('dashboard.syncSubtitle')}</p>
                </div>
                {syncProgress.isActive
                  ? <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-500" />
                  : pendingCount > 0
                    ? <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                    : <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                }
              </div>

              <p className="mb-3 text-xs text-gray-600">
                {syncProgress.isActive
                  ? t('dashboard.syncingProgress', { current: syncProgress.current, total: syncProgress.total })
                  : pendingCount > 0
                    ? t('dashboard.syncPending', { count: pendingCount })
                    : t('dashboard.syncAllDone')
                }
              </p>

              {syncProgress.isActive && syncProgress.total > 0 && (
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${pct(syncProgress.current, syncProgress.total)}%` }}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => triggerSync()}
                disabled={syncProgress.isActive || !isOnline || pendingCount === 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncProgress.isActive ? 'animate-spin' : ''}`} />
                {t('dashboard.syncNow')}
              </button>
              {!isOnline && pendingCount > 0 && (
                <p className="mt-2 text-center text-xs text-gray-400">{t('dashboard.syncOffline')}</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Database className="h-4 w-4 flex-shrink-0 text-primary" />
                  <h2 className="truncate text-sm font-bold text-gray-900">{t('dashboard.queueTitle')}</h2>
                </div>
                {queueLoading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />}
              </div>

              {visibleQueueItems.length === 0 && !queueLoading ? (
                <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
                  {t('dashboard.queueEmpty')}
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleQueueItems.map((item) => {
                    const isCurrent = syncProgress.isActive && syncProgress.surveyId === item.surveyId;
                    const municipality = item.data?.responses?.municipality || item.data?.responses?.province || t('dashboard.unknownMunicipality');
                    const date = item.createdAt ? new Date(item.createdAt) : null;
                    const dateText = date
                      ? `${date.toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}`
                      : '';
                    const canRetry = ['sync_failed', 'failed_permanent'].includes(item.status) && !isCurrent;

                    return (
                      <div key={item.surveyId} className={`py-3 ${isCurrent ? 'bg-blue-50/70 px-2' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-800" title={municipality}>{municipality}</p>
                            {dateText && <p className="mt-0.5 text-xs text-gray-400">{dateText}</p>}
                            {item.retryCount > 0 && !isCurrent && (
                              <p className="mt-0.5 text-xs text-amber-600">{t('dashboard.attempts', { count: item.retryCount })}</p>
                            )}
                            {item.lastError && !isCurrent && (
                              <p className="mt-0.5 truncate text-xs text-red-500" title={item.lastError}>{item.lastError}</p>
                            )}
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end gap-2">
                            <QueueBadge status={item.status} isCurrent={isCurrent} t={t} />
                            {canRetry && (
                              <button
                                type="button"
                                onClick={() => retrySurvey(item.surveyId)}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                              >
                                <RotateCcw className="h-3 w-3" />
                                {t('dashboard.retry')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hiddenQueueCount > 0 && (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                  {t('dashboard.queueMore', { count: hiddenQueueCount })}
                </p>
              )}
            </section>

            <div className="space-y-3">
              {statsError && <Notice tone="amber">{t('dashboard.statsError')}</Notice>}
              {dbError && (
                <Notice tone="red">
                  <span className="font-semibold">{t('dashboard.dbErrorTitle')}:</span> {dbError.message || t('dashboard.dbErrorHint')}
                </Notice>
              )}
              {storagePersisted === false && (
                <Notice icon={<HardDrive />} tone="amber">{t('dashboard.storagePersistedWarning')}</Notice>
              )}
              {storageInfo?.isWarning && (
                <Notice tone={storageInfo.isCritical ? 'red' : 'amber'}>
                  {storageInfo.isCritical
                    ? t('dashboard.storageCritical')
                    : `${t('dashboard.storageWarning')} ${storageInfo.usageMB} MB / ${storageInfo.quotaMB} MB`}
                </Notice>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
