import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import {
  Database,
  Download,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Search,
  Archive,
  BarChart2,
  Table2,
  FileAudio,
  Mic,
  X,
  User,
  Smartphone,
  Signal,
  CreditCard,
  Heart,
  MessageSquare,
  Phone,
  AlertTriangle,
  Shield,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { assemblyClient } from '@/config/assemblyai';
import { useSharePoint } from '@/hooks/useSharePoint';
import { db } from '@/db/offlineDB';
import { syncEngine } from '@/services/syncEngine';
import { storageService } from '@/services/storageService';
import {
  PRELAUNCH_PROVINCE_TARGETS,
  PRELAUNCH_PROVINCES,
  PRELAUNCH_TOTAL_TARGET,
} from '@/config/preLaunchSurvey';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Analytics from './Analytics';
import AuditiesTab from './AuditiesTab';

// ── Record detail sections (uses i18n keys for title + field labels) ──────────
const DETAIL_SECTIONS = [
  {
    titleKey: 'survey.sections.demographics', icon: User, fields: [
      { key: 'Provincia',     labelKey: 'survey.fields.Provincia'     },
      { key: 'Municipio',     labelKey: 'survey.fields.Municipio'     },
      { key: 'FaixaEtaria',   labelKey: 'survey.fields.FaixaEtaria'   },
      { key: 'Genero',        labelKey: 'survey.fields.Genero'        },
      { key: 'Ocupacao',      labelKey: 'survey.fields.Ocupacao'      },
      { key: 'OcupacaoOutro', labelKey: 'survey.fields.OcupacaoOutro' },
    ],
  },
  {
    titleKey: 'survey.sections.device', icon: Smartphone, fields: [
      { key: 'TipoTelefone',    labelKey: 'survey.fields.TipoTelefone'    },
      { key: 'Suporta4G',       labelKey: 'survey.fields.Suporta4G'       },
      { key: 'ConfiguracaoSIM', labelKey: 'survey.fields.ConfiguracaoSIM' },
    ],
  },
  {
    titleKey: 'survey.sections.operator', icon: Signal, fields: [
      { key: 'OperadorAtual',           labelKey: 'survey.fields.OperadorAtual'           },
      { key: 'SatisfacaoOperador',      labelKey: 'survey.fields.SatisfacaoOperador',      type: 'rating' },
      { key: 'CoberturaDaRede',         labelKey: 'survey.fields.CoberturaDaRede',         type: 'rating' },
      { key: 'OperadorMaisVisivel',     labelKey: 'survey.fields.OperadorMaisVisivel'     },
      { key: 'ZonasPiorCobertura',      labelKey: 'survey.fields.ZonasPiorCobertura'      },
      { key: 'ZonasPiorCoberturaOutro', labelKey: 'survey.fields.ZonasPiorCoberturaOutro' },
    ],
  },
  {
    titleKey: 'survey.sections.usage', icon: CreditCard, fields: [
      { key: 'UsoTelefone',       labelKey: 'survey.fields.UsoTelefone'       },
      { key: 'FrequenciaRecarga', labelKey: 'survey.fields.FrequenciaRecarga' },
      { key: 'ValorRecarga',      labelKey: 'survey.fields.ValorRecarga'      },
      { key: 'LocalRecarga',      labelKey: 'survey.fields.LocalRecarga'      },
      { key: 'LocalRecargaOutro', labelKey: 'survey.fields.LocalRecargaOutro' },
      { key: 'RazaoRecarga',      labelKey: 'survey.fields.RazaoRecarga'      },
      { key: 'RazaoRecargaOutro', labelKey: 'survey.fields.RazaoRecargaOutro' },
      { key: 'UsaMobileMoney',    labelKey: 'survey.fields.UsaMobileMoney'    },
    ],
  },
  {
    titleKey: 'survey.sections.preferences', icon: Heart, fields: [
      { key: 'PacotePreferido',        labelKey: 'survey.fields.PacotePreferido'        },
      { key: 'MudariaOperador',        labelKey: 'survey.fields.MudariaOperador'        },
      { key: 'OfertaDificilAbandonar', labelKey: 'survey.fields.OfertaDificilAbandonar' },
      { key: 'OfertaEspecifica',       labelKey: 'survey.fields.OfertaEspecifica'       },
      { key: 'FontePromocoes',         labelKey: 'survey.fields.FontePromocoes'         },
      { key: 'FontePromocoesOutro',    labelKey: 'survey.fields.FontePromocoesOutro'    },
      { key: 'FontesConfianca',        labelKey: 'survey.fields.FontesConfianca'        },
      { key: 'FontesConfiancaOutro',   labelKey: 'survey.fields.FontesConfiancaOutro'   },
    ],
  },
  {
    titleKey: 'survey.sections.insights', icon: MessageSquare, fields: [
      { key: 'LocalNovasLojas',  labelKey: 'survey.fields.LocalNovasLojas',  type: 'note' },
      { key: 'InsightPrincipal', labelKey: 'survey.fields.InsightPrincipal', type: 'note' },
    ],
  },
  {
    titleKey: 'survey.sections.contact', icon: Phone, fields: [
      { key: 'InteresseDiscussao', labelKey: 'survey.fields.InteresseDiscussao' },
      { key: 'NumeroTelefone',     labelKey: 'survey.fields.NumeroTelefone'     },
    ],
  },
];

// Strip SharePoint ExternalClass HTML wrappers and decode HTML entities
function stripSharePointHtml(raw) {
  if (!raw) return '';
  const str = String(raw);
  if (!str.includes('<')) return str; // fast path: no HTML
  try {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return (doc.body.textContent || '').trim();
  } catch {
    return str.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c))).trim();
  }
}

function FieldTooltip({ fieldKey, children }) {
  const { t } = useTranslation();
  const question = t(`survey.questions.${fieldKey}`, { defaultValue: '' });
  const [show, setShow] = useState(false);
  if (!question) return children;
  return (
    <span
      className="relative inline-flex items-center gap-1 cursor-default group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span className="text-gray-300 group-hover:text-primary transition-colors text-[10px] leading-none">▲</span>
      {show && (
        <span className="absolute bottom-full left-0 mb-1.5 z-50 w-64 bg-gray-900 text-white text-xs leading-snug rounded-lg px-3 py-2 shadow-xl pointer-events-none">
          {question}
          <span className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

function RatingDots({ value }) {
  const { t } = useTranslation();
  const n     = Number(value) || 0;
  const label = n > 0 ? t(`survey.ratings.${n}`, { defaultValue: String(n) }) : '';
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`w-3 h-3 rounded-full ${i <= n ? 'bg-primary' : 'bg-gray-200'}`} />
      ))}
      {label && <span className="ml-1 text-xs text-gray-500">{label}</span>}
    </span>
  );
}

