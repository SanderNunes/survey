import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Search, AlertTriangle, CheckCircle, XCircle, Clock, User, RotateCcw } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';

// ── Action type badge config ──────────────────────────────────────────────────

const ACTION_META = {
  survey_opened:          { label: 'Opened',           color: 'bg-blue-100 text-blue-700'    },
  survey_completed:       { label: 'Completed',         color: 'bg-green-100 text-green-700'  },
  survey_saved_offline:   { label: 'Saved Offline',     color: 'bg-yellow-100 text-yellow-700'},
  sync_started:           { label: 'Sync Started',      color: 'bg-gray-100 text-gray-600'    },
  sync_succeeded:         { label: 'Sync OK',           color: 'bg-emerald-100 text-emerald-700'},
  sync_failed:            { label: 'Sync Failed',       color: 'bg-red-100 text-red-700'      },
  submission_confirmed:   { label: 'Confirmed',         color: 'bg-emerald-100 text-emerald-700'},
  retry_triggered:        { label: 'Retry',             color: 'bg-orange-100 text-orange-700'},
  duplicate_detected:     { label: 'Duplicate',         color: 'bg-purple-100 text-purple-700'},
  audio_upload_started:   { label: 'Audio Start',       color: 'bg-sky-100 text-sky-700'      },
  audio_upload_completed: { label: 'Audio OK',          color: 'bg-sky-100 text-sky-700'      },
  audio_upload_failed:    { label: 'Audio Failed',      color: 'bg-red-100 text-red-700'      },
  storage_warning:        { label: 'Storage Warn',      color: 'bg-amber-100 text-amber-700'  },
  storage_critical:       { label: 'Storage Critical',  color: 'bg-red-200 text-red-800'      },
};