function FieldValue({ value, type }) {
  const { t } = useTranslation();

  // Translate a single cleaned Portuguese value → active language
  const tv = (raw) => {
    const s = stripSharePointHtml(raw ?? '').trim();
    return t(`survey.values.${s}`, { defaultValue: s });
  };

  if (type === 'rating') return <RatingDots value={value} />;

  const clean = stripSharePointHtml(value ?? '').trim();

  if (type === 'note') {
    return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{clean}</p>;
  }

  // Multi-value: split on newline OR comma, translate each chip
  const parts = clean.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return (
      <div className="flex flex-wrap gap-1">
        {parts.map((p, i) => (
          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700">
            {tv(p)}
          </span>
        ))}
      </div>
    );
  }

  const translated = tv(clean);

  // Boolean badges (match on the original Portuguese to avoid false positives)
  if (clean === 'Sim')              return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{translated}</span>;
  if (clean === 'Não' || clean === 'Nao') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{translated}</span>;

  return <span className="text-sm text-gray-800">{translated}</span>;
}

// Audio question ID → i18n key
const AUDIO_Q_LABEL_KEYS = {
  mainInsight:     'survey.audio.insight',
  newShopLocation: 'survey.audio.newShop',
};

function ProgressBar({ value, color = 'orange' }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
      <div
        className={`h-full transition-all duration-300 ${color === 'purple' ? 'bg-purple-500' : 'bg-orange-500'}`}
        style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
      />
    </div>
  );
}

function RecordDetailModal({ record, onClose, province, getItemAttachments, downloadAttachment }) {
  const { t, i18n } = useTranslation();
  const localeTag = LOCALE_MAP[i18n.language] || 'en-US';
  const [audioFiles, setAudioFiles]   = useState([]); // [{ label, url, fileName }]
  const [audioLoading, setAudioLoading] = useState(false);

  // Fetch audio attachments whenever the record changes
  React.useEffect(() => {
    // Revoke any previous blob URLs
    setAudioFiles(prev => { prev.forEach(f => URL.revokeObjectURL(f.url)); return []; });

    if (!record || record.TemGravacoes !== 'Sim' || !getItemAttachments) return;

    let cancelled = false;
    setAudioLoading(true);

    (async () => {
      try {
        const atts = await getItemAttachments(province, record.Id);
        const files = [];
        for (const att of atts) {
          if (cancelled) break;
          const name = att.FileName;
          const qId  = name.startsWith('mainInsight')     ? 'mainInsight'
                     : name.startsWith('newShopLocation')  ? 'newShopLocation'
                     : name.includes('_mainInsight')        ? 'mainInsight'
                     : name.includes('_newShopLocation')    ? 'newShopLocation'
                     : null;
          try {
            if (!att.ServerRelativeUrl) continue;
            const buf  = await downloadAttachment(att.ServerRelativeUrl);
            if (!buf) continue;
            const blob = new Blob([buf], { type: 'audio/wav' });
            const url  = URL.createObjectURL(blob);
            const labelKey = AUDIO_Q_LABEL_KEYS[qId];
            files.push({ labelKey: labelKey || null, fallbackLabel: name, url, fileName: name });
          } catch { /* skip unreadable file */ }
        }
        if (!cancelled) setAudioFiles(files);
      } catch { /* attachments unavailable */ }
      if (!cancelled) setAudioLoading(false);
    })();

    return () => { cancelled = true; };
  }, [record?.Id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke URLs on unmount
  React.useEffect(() => {
    return () => setAudioFiles(prev => { prev.forEach(f => URL.revokeObjectURL(f.url)); return []; });
  }, []);

  if (!record) return null;

  const isHidden = (v) => {
    if (v === undefined || v === null || v === '') return true;
    const s = stripSharePointHtml(v).trim();
    if (s === '') return true;
    if (s.includes('[Gravação de Áudio')) return true;
    if (s.startsWith('Audio recording captured at')) return true;
    return false;
  };

  const hasValue = (v) => !isHidden(v);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                #{record.Id}
              </span>
              {record.Provincia && (
                <span className="text-xs text-gray-400">{record.Provincia}</span>
              )}
              {record.TemGravacoes === 'Sim' && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                  <Mic className="w-3 h-3" /> Áudio
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              {record.Municipio || t('survey.modal.unknown')}
            </h2>
            {record.DataPreenchimento && (
              <p className="text-xs text-gray-400">
                {new Date(record.DataPreenchimento).toLocaleString(localeTag, {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            {(record.NomeEntrevistador?.trim() || record.Author?.Title) && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                <span>{record.NomeEntrevistador?.trim() || record.Author?.Title}</span>
                {record.Author?.EMail && (
                  <span className="text-gray-300">· {record.Author.EMail}</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Survey answer sections */}
          {DETAIL_SECTIONS.map(({ titleKey, icon: Icon, fields }) => {
            const visibleFields = fields.filter(f => hasValue(record[f.key]));
            if (visibleFields.length === 0) return null;

            const gridFields = visibleFields.filter(f => f.type !== 'note');
            const noteFields = visibleFields.filter(f => f.type === 'note');

            return (
              <div key={titleKey}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t(titleKey)}
                  </p>
                </div>

                {gridFields.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {gridFields.map(({ key, labelKey, type }) => (
                      <div key={key} className="bg-gray-50 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-gray-400 mb-1">
                          <FieldTooltip fieldKey={key}>{t(labelKey)}</FieldTooltip>
                        </p>
                        <FieldValue value={record[key]} type={type} />
                      </div>
                    ))}
                  </div>
                )}

                {noteFields.map(({ key, labelKey }) => (
                  <div key={key} className="bg-gray-50 rounded-xl px-4 py-3 mb-3 last:mb-0">
                    <p className="text-xs text-gray-400 mb-1.5">
                      <FieldTooltip fieldKey={key}>{t(labelKey)}</FieldTooltip>
                    </p>
                    <FieldValue value={record[key]} type="note" />
                  </div>
                ))}
              </div>
            );
          })}

          {/* Audio files section — always shown when TemGravacoes = Sim */}
          {record.TemGravacoes === 'Sim' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('survey.sections.audio')}
                </p>
              </div>

              {audioLoading ? (
                <div className="bg-gray-50 rounded-xl px-4 py-4 flex items-center gap-2 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('survey.audio.loading')}</span>
                </div>
              ) : audioFiles.length > 0 ? (
                <div className="space-y-3">
                  {audioFiles.map((f) => (
                    <div key={f.fileName} className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-gray-400 mb-2">
                        {f.labelKey ? t(f.labelKey) : f.fallbackLabel}
                      </p>
                      <audio controls src={f.url} className="w-full" style={{ height: '36px' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400">
                  {t('survey.audio.notFound')}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400 truncate">
            {t('survey.modal.surveyId')}: <span className="font-mono">{record.SurveyId || '—'}</span>
          </p>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t('survey.modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

const PROVINCES = PRELAUNCH_PROVINCES;
const PROVINCE_TARGETS = PRELAUNCH_PROVINCE_TARGETS;
const TOTAL_TARGET = PRELAUNCH_TOTAL_TARGET;

// Columns to show in the table (internal name → display label)
const TABLE_COLS = [
  { key: 'Id',                  label: 'ID'          },
  { key: 'Municipio',           label: 'Município'   },
  { key: 'FaixaEtaria',         label: 'Faixa etária'},
  { key: 'Genero',              label: 'Género'      },
  { key: 'Ocupacao',            label: 'Ocupação'    },
  { key: 'OperadorAtual',       label: 'Operador'    },
  { key: 'TipoTelefone',        label: 'Telefone'    },
  { key: 'TemGravacoes',        labelKey: 'admin.cols.audio'    },
  { key: '_author',             labelKey: 'admin.cols.createdBy' },
  { key: 'DataPreenchimento',   labelKey: 'admin.cols.date'      },
];

const LOCALE_MAP = { en: 'en-US', pt: 'pt-AO', fr: 'fr-FR' };

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const localeTag = LOCALE_MAP[i18n.language] || 'en-US';
  const {
    sp,
    checkIsOwner,
    currentUserEmail,
    getProvinceRecords,
    getProvinceCount,
    deleteProvinceRecord,
    updateProvinceRecord,
    getItemAttachments,
    downloadAttachment,
    exportProvincePackage,
    buildExcelWorksheet,
    readProvinceRecord,
  } = useSharePoint();

  const canSeeAudities = currentUserEmail === 'bteixeira@africell.ao';

  // ── access guard ──────────────────────────────────────────────────────────
  const [isOwner, setIsOwner] = useState(null); // null = still checking

  useEffect(() => {
    if (!sp) return;
    checkIsOwner().then(setIsOwner);
  }, [sp, checkIsOwner]);

  // ── main state ────────────────────────────────────────────────────────────
  const [activeProvince, setActiveProvince] = useState(null); // null = All
  const [counts, setCounts] = useState(() => Object.fromEntries(PROVINCES.map((province) => [province, null])));
  const [records, setRecords] = useState([]);
  const [listNotFound, setListNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { itemId }
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [mainTab, setMainTab] = useState('data'); // 'data' | 'analytics'
  const [exportingTranscript, setExportingTranscript] = useState(false);
  const [transcriptProgress, setTranscriptProgress] = useState({ current: 0, total: 0 });
  const [transcribingRows, setTranscribingRows] = useState({});
  const [showTranscribeModal, setShowTranscribeModal] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState({
    active: false, done: false,
    surveyIndex: 0, surveyTotal: 0, surveyName: '',
    audioIndex: 0, audioTotal: 0,
    surveysProcessed: 0, results: [], failed: [],
  });
  const [page, setPage] = useState(1);
  const [transcriptFilter, setTranscriptFilter] = useState('all'); // 'all' | 'transcribed' | 'missing'
  const PAGE_SIZE = 25;

  // ── pending/failed local surveys (IndexedDB) ──────────────────────────────
  const [pendingLocalSurveys, setPendingLocalSurveys] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [confirmDeleteLocal, setConfirmDeleteLocal] = useState(null); // { id, surveyId }
  const [syncDiagnostics, setSyncDiagnostics] = useState(null); // { lastSynced, quota, unsyncedAudio, recentLog }

  // ── load counts — SP count + local IndexedDB pending on this device ─────────
  const refreshCounts = useCallback(async () => {
    const [spResults, localSurveys] = await Promise.all([
      Promise.allSettled(PROVINCES.map(p => getProvinceCount(p))),
      db.surveys.where('status').anyOf(['pending', 'syncing', 'sync_failed', 'failed_permanent']).toArray().catch(() => []),
    ]);

    // Count unsynced local surveys by province (responses.province field)
    const localByProvince = {};
    for (const s of localSurveys) {
      const prov = s.data?.responses?.province;
      if (prov) localByProvince[prov] = (localByProvince[prov] || 0) + 1;
    }

    const next = {};
    PROVINCES.forEach((p, i) => {
      const r = spResults[i];
      const local = localByProvince[p] || 0;
      if (r.status === 'fulfilled') {
        next[p] = r.value + local;
      } else if (r.reason?.message?.includes('404') || r.reason?.message?.includes('does not exist')) {
        next[p] = local;
      } else {
        next[p] = local > 0 ? local : '—';
      }
    });
    setCounts(next);
  }, [getProvinceCount]);

  // ── pending local surveys + sync diagnostics ──────────────────────────────
  const loadPendingLocalSurveys = useCallback(async () => {
    setPendingLoading(true);
    try {
      const surveys = await db.surveys
        .where('status').anyOf(['pending', 'syncing', 'sync_failed', 'audio_pending', 'failed_permanent'])
        .sortBy('createdAt');
      setPendingLocalSurveys(surveys);

      // Diagnostics: last successful sync, storage usage, unsynced audio, recent log
      const [lastSynced, quota, unsyncedAudio, recentLog] = await Promise.all([
        db.surveys.where('status').equals('synced').reverse().sortBy('syncedAt').then(rows => rows[0]?.syncedAt || null).catch(() => null),
        storageService.getQuotaInfo().catch(() => null),
        db.audioBlobs.where('status').anyOf(['pending', 'upload_failed']).count().catch(() => 0),
        db.syncLog.reverse().limit(15).toArray().catch(() => []),
      ]);
      setSyncDiagnostics({ lastSynced, quota, unsyncedAudio, recentLog });
    } catch {
      setPendingLocalSurveys([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'pendentes') loadPendingLocalSurveys();
  }, [mainTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetryLocalSurvey = async (id) => {
    await db.surveys.update(id, { status: 'pending', retryCount: 0, nextRetryAt: null, lastError: null });
    await loadPendingLocalSurveys();
    toast.success('Inquérito marcado para nova tentativa');
  };

  const handleRetryAllLocal = async () => {
    await db.surveys
      .where('status').anyOf(['sync_failed', 'failed_permanent'])
      .modify({ status: 'pending', retryCount: 0, nextRetryAt: null, lastError: null });
    await syncEngine.registerBackgroundSync();
    await loadPendingLocalSurveys();
    toast.success('Todos os inquéritos marcados para nova tentativa');
  };

  const handleDeleteLocalSurvey = async () => {
    if (!confirmDeleteLocal) return;
    await db.surveys.delete(confirmDeleteLocal.id);
    await db.audioBlobs.where('surveyId').equals(confirmDeleteLocal.surveyId).delete();
    setConfirmDeleteLocal(null);
    await loadPendingLocalSurveys();
    toast.success('Inquérito local eliminado');
  };

  // ── load records — 404 shows an inline notice, not a toast ────────────────
  const loadRecords = useCallback(async (province) => {
    setLoading(true);
    setRecords([]);
    setListNotFound(false);
    try {
      if (province === null) {
        // All provinces — fetch in parallel and combine
        const results = await Promise.allSettled(
          PROVINCES.map(p =>
            getProvinceRecords(p, { top: 5000 })
              .then(rows => rows.map(r => ({ ...r, _province: p })))
          )
        );
        const combined = results
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value)
          .sort((a, b) => new Date(b.DataPreenchimento) - new Date(a.DataPreenchimento));
        setRecords(combined);
      } else {
        const data = await getProvinceRecords(province);
        setRecords(data);
      }
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('does not exist')) {
        setListNotFound(true);
      } else {
        toast.error(t('admin.load.error') + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getProvinceRecords, t]);

  // Load counts once sp is ready; do NOT auto-load records (lists may not exist yet)
  useEffect(() => {
    if (isOwner !== true || !sp) return;
    refreshCounts();
    loadRecords(activeProvince);
    loadPendingLocalSurveys();
  }, [isOwner, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load records when switching province tab
  useEffect(() => {
    if (isOwner !== true || !sp) return;
    setSearchTerm('');
    setPage(1);
    setTranscriptFilter('all');
    loadRecords(activeProvince);
  }, [activeProvince]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── filtered rows ─────────────────────────────────────────────────────────
  const noTranscript = (val) => {
    const v = (val || '').replace(/<[^>]*>/g, '').trim();
    return !v || v.startsWith('Audio recording captured');
  };

  // Detect real audio container from magic bytes — used only for logging.
  const detectAudioMimeType = (buf) => {
    const b = new Uint8Array(buf.slice(0, 12));
    if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return 'audio/webm';
    if (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return 'audio/ogg';
    if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'audio/mp4';
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'audio/wav';
    return 'audio/webm';
  };

  // Decode any browser-supported audio format and re-encode as 16-bit mono WAV PCM.
  // AssemblyAI accepts WAV reliably; WebM/Opus files stored with .wav extension would fail otherwise.
  const convertToWav = async (buf) => {
    const audioCtx = new AudioContext();
    try {
      const audioBuffer = await audioCtx.decodeAudioData(buf.slice(0));
      const numSamples = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;

      // Mix all channels down to mono
      const mono = new Float32Array(numSamples);
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < numSamples; i++) mono[i] += channelData[i] / audioBuffer.numberOfChannels;
      }

      // Build WAV container: 44-byte header + 16-bit PCM samples
      const wavBuf = new ArrayBuffer(44 + numSamples * 2);
      const v = new DataView(wavBuf);
      const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };

      str(0, 'RIFF'); v.setUint32(4, 36 + numSamples * 2, true);
      str(8, 'WAVE'); str(12, 'fmt ');
      v.setUint32(16, 16, true);        // PCM chunk size
      v.setUint16(20, 1, true);         // PCM format
      v.setUint16(22, 1, true);         // mono
      v.setUint32(24, sampleRate, true);
      v.setUint32(28, sampleRate * 2, true); // byte rate
      v.setUint16(32, 2, true);         // block align
      v.setUint16(34, 16, true);        // bits per sample
      str(36, 'data'); v.setUint32(40, numSamples * 2, true);

      for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, mono[i]));
        v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }

      return wavBuf;
    } finally {
      audioCtx.close();
    }
  };

  const surveyLabel = (row) => row.SurveyId ? `Survey ${row.SurveyId}` : `Survey #${row.Id}`;
  const rowMeta = (row) => ({
    surveyId:     row.SurveyId || row.Id,
    surveyName:   surveyLabel(row),
    province:     row.Provincia || row._province,
    municipality: row.Municipio,
    date:         row.DataPreenchimento,
    interviewer:  row.NomeEntrevistador?.trim() || row.AuthorName || '',
  });

  const totalCount = Object.values(counts).reduce((sum, c) => sum + (Number(c) || 0), 0);
  const isAllView  = activeProvince === null;

  const term = searchTerm.toLowerCase();
  const filtered = records.filter(r => {
    if (term) {
      const matchesSearch =
        String(r.Id).includes(term) ||
        (r.SurveyId   || '').toLowerCase().includes(term) ||
        (r.Provincia  || r._province || '').toLowerCase().includes(term) ||
        (r.Municipio  || '').toLowerCase().includes(term) ||
        (r.OperadorAtual || '').toLowerCase().includes(term) ||
        (r.Genero     || '').toLowerCase().includes(term) ||
        (r.Ocupacao   || '').toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }
    if (transcriptFilter === 'withAudio') {
      if (r.TemGravacoes !== 'Sim') return false;
    } else if (transcriptFilter === 'noAudio') {
      if (r.TemGravacoes === 'Sim') return false;
    } else if (transcriptFilter === 'transcribed') {
      if (r.TemGravacoes !== 'Sim') return false;
      if (noTranscript(r.InsightPrincipal) || noTranscript(r.LocalNovasLojas)) return false;
    } else if (transcriptFilter === 'missing') {
      if (r.TemGravacoes !== 'Sim') return false;
      if (!noTranscript(r.InsightPrincipal) && !noTranscript(r.LocalNovasLojas)) return false;
    }
    return true;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const paginated   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── export Excel ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (records.length === 0) {
      toast(t('admin.export.noRecords'));
      return;
    }
    const sheetName = activeProvince ?? 'Todas';
    const ws = buildExcelWorksheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName}_survey_${Date.now()}.xlsx`);
    toast.success(t('admin.export.excelDone'));
  };

  // ── export ZIP (audio attachments) ────────────────────────────────────────
  const exportZip = async () => {
    const withAudio = records.filter(r => r.TemGravacoes === 'Sim');
    if (withAudio.length === 0) {
      toast(t('admin.export.noAudio'));
      return;
    }
    setExporting(true);
    const toastId = toast.loading(t('admin.export.audioExporting', { count: withAudio.length }));
    try {
      const zip = new JSZip();
      for (const item of withAudio) {
        const itemProvince = item._province || activeProvince;
        const atts = await getItemAttachments(itemProvince, item.Id);
        for (const att of atts) {
          if (!att.ServerRelativeUrl) continue;
          const buf = await downloadAttachment(att.ServerRelativeUrl);
          if (!buf) continue;
          zip.file(`item_${item.Id}/${att.FileName}`, buf);
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProvince ?? 'Todas'}_audio_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('admin.export.zipDone'), { id: toastId });
    } catch (err) {
      toast.error(t('admin.export.errorZip') + err.message, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { itemId, province: deleteProvince } = confirmDelete;
    try {
      await deleteProvinceRecord(deleteProvince, itemId);
      setRecords(prev => prev.filter(r => r.Id !== itemId));
      if (deleteProvince) setCounts(prev => ({ ...prev, [deleteProvince]: (prev[deleteProvince] || 1) - 1 }));
      toast.success(t('admin.delete.success'));
    } catch (err) {
      toast.error(t('admin.delete.error') + err.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  // ── per-row transcription (admin, pre-recorded audio) ─────────────────────
  const handleTranscribeRow = async (row, batchOptions = null) => {
    const isBatch = !!batchOptions;
    if (!isBatch) setTranscribingRows(prev => ({ ...prev, [row.Id]: true }));
    const toastId = isBatch ? null : toast.loading(t('admin.export.transcribeProgress', { id: row.Id }));
    try {
      const rowProvince = row._province || activeProvince;
      const atts = await getItemAttachments(rowProvince, row.Id);

      console.group(`[Transcription] Row #${row.Id} — ${surveyLabel(row)} (${rowProvince})`);
      console.log(`Total attachments on SharePoint: ${atts.length}`);

      const audioAtts = atts.filter(att => {
        const n = att.FileName;
        return (
          n.startsWith('mainInsight') || n.startsWith('newShopLocation') ||
          n.includes('_mainInsight')  || n.includes('_newShopLocation')
        ) && att.ServerRelativeUrl;
      });

      // Log every attachment so filename issues are immediately visible
      atts.forEach(att => {
        const recognized = audioAtts.some(a => a.FileName === att.FileName);
        if (recognized) {
          console.log(`  ✓ ${att.FileName} → recognized as audio question`);
        } else {
          console.warn(`  ✗ ${att.FileName} → SKIPPED (filename does not match mainInsight/newShopLocation pattern)`);
        }
      });

      const failed = [];
      const results = [];

      // Record skipped attachments in results so they appear in the Excel export
      atts.filter(att => !audioAtts.some(a => a.FileName === att.FileName)).forEach(att => {
        results.push({ ...rowMeta(row), question: 'unknown', audioName: att.FileName, text: '', status: 'skipped', error: 'Filename not recognized as audio question' });
      });

      if (audioAtts.length === 0) {
        console.warn('No recognized audio attachments — nothing to transcribe.');
        console.groupEnd();
        if (!isBatch) toast(t('admin.export.noAudioToTranscribe'), { id: toastId });
        return { fields: {}, failed, results };
      }

      if (isBatch) batchOptions.onAudioStart?.(0, audioAtts.length);

      const fields = {};
      let audioIdx = 0;

      for (const att of audioAtts) {
        audioIdx++;
        const name = att.FileName;
        const qId = (name.startsWith('mainInsight') || name.includes('_mainInsight'))
          ? 'mainInsight' : 'newShopLocation';

        if (isBatch) batchOptions.onAudioStart?.(audioIdx, audioAtts.length);
        console.group(`  [${audioIdx}/${audioAtts.length}] ${att.FileName} → ${qId}`);

        let transcribedText = '';
        let audioStatus = 'success';
        let audioError = '';

        try {
          const buf = await downloadAttachment(att.ServerRelativeUrl);
          if (!buf) throw new Error('Downloaded buffer is empty — attachment may be corrupt or missing');
          const detectedMime = detectAudioMimeType(buf);
          console.log(`  Downloaded: ${buf.byteLength.toLocaleString()} bytes — detected format: ${detectedMime}`);

          // Always convert to WAV PCM — AssemblyAI does not support WebM/Opus reliably
          const wavBuf = await convertToWav(buf);
          console.log(`  Converted to WAV: ${wavBuf.byteLength.toLocaleString()} bytes`);
          const blob = new Blob([wavBuf], { type: 'audio/wav' });
          const result = await assemblyClient.transcripts.transcribe({
            audio: blob,
            language_code: 'pt',
            speech_model: 'best',
          });

          if (result.text) {
            transcribedText = result.text;
            fields[qId === 'mainInsight' ? 'InsightPrincipal' : 'LocalNovasLojas'] = result.text;
            console.log(`  AssemblyAI result: "${result.text.slice(0, 80)}${result.text.length > 80 ? '…' : ''}"`);
          } else {
            // AssemblyAI succeeded but found no speech — distinct from an error
            audioStatus = 'empty';
            audioError = 'AssemblyAI returned no text — audio may be silent, too short, or too noisy';
            console.warn(`  AssemblyAI returned no text (status: ${result.status}). Audio may be silent or too short.`);
          }
        } catch (err) {
          audioStatus = 'failed';
          audioError = err.message;
          console.error(`  Error: ${err.message}`);
          failed.push({ surveyId: row.SurveyId || row.Id, surveyName: surveyLabel(row), audioName: att.FileName, error: err.message });
        }

        console.groupEnd();

        const entry = { ...rowMeta(row), question: qId, audioName: att.FileName, text: transcribedText, status: audioStatus, error: audioError };
        results.push(entry);
        if (isBatch) {
          batchOptions.onAudioDone?.(audioIdx, audioAtts.length);
          batchOptions.onResult?.(entry);
        }
      }

      if (Object.keys(fields).length > 0) {
        await updateProvinceRecord(rowProvince, row.Id, fields);
        console.log(`Saved to SharePoint: ${Object.keys(fields).join(', ')}`);

        // Validate that SharePoint persisted the transcription correctly
        try {
          const savedItem = await readProvinceRecord(rowProvince, row.Id, Object.keys(fields));
          // SharePoint rich-text fields wrap content in HTML on read-back — strip it before comparing
          const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          const mismatches = Object.entries(fields).filter(([field, expected]) =>
            stripHtml(savedItem[field]) !== expected.trim()
          );
          if (mismatches.length > 0) {
            const validationErr = `Save validation failed for: ${mismatches.map(([f]) => f).join(', ')}`;
            console.error(validationErr);
            mismatches.forEach(([field]) => {
              const qKey = field === 'InsightPrincipal' ? 'mainInsight' : 'newShopLocation';
              failed.push({ surveyId: row.SurveyId || row.Id, surveyName: surveyLabel(row), audioName: qKey, error: validationErr });
              const ri = results.findIndex(r => r.question === qKey);
              if (ri >= 0) results[ri] = { ...results[ri], status: 'failed', error: validationErr };
            });
            if (!isBatch) toast.error(validationErr, { id: toastId });
          } else {
            console.log('Save validation ✓ — all fields match');
            setRecords(prev => prev.map(r => r.Id === row.Id ? { ...r, ...fields } : r));
            if (!isBatch) toast.success(t('admin.export.transcribeDone', { id: row.Id }), { id: toastId });
          }
        } catch (verifyErr) {
          console.warn('Save verification fetch failed (non-blocking):', verifyErr.message);
          setRecords(prev => prev.map(r => r.Id === row.Id ? { ...r, ...fields } : r));
          if (!isBatch) toast.success(t('admin.export.transcribeDone', { id: row.Id }), { id: toastId });
        }
      } else {
        console.warn('No text was saved — all audio files returned empty or failed.');
        if (!isBatch) toast(t('admin.export.noAudioToTranscribe'), { id: toastId });
      }

      console.groupEnd();
      return { fields, failed, results };
    } catch (err) {
      console.error(`[Transcription] Row #${row.Id} — fatal error:`, err.message);
      console.groupEnd();
      if (!isBatch) toast.error(t('admin.export.transcribeError', { id: row.Id }) + err.message, { id: toastId });
      return { fields: {}, failed: [{ surveyId: row.SurveyId || row.Id, surveyName: surveyLabel(row), audioName: 'unknown', error: err.message }], results: [] };
    } finally {
      if (!isBatch) setTranscribingRows(prev => { const n = { ...prev }; delete n[row.Id]; return n; });
    }
  };

  // ── records missing transcription ────────────────────────────────────────
  const missingTranscription = records.filter(r =>
    r.TemGravacoes === 'Sim' && (noTranscript(r.InsightPrincipal) || noTranscript(r.LocalNovasLojas))
  );

  // ── transcribe all missing ────────────────────────────────────────────────
  const handleTranscribeAll = async () => {
    if (missingTranscription.length === 0) return;

    setTranscribeProgress({
      active: true, done: false,
      surveyIndex: 0, surveyTotal: missingTranscription.length,
      surveyName: '', audioIndex: 0, audioTotal: 0,
      surveysProcessed: 0, results: [], failed: [],
    });
    setShowTranscribeModal(true);

    const allResults = [];
    const allFailed = [];

    for (let i = 0; i < missingTranscription.length; i++) {
      const row = missingTranscription[i];

      setTranscribeProgress(prev => ({
        ...prev,
        surveyIndex: i + 1,
        surveyName: surveyLabel(row),
        audioIndex: null,
        audioTotal: 0,
      }));

      const response = await handleTranscribeRow(row, {
        onAudioStart: (audioIndex, audioTotal) => {
          setTranscribeProgress(prev => ({ ...prev, audioIndex, audioTotal }));
        },
        onAudioDone: (audioIndex, audioTotal) => {
          setTranscribeProgress(prev => ({ ...prev, audioIndex, audioTotal }));
        },
        onResult: (result) => {
          allResults.push(result);
          setTranscribeProgress(prev => ({ ...prev, results: [...prev.results, result] }));
        },
      });

      allFailed.push(...response.failed);
      setTranscribeProgress(prev => ({
        ...prev,
        surveysProcessed: i + 1,
        failed: [...prev.failed, ...response.failed],
      }));
    }

    setTranscribeProgress(prev => ({
      ...prev,
      active: false,
      done: true,
      surveyIndex: missingTranscription.length,
      results: allResults,
      failed: allFailed,
    }));
  };

  // ── transcript export ─────────────────────────────────────────────────────
  const handleTranscriptExport = async () => {
    setExportingTranscript(true);
    const toastId = toast.loading(t('admin.export.preparingPackage'));
    try {
      const result = await exportProvincePackage(activeProvince ?? PROVINCES[0], (p) => {
        setTranscriptProgress(p);
        toast.loading(t('admin.export.audioProgress', { current: p.current, total: p.total }), { id: toastId });
      });
      toast.success(t('admin.export.packageDone', { count: result.audioFiles }), { id: toastId });
    } catch (err) {
      toast.error(t('admin.export.errorPackage') + err.message, { id: toastId });
    } finally {
      setExportingTranscript(false);
      setTranscriptProgress({ current: 0, total: 0 });
    }
  };

  // ── transcription results Excel export ───────────────────────────────────
  const handleDownloadTranscriptionExcel = () => {
    const rows = transcribeProgress.results.map(r => ({
      'Survey ID':     r.surveyId,
      'Survey Name':   r.surveyName,
      'Province':      r.province || '',
      'Municipality':  r.municipality || '',
      'Date':          r.date ? new Date(r.date).toLocaleDateString() : '',
      'Interviewer':   r.interviewer || '',
      'Question':      r.question === 'mainInsight' ? 'Principal Insight' : r.question === 'newShopLocation' ? 'New Shop Location' : r.question,
      'Audio File':    r.audioName || '',
      'Transcription': r.text || '',
      'Status':        r.status,
      'Error':         r.error || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transcriptions');
    XLSX.writeFile(wb, `transcriptions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── render guards ─────────────────────────────────────────────────────────
  if (isOwner === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-2">
        <Database className="w-10 h-10 text-gray-300" />
        <p className="text-sm">{t('admin.access')}</p>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">{t('admin.title')}</h1>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                {t('admin.subtitle', {
                  date: new Date().toLocaleDateString(localeTag, { month: 'long', day: 'numeric', year: 'numeric' }),
                })}
              </p>
            </div>
          </div>

          {/* Main tab switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
            <button
              onClick={() => setMainTab('data')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                mainTab === 'data' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span className="hidden xs:inline">{t('admin.tabs.data')}</span>
            </button>
            <button
              onClick={() => setMainTab('analytics')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                mainTab === 'analytics' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden xs:inline">{t('admin.tabs.analytics')}</span>
            </button>
            {canSeeAudities && (
              <button
                onClick={() => setMainTab('audities')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  mainTab === 'audities' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden xs:inline">Audities</span>
              </button>
            )}
            <button
              onClick={() => setMainTab('pendentes')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                mainTab === 'pendentes' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden xs:inline">Pendentes</span>
              {pendingLocalSurveys.length > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold bg-orange-500 text-white px-1">
                  {pendingLocalSurveys.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Analytics view */}
        {mainTab === 'analytics' && <Analytics isOwner={isOwner} />}

        {/* Audities view */}
        {mainTab === 'audities' && canSeeAudities && <AuditiesTab />}

        {/* Pendentes view — offline surveys waiting to sync */}
        {mainTab === 'pendentes' && (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'A aguardar', statuses: ['pending', 'syncing'], color: 'text-blue-500'   },
                { label: 'Com erros',  statuses: ['sync_failed'],        color: 'text-orange-500' },
                { label: 'Só áudio',   statuses: ['audio_pending'],      color: 'text-purple-500' },
                { label: 'Bloqueados', statuses: ['failed_permanent'],   color: 'text-red-500'    },
              ].map(({ label, statuses, color }) => {
                const n = pendingLocalSurveys.filter(s => statuses.includes(s.status)).length;
                return (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{n}</p>
                  </div>
                );
              })}
            </div>

            {/* Sync diagnostics */}
            {syncDiagnostics && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Última sincronização</p>
                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {syncDiagnostics.lastSynced
                      ? new Date(syncDiagnostics.lastSynced).toLocaleString(localeTag, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Armazenamento</p>
                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {syncDiagnostics.quota
                      ? `${syncDiagnostics.quota.usageMB} / ${syncDiagnostics.quota.quotaMB} MB (${Math.round((syncDiagnostics.quota.usageRatio || 0) * 100)}%)`
                      : '—'}
                  </p>
                  {syncDiagnostics.quota?.isCritical && <p className="text-xs text-red-500 mt-0.5">Crítico — sincronize já</p>}
                  {syncDiagnostics.quota?.isWarning && !syncDiagnostics.quota?.isCritical && <p className="text-xs text-orange-500 mt-0.5">Aviso</p>}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Áudio por enviar</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{syncDiagnostics.unsyncedAudio ?? 0}</p>
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500">
                Inquéritos guardados neste dispositivo que ainda não foram enviados para o servidor.
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={loadPendingLocalSurveys}
                  className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${pendingLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>
                <button
                  onClick={handleRetryAllLocal}
                  disabled={pendingLocalSurveys.filter(s => s.status !== 'pending').length === 0}
                  className="flex items-center gap-1.5 text-sm text-white bg-primary px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Tentar novamente todos
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {pendingLoading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : pendingLocalSurveys.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
                  <Clock className="w-8 h-8 text-gray-300" />
                  <p className="text-sm">Nenhum inquérito pendente neste dispositivo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Província</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tentativas</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Próx. tentativa</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[200px]">Último erro</th>
                        <th className="px-4 py-3 w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingLocalSurveys.map(s => {
                        const statusBadge = s.status === 'pending'
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Pendente</span>
                          : s.status === 'syncing'
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">A enviar…</span>
                          : s.status === 'audio_pending'
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Só áudio</span>
                          : s.status === 'sync_failed'
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Com erro</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Bloqueado</span>;
                        const nextRetry = s.nextRetryAt
                          ? new Date(s.nextRetryAt) > new Date()
                            ? new Date(s.nextRetryAt).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })
                            : 'Imediato'
                          : '—';
                        return (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{statusBadge}</td>
                            <td className="px-4 py-3 text-gray-700 capitalize">{s.province || '—'}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {s.createdAt ? new Date(s.createdAt).toLocaleString(localeTag, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-center">{s.retryCount || 0}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{nextRetry}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate" title={s.lastError || ''}>
                              {s.lastError || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRetryLocalSurvey(s.id)}
                                  disabled={s.status === 'pending'}
                                  className="text-gray-400 hover:text-primary disabled:opacity-30 transition-colors"
                                  title="Tentar novamente"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteLocal({ id: s.id, surveyId: s.surveyId })}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {pendingLocalSurveys.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-400">
                    {pendingLocalSurveys.length} inquérito{pendingLocalSurveys.length !== 1 ? 's' : ''} neste dispositivo · Abra a app de inquéritos para sincronizar
                  </p>
                </div>
              )}
            </div>

            {/* Recent sync log */}
            {syncDiagnostics?.recentLog?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Registo de sincronização recente</p>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {syncDiagnostics.recentLog.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 px-4 py-2 text-xs">
                      <span className="text-gray-400 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </span>
                      <span className={`font-medium ${log.action === 'sync_failed' ? 'text-red-500' : 'text-gray-600'}`}>{log.action}</span>
                      {log.error && <span className="text-gray-400 truncate" title={log.error}>· {log.error}</span>}
                      {log.retryCount != null && <span className="ml-auto text-gray-300 whitespace-nowrap">#{log.retryCount}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data view */}
        {mainTab === 'data' && <>

        {/* Summary KPI cards — 1 col on xs, 2 on sm, 4 on lg+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: t('admin.allAnswers.all'), count: totalCount, target: TOTAL_TARGET, province: null },
            ...PROVINCES.map(p => ({ label: p, count: counts[p] ?? 0, target: PROVINCE_TARGETS[p] ?? 0, province: p })),
          ].map(({ label, count, target, province }) => {
            const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
            const isActive = activeProvince === province;
            return (
              <button
                key={label}
                onClick={() => setActiveProvince(province)}
                className={`rounded-xl p-4 sm:p-5 text-left border transition-all ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40 hover:shadow-md shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                    {label}
                  </p>
                  <p className={`text-xs font-medium ${isActive ? 'text-white/70' : 'text-primary'}`}>
                    {pct}%
                  </p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{count === null ? '…' : count}</p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                  {t('admin.responses')} &middot; {t('admin.target', { n: target })}
                </p>
                <div className={`mt-3 h-1.5 rounded-full ${isActive ? 'bg-white/30' : 'bg-gray-100'}`}>
                  <div className={`h-1.5 rounded-full transition-all ${isActive ? 'bg-white' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Data table card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-3 border-b border-gray-200">
            {/* Active filter pill */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                activeProvince ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
              }`}>
                {activeProvince ?? t('admin.allAnswers.all')}
              </span>
              {activeProvince && (
                <button onClick={() => setActiveProvince(null)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden sm:block w-px h-5 bg-gray-200 flex-shrink-0" />

            {/* Transcript filter pills */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {[
                { value: 'all',         label: t('admin.filter.all')         },
                { value: 'withAudio',   label: t('admin.filter.withAudio')   },
                { value: 'noAudio',     label: t('admin.filter.noAudio')     },
                { value: 'transcribed', label: t('admin.filter.transcribed') },
                { value: 'missing',     label: t('admin.filter.missing')     },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setTranscriptFilter(opt.value); setPage(1); }}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    transcriptFilter === opt.value
                      ? opt.value === 'missing'
                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                        : opt.value === 'transcribed'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : opt.value === 'withAudio'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : opt.value === 'noAudio'
                              ? 'bg-slate-100 text-slate-600 border border-slate-300'
                              : 'bg-gray-200 text-gray-700 border border-gray-300'
                      : 'text-gray-400 hover:text-gray-600 border border-transparent hover:border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-5 bg-gray-200 flex-shrink-0" />

            {/* Search — full width on mobile */}
            <div className="relative w-full sm:flex-1 sm:min-w-48 order-last sm:order-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin.search')}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => loadRecords(activeProvince)}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                title={t('ui.refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{t('ui.refresh')}</span>
              </button>
              <button
                onClick={exportExcel}
                disabled={records.length === 0}
                className="flex items-center gap-1.5 text-sm text-green-700 border border-green-200 bg-green-50 px-2.5 py-2 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden md:inline">{t('admin.export.excel')}</span>
              </button>
              <button
                onClick={() => setShowTranscribeModal(true)}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 bg-white px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                title={t('admin.transcribeProgress.openProgress')}
              >
                <BarChart2 className="w-4 h-4" />
                <span className="hidden md:inline">
                  {transcribeProgress.active
                    ? `${transcribeProgress.surveyIndex}/${transcribeProgress.surveyTotal}`
                    : transcribeProgress.done
                      ? t('admin.transcribeProgress.openResults')
                      : t('admin.transcribeProgress.openProgress')}
                </span>
                {transcribeProgress.active && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
              <button
                onClick={handleTranscribeAll}
                disabled={transcribeProgress.active || missingTranscription.length === 0}
                className="flex items-center gap-1.5 text-sm text-orange-700 border border-orange-200 bg-orange-50 px-2.5 py-2 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors"
              >
                {transcribeProgress.active ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                <span className="hidden md:inline">
                  {transcribeProgress.active
                    ? `${transcribeProgress.surveyIndex}/${transcribeProgress.surveyTotal}`
                    : `${t('admin.transcribeAll')} (${missingTranscription.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* Table — scrollable on mobile */}
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : listNotFound ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
                <Database className="w-8 h-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500 text-center px-4">
                  {t('admin.listNotFound', { list: `${activeProvince}_PreLaunch_Survey` })}
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
                <Search className="w-8 h-8" />
                <p className="text-sm">{t('admin.noResults', { term: searchTerm })}</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {isAllView && (
                      <th className="px-3 sm:px-4 py-3 font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wider">
                        {t('survey.fields.Provincia')}
                      </th>
                    )}
                    {TABLE_COLS.map(col => (
                      <th key={col.key} className="px-3 sm:px-4 py-3 font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wider">
                        {col.labelKey ? t(col.labelKey) : col.label}
                      </th>
                    ))}
                    <th className="px-3 sm:px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map(row => (
                    <tr
                      key={`${row._province ?? activeProvince}-${row.Id}`}
                      onClick={() => setSelectedRecord(row)}
                      className={`cursor-pointer transition-colors ${
                        row.Duplicado === true
                          ? 'bg-amber-50/60 hover:bg-amber-50 border-l-2 border-amber-400'
                          : 'hover:bg-orange-50/30'
                      }`}
                    >
                      {isAllView && (
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                            {row.Provincia || row._province || '—'}
                          </span>
                        </td>
                      )}
                      {TABLE_COLS.map(col => (
                        <td key={col.key} className="px-3 sm:px-4 py-3 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                          {col.key === 'DataPreenchimento' && row[col.key]
                            ? new Date(row[col.key]).toLocaleDateString(localeTag)
                            : col.key === 'TemGravacoes'
                              ? row[col.key] === 'Sim'
                                ? <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{t('ui.yes')}</span>
                                : <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{t('ui.no')}</span>
                            : col.key === '_author'
                              ? <span title={row.Author?.EMail || ''} className="text-gray-600">{row.NomeEntrevistador?.trim() || row.Author?.Title || '—'}</span>
                              : row[col.key] ?? '—'}
                        </td>
                      ))}
                      <td className="px-3 sm:px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {row.Duplicado === true && (
                            <span title="Número de telefone duplicado" className="text-amber-500">
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          )}
                          {row.TemGravacoes === 'Sim' && (
                            <button
                              onClick={() => handleTranscribeRow(row)}
                              disabled={!!transcribingRows[row.Id]}
                              className="text-gray-400 hover:text-purple-500 disabled:opacity-40 transition-colors"
                              title="Transcrever áudio"
                            >
                              {transcribingRows[row.Id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete({ itemId: row.Id, province: row._province || activeProvince })}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar registo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer: count + pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400 order-2 sm:order-1">
                {filtered.length !== records.length
                  ? t('admin.recordsFiltered', { filtered: filtered.length, total: records.length })
                  : t('admin.records', { count: records.length })}
                {totalPages > 1 && (
                  <span className="ml-1 text-gray-300">
                    · {t('admin.page', { page: safePage, total: totalPages })}
                  </span>
                )}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >«</button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >‹</button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                    .reduce((acc, n, idx, arr) => {
                      if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === '…'
                        ? <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-300">…</span>
                        : <button
                            key={n}
                            onClick={() => setPage(n)}
                            className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                              n === safePage ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >{n}</button>
                    )
                  }

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >›</button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >»</button>
                </div>
              )}
            </div>
          )}
        </div>

        </> /* end data tab */}
      </div>

      {/* Transcription progress modal */}
      {showTranscribeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !transcribeProgress.active && setShowTranscribeModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">{t('admin.transcribeProgress.title')}</h2>
              {!transcribeProgress.active && (
                <button
                  onClick={() => setShowTranscribeModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Overall Progress */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t('admin.transcribeProgress.overall')}
              </p>
              {transcribeProgress.done ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-green-700">{t('admin.transcribeProgress.done')}</p>
                  <p className="text-sm text-gray-500">
                    {t('admin.transcribeProgress.surveysDone', {
                      processed: transcribeProgress.surveysProcessed,
                      total: transcribeProgress.surveyTotal,
                    })}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-800">
                    {transcribeProgress.surveyIndex > 0
                      ? t('admin.transcribeProgress.transcribingSurvey', {
                          index: transcribeProgress.surveyIndex,
                          total: transcribeProgress.surveyTotal,
                        })
                      : '…'}
                  </p>
                  <ProgressBar
                    value={transcribeProgress.surveyTotal > 0
                      ? (transcribeProgress.surveysProcessed / transcribeProgress.surveyTotal) * 100
                      : 0}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {transcribeProgress.surveyTotal > 0
                      ? `${((transcribeProgress.surveysProcessed / transcribeProgress.surveyTotal) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </p>
                </div>
              )}
            </div>

            {/* Current Survey Progress */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t('admin.transcribeProgress.currentSurvey')}
              </p>
              {transcribeProgress.done ? (
                <p className="text-sm text-gray-500">{t('admin.transcribeProgress.audioDone')}</p>
              ) : (
                <div>
                  {transcribeProgress.surveyName && (
                    <p className="text-sm font-medium text-gray-700 mb-1 truncate">{transcribeProgress.surveyName}</p>
                  )}
                  {transcribeProgress.audioIndex === null ? (
                    <p className="text-sm text-gray-400 italic">{t('admin.transcribeProgress.preparingAudio')}</p>
                  ) : transcribeProgress.audioTotal > 0 ? (
                    <div>
                      <p className="text-sm text-gray-800">
                        {t('admin.transcribeProgress.transcribingAudio', {
                          index: transcribeProgress.audioIndex,
                          total: transcribeProgress.audioTotal,
                        })}
                      </p>
                      <ProgressBar
                        value={(transcribeProgress.audioIndex / transcribeProgress.audioTotal) * 100}
                        color="purple"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {((transcribeProgress.audioIndex / transcribeProgress.audioTotal) * 100).toFixed(0)}%
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t('admin.transcribeProgress.noAudio')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Failure banner with expandable details */}
            {transcribeProgress.failed.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100 space-y-2">
                <p className="text-sm text-red-700 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {t('admin.transcribeProgress.failedCount', { count: transcribeProgress.failed.length })}
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {transcribeProgress.failed.map((f, i) => (
                    <div key={i} className="text-xs text-red-600 bg-red-100/60 rounded px-2 py-1">
                      <span className="font-semibold">{f.surveyName}</span>
                      {f.audioName && f.audioName !== 'unknown' && (
                        <span className="text-red-400 ml-1">· {f.audioName}</span>
                      )}
                      <span className="block text-red-500 mt-0.5">{f.error}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-red-400 italic">Open browser DevTools → Console for full diagnostic logs</p>
              </div>
            )}

            {/* Empty-transcript notice */}
            {(() => {
              const emptyCount = transcribeProgress.results.filter(r => r.status === 'empty').length;
              return emptyCount > 0 ? (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm text-amber-700 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {emptyCount} audio{emptyCount > 1 ? 's' : ''} returned no speech — may be silent, too short, or too noisy
                  </p>
                </div>
              ) : null;
            })()}

            {/* Excel download after completion */}
            {transcribeProgress.done && transcribeProgress.results.length > 0 && (
              <button
                onClick={handleDownloadTranscriptionExcel}
                className="w-full flex items-center justify-center gap-2 text-sm bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {t('admin.transcribeProgress.downloadExcel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Record detail modal */}
      <RecordDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        province={selectedRecord?._province || selectedRecord?.Provincia || activeProvince}
        getItemAttachments={getItemAttachments}
        downloadAttachment={downloadAttachment}
      />

      {/* Local survey delete confirmation */}
      {confirmDeleteLocal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <Trash2 className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-base font-semibold">Eliminar inquérito local?</h2>
            </div>
            <p className="text-sm text-gray-600">
              Este inquérito ainda não foi enviado ao servidor. Eliminar apaga-o permanentemente deste dispositivo.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDeleteLocal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('ui.cancel')}
              </button>
              <button
                onClick={handleDeleteLocalSurvey}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('ui.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <Trash2 className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-base font-semibold">{t('admin.delete.title')}</h2>
            </div>
            <p className="text-sm text-gray-600">
              {t('admin.delete.confirm', { id: confirmDelete.itemId })}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('ui.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('ui.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