function ActionBadge({ type }) {
  const meta = ACTION_META[type] || { label: type, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

// ── Compute per-surveyor stats from flat log array ───────────────────────────

function computeStats(logs) {
  const bySurveyor = {};

  for (const log of logs) {
    const key = log.SurveyorId || 'unknown';
    if (!bySurveyor[key]) {
      bySurveyor[key] = {
        surveyorId:     key,
        completed:      0,
        confirmed:      0,
        syncFailed:     0,
        retried:        0,
        permanentFails: new Set(),
        recoveredSurveys: new Set(),
        // track surveyIds that had failures
        failedSurveyIds: new Set(),
        confirmedSurveyIds: new Set(),
      };
    }
    const s = bySurveyor[key];

    switch (log.ActionType) {
      case 'survey_completed':    s.completed++;  break;
      case 'submission_confirmed': s.confirmed++; s.confirmedSurveyIds.add(log.SurveyId); break;
      case 'sync_failed':          s.syncFailed++; s.failedSurveyIds.add(log.SurveyId);  break;
      case 'retry_triggered':      s.retried++;    break;
    }
  }

  // Surveys that had failures but eventually were confirmed = recovered
  for (const s of Object.values(bySurveyor)) {
    for (const sid of s.failedSurveyIds) {
      if (s.confirmedSurveyIds.has(sid)) s.recoveredSurveys.add(sid);
      else s.permanentFails.add(sid);
    }
  }

  return Object.values(bySurveyor).sort((a, b) => b.completed - a.completed);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'text-gray-800', bgColor = 'bg-white' }) {
  return (
    <div className={`${bgColor} rounded-xl border border-gray-200 shadow-sm px-4 py-4 space-y-1`}>
      <div className="flex items-center gap-2 text-gray-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AuditiesTab() {
  const { getAuditLogs } = useSharePoint();

  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [filterSurveyor, setFilterSurveyor] = useState('');
  const [filterAction, setFilterAction]     = useState('');
  const [expandedRow, setExpandedRow]       = useState(null);
  const [logPage, setLogPage]   = useState(1);
  const LOG_PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs({ top: 5000 });
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuditLogs]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = computeStats(logs);

  const totalCompleted  = logs.filter(l => l.ActionType === 'survey_completed').length;
  const totalConfirmed  = logs.filter(l => l.ActionType === 'submission_confirmed').length;
  const totalSyncFailed = logs.filter(l => l.ActionType === 'sync_failed').length;

  // Surveys that had failures but recovered
  const allFailed    = new Set(logs.filter(l => l.ActionType === 'sync_failed').map(l => l.SurveyId));
  const allConfirmed = new Set(logs.filter(l => l.ActionType === 'submission_confirmed').map(l => l.SurveyId));
  const recovered    = [...allFailed].filter(id => allConfirmed.has(id)).length;
  const permanent    = [...allFailed].filter(id => !allConfirmed.has(id)).length;

  // ── Filtered log rows ────────────────────────────────────────────────────
  const surveyers = [...new Set(logs.map(l => l.SurveyorId).filter(Boolean))].sort();
  const actionTypes = [...new Set(logs.map(l => l.ActionType).filter(Boolean))].sort();

  const term = search.toLowerCase();
  const filtered = logs.filter(l => {
    if (filterSurveyor && l.SurveyorId !== filterSurveyor) return false;
    if (filterAction && l.ActionType !== filterAction) return false;
    if (term) {
      return (
        (l.SurveyorId  || '').toLowerCase().includes(term) ||
        (l.SurveyId    || '').toLowerCase().includes(term) ||
        (l.ActionType  || '').toLowerCase().includes(term) ||
        (l.ErrorDetails|| '').toLowerCase().includes(term) ||
        (l.Province    || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalLogPages = Math.max(1, Math.ceil(filtered.length / LOG_PAGE_SIZE));
  const safePage      = Math.min(logPage, totalLogPages);
  const pageSlice     = filtered.slice((safePage - 1) * LOG_PAGE_SIZE, safePage * LOG_PAGE_SIZE);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Audit Trail</h2>
          <p className="text-xs text-gray-400 mt-0.5">Survey_Audit_Log — SharePoint</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle} label="Surveys Completed" value={totalCompleted}  color="text-green-700"  bgColor="bg-green-50" />
        <StatCard icon={CheckCircle} label="Submitted to SP"   value={totalConfirmed}  color="text-emerald-700"/>
        <StatCard icon={RotateCcw}   label="Errors → Recovered" value={recovered}      color="text-orange-600" sub={`${totalSyncFailed} total sync errors`} />
        <StatCard icon={XCircle}     label="Permanent Failures" value={permanent}      color="text-red-600"    bgColor={permanent > 0 ? 'bg-red-50' : 'bg-white'} />
      </div>

      {/* Per-surveyor breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">By Surveyor</h3>
          <span className="ml-auto text-xs text-gray-400">{stats.length} surveyor(s)</span>
        </div>
        {loading && stats.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : stats.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No audit logs found in SharePoint.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Surveyor</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Completed</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Submitted</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Sync Errors</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Retries</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Recovered</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Perm. Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.map(s => (
                  <tr key={s.surveyorId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate" title={s.surveyorId}>
                      {s.surveyorId}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-green-50 text-green-700 font-bold text-sm">
                        {s.completed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                        {s.confirmed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg font-bold text-sm ${s.syncFailed > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-400'}`}>
                        {s.syncFailed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg font-bold text-sm ${s.retried > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                        {s.retried}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg font-bold text-sm ${s.recoveredSurveys.size > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400'}`}>
                        {s.recoveredSurveys.size}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg font-bold text-sm ${s.permanentFails.size > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-50 text-gray-400'}`}>
                        {s.permanentFails.size}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full log table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-gray-700">Event Log</h3>

          {/* Surveyor filter */}
          <select
            value={filterSurveyor}
            onChange={e => { setFilterSurveyor(e.target.value); setLogPage(1); }}
            className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All surveyors</option>
            {surveyers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Action filter */}
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setLogPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All actions</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => { setSearch(e.target.value); setLogPage(1); }}
              className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50 w-40"
            />
          </div>

          <span className="text-xs text-gray-400">{filtered.length} entries</span>
        </div>

        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No entries match the current filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Surveyor</th>
                    <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Action</th>
                    <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Survey ID</th>
                    <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Province</th>
                    <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Network</th>
                    <th className="px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wider">Retries</th>
                    <th className="px-4 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageSlice.map(log => (
                    <React.Fragment key={log.Id}>
                      <tr
                        className={`cursor-pointer transition-colors ${expandedRow === log.Id ? 'bg-gray-50' : 'hover:bg-gray-50/60'}`}
                        onClick={() => setExpandedRow(expandedRow === log.Id ? null : log.Id)}
                      >
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                          {log.ActionTimestamp
                            ? new Date(log.ActionTimestamp).toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 max-w-[140px] truncate font-medium" title={log.SurveyorId}>
                          {log.SurveyorId || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <ActionBadge type={log.ActionType} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-400 whitespace-nowrap">
                          {(log.SurveyId || '—').substring(0, 12)}…
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 capitalize">{log.Province || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${log.NetworkStatus === 'offline' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {log.NetworkStatus || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-500">{log.RetryCount ?? 0}</td>
                        <td className="px-4 py-2.5 text-gray-300">
                          {expandedRow === log.Id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </td>
                      </tr>

                      {expandedRow === log.Id && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-4 pb-3 pt-0">
                            <div className="rounded-lg bg-white border border-gray-200 p-3 space-y-2 text-xs">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div>
                                  <span className="text-gray-400 block">Full Survey ID</span>
                                  <span className="font-mono text-gray-600 break-all">{log.SurveyId || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">Form Type</span>
                                  <span className="text-gray-600">{log.FormType || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">App Version</span>
                                  <span className="text-gray-600">{log.AppVersion || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">Offline at log time</span>
                                  <span className={log.CreatedFromOffline ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                                    {log.CreatedFromOffline ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">Sync Status</span>
                                  <span className="text-gray-600">{log.SyncStatus || '—'}</span>
                                </div>
                              </div>
                              {log.ErrorDetails && (
                                <div>
                                  <span className="text-red-400 block mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Error
                                  </span>
                                  <pre className="text-red-600 bg-red-50 rounded p-2 whitespace-pre-wrap break-all font-mono text-[10px]">
                                    {log.ErrorDetails}
                                  </pre>
                                </div>
                              )}
                              {log.RawMetadataJson && log.RawMetadataJson !== '{}' && (
                                <div>
                                  <span className="text-gray-400 block mb-1">Metadata</span>
                                  <pre className="text-gray-600 bg-gray-50 rounded p-2 whitespace-pre-wrap break-all font-mono text-[10px]">
                                    {(() => { try { return JSON.stringify(JSON.parse(log.RawMetadataJson), null, 2); } catch { return log.RawMetadataJson; } })()}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-400">
                  Page {safePage} of {totalLogPages} · {filtered.length} entries
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30">‹</button>
                  {Array.from({ length: totalLogPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalLogPages || Math.abs(n - safePage) <= 1)
                    .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…'); acc.push(n); return acc; }, [])
                    .map((n, i) => n === '…'
                      ? <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-300">…</span>
                      : <button key={n} onClick={() => setLogPage(n)}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${n === safePage ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                        >{n}</button>
                    )
                  }
                  <button onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))} disabled={safePage === totalLogPages}
                    className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30">›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
