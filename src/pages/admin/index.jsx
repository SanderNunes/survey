import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { assemblyClient } from '@/config/assemblyai';
import { useSharePoint } from '@/hooks/useSharePoint';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Analytics from './Analytics';

const PROVINCES = ['Cabinda', 'Bié', 'Zaire'];

// Columns to show in the table (internal name → display label)
const TABLE_COLS = [
  { key: 'Id',                  label: 'ID'          },
  { key: 'Municipio',           label: 'Município'   },
  { key: 'FaixaEtaria',         label: 'Faixa etária'},
  { key: 'Genero',              label: 'Género'      },
  { key: 'Ocupacao',            label: 'Ocupação'    },
  { key: 'OperadorAtual',       label: 'Operador'    },
  { key: 'TipoTelefone',        label: 'Telefone'    },
  { key: 'TemGravacoes',        label: 'Áudio'       },
  { key: 'DataPreenchimento',   label: 'Data'        },
];

export default function AdminPage() {
  const {
    sp,
    checkIsOwner,
    getProvinceRecords,
    getProvinceCount,
    deleteProvinceRecord,
    updateProvinceRecord,
    getItemAttachments,
    downloadAttachment,
    exportProvincePackage,
  } = useSharePoint();

  // ── access guard ──────────────────────────────────────────────────────────
  const [isOwner, setIsOwner] = useState(null); // null = still checking

  useEffect(() => {
    if (!sp) return;
    checkIsOwner().then(setIsOwner);
  }, [sp, checkIsOwner]);

  // ── main state ────────────────────────────────────────────────────────────
  const [activeProvince, setActiveProvince] = useState('Cabinda');
  const [counts, setCounts] = useState({ Cabinda: null, 'Bié': null, Zaire: null });
  const [records, setRecords] = useState([]);
  const [listNotFound, setListNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { itemId }
  const [mainTab, setMainTab] = useState('data'); // 'data' | 'analytics'
  const [exportingTranscript, setExportingTranscript] = useState(false);
  const [transcriptProgress, setTranscriptProgress] = useState({ current: 0, total: 0 });
  const [transcribingRows, setTranscribingRows] = useState({}); // { [itemId]: true }

  // ── load counts — 404 means list not created yet, show 0 silently ─────────
  const refreshCounts = useCallback(async () => {
    const results = await Promise.allSettled(
      PROVINCES.map(p => getProvinceCount(p))
    );
    const next = {};
    PROVINCES.forEach((p, i) => {
      const r = results[i];
      // 404 = list doesn't exist yet → 0; other errors → '—'
      if (r.status === 'fulfilled') {
        next[p] = r.value;
      } else if (r.reason?.message?.includes('404') || r.reason?.message?.includes('does not exist')) {
        next[p] = 0;
      } else {
        next[p] = '—';
      }
    });
    setCounts(next);
  }, [getProvinceCount]);

  // ── load records — 404 shows an inline notice, not a toast ────────────────
  const loadRecords = useCallback(async (province) => {
    setLoading(true);
    setRecords([]);
    setListNotFound(false);
    try {
      const data = await getProvinceRecords(province);
      setRecords(data);
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('does not exist')) {
        setListNotFound(true);
      } else {
        toast.error('Erro ao carregar registos: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getProvinceRecords]);

  // Load counts once sp is ready; do NOT auto-load records (lists may not exist yet)
  useEffect(() => {
    if (isOwner !== true || !sp) return;
    refreshCounts();
    loadRecords(activeProvince);
  }, [isOwner, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load records when switching province tab
  useEffect(() => {
    if (isOwner !== true || !sp) return;
    setSearchTerm('');
    loadRecords(activeProvince);
  }, [activeProvince]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── filtered rows ─────────────────────────────────────────────────────────
  const term = searchTerm.toLowerCase();
  const filtered = term
    ? records.filter(r =>
        (r.Municipio || '').toLowerCase().includes(term) ||
        (r.OperadorAtual || '').toLowerCase().includes(term) ||
        (r.Genero || '').toLowerCase().includes(term) ||
        (r.Ocupacao || '').toLowerCase().includes(term)
      )
    : records;

  // ── export Excel ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (records.length === 0) {
      toast('Nenhum registo para exportar.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeProvince);
    XLSX.writeFile(wb, `${activeProvince}_survey_${Date.now()}.xlsx`);
    toast.success('Ficheiro Excel exportado.');
  };

  // ── export ZIP (audio attachments) ────────────────────────────────────────
  const exportZip = async () => {
    const withAudio = records.filter(r => r.TemGravacoes === 'Sim');
    if (withAudio.length === 0) {
      toast('Nenhum registo com gravações de áudio.');
      return;
    }
    setExporting(true);
    const toastId = toast.loading(`A exportar áudio de ${withAudio.length} registo(s)…`);
    try {
      const zip = new JSZip();
      for (const item of withAudio) {
        const atts = await getItemAttachments(activeProvince, item.Id);
        for (const att of atts) {
          const buf = await downloadAttachment(att.ServerRelativeUrl);
          zip.file(`item_${item.Id}/${att.FileName}`, buf);
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProvince}_audio_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ZIP de áudio exportado.', { id: toastId });
    } catch (err) {
      toast.error('Erro ao exportar ZIP: ' + err.message, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { itemId } = confirmDelete;
    try {
      await deleteProvinceRecord(activeProvince, itemId);
      setRecords(prev => prev.filter(r => r.Id !== itemId));
      setCounts(prev => ({ ...prev, [activeProvince]: (prev[activeProvince] || 1) - 1 }));
      toast.success('Registo eliminado.');
    } catch (err) {
      toast.error('Erro ao eliminar: ' + err.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  // ── per-row transcription (admin, pre-recorded audio) ─────────────────────
  const handleTranscribeRow = async (row) => {
    setTranscribingRows(prev => ({ ...prev, [row.Id]: true }));
    const toastId = toast.loading(`A transcrever registo #${row.Id}…`);
    try {
      const atts = await getItemAttachments(activeProvince, row.Id);
      const fields = {};

      for (const att of atts) {
        const name = att.FileName;
        const qId  = name.startsWith('mainInsight')      ? 'mainInsight'
                   : name.startsWith('newShopLocation')   ? 'newShopLocation'
                   : name.includes('_mainInsight')         ? 'mainInsight'
                   : name.includes('_newShopLocation')     ? 'newShopLocation'
                   : null;
        if (!qId) continue;

        const buf    = await downloadAttachment(att.ServerRelativeUrl);
        const blob   = new Blob([buf], { type: 'audio/wav' });
        const result = await assemblyClient.transcripts.transcribe({
          audio: blob,
          language_detection: true,
          speech_model: 'universal-3-pro',
        });

        if (result.text) {
          fields[qId === 'mainInsight' ? 'InsightPrincipal' : 'LocalNovasLojas'] = result.text;
        }
      }

      if (Object.keys(fields).length > 0) {
        await updateProvinceRecord(activeProvince, row.Id, fields);
        setRecords(prev => prev.map(r => r.Id === row.Id ? { ...r, ...fields } : r));
        toast.success(`Transcrição concluída para #${row.Id}.`, { id: toastId });
      } else {
        toast('Nenhum áudio reconhecido para transcrever.', { id: toastId });
      }
    } catch (err) {
      toast.error(`Erro ao transcrever #${row.Id}: ` + err.message, { id: toastId });
    } finally {
      setTranscribingRows(prev => { const n = { ...prev }; delete n[row.Id]; return n; });
    }
  };

  // ── transcript export ─────────────────────────────────────────────────────
  const handleTranscriptExport = async () => {
    setExportingTranscript(true);
    const toastId = toast.loading('A preparar pacote de transcrição…');
    try {
      const result = await exportProvincePackage(activeProvince, (p) => {
        setTranscriptProgress(p);
        toast.loading(`A exportar áudio ${p.current}/${p.total}…`, { id: toastId });
      });
      toast.success(`Pacote exportado: ${result.audioFiles} ficheiro(s) de áudio.`, { id: toastId });
    } catch (err) {
      toast.error('Erro ao exportar: ' + err.message, { id: toastId });
    } finally {
      setExportingTranscript(false);
      setTranscriptProgress({ current: 0, total: 0 });
    }
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
        <p className="text-sm">Acesso negado. Esta área é reservada aos administradores do site.</p>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center space-x-3">
          <Database className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-semibold text-gray-800">Painel de Administração</h1>
        </div>

        {/* Main tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setMainTab('data')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              mainTab === 'data'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table2 className="w-4 h-4" />
            Dados
          </button>
          <button
            onClick={() => setMainTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              mainTab === 'analytics'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Análise
          </button>
        </div>

        {/* Analytics view */}
        {mainTab === 'analytics' && (
          <Analytics isOwner={isOwner} />
        )}

        {/* Data view */}
        {mainTab === 'data' && <>

        {/* Count cards */}
        <div className="grid grid-cols-3 gap-4">
          {PROVINCES.map(p => (
            <button
              key={p}
              onClick={() => setActiveProvince(p)}
              className={`rounded-xl p-5 text-left shadow-sm border transition-all ${
                activeProvince === p
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
              }`}
            >
              <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${activeProvince === p ? 'text-white/70' : 'text-gray-400'}`}>
                {p}
              </p>
              <p className="text-3xl font-bold">
                {counts[p] === null ? '…' : counts[p]}
              </p>
              <p className={`text-xs mt-1 ${activeProvince === p ? 'text-white/70' : 'text-gray-400'}`}>
                respostas
              </p>
            </button>
          ))}
        </div>

        {/* Province tabs + toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {PROVINCES.map(p => (
              <button
                key={p}
                onClick={() => setActiveProvince(p)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeProvince === p
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar município, operador, género…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              onClick={() => loadRecords(activeProvince)}
              className="flex items-center space-x-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={exportExcel}
              disabled={records.length === 0}
              className="flex items-center space-x-1.5 text-sm text-green-700 border border-green-200 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={exportZip}
              disabled={exporting || records.length === 0}
              className="flex items-center space-x-1.5 text-sm text-blue-700 border border-blue-200 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {exporting
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Archive className="w-4 h-4" />
              }
              <span>{exporting ? 'A exportar…' : 'Exportar Áudio (ZIP)'}</span>
            </button>

            <button
              onClick={handleTranscriptExport}
              disabled={exportingTranscript || records.length === 0}
              className="flex items-center space-x-1.5 text-sm text-purple-700 border border-purple-200 bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {exportingTranscript
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <FileAudio className="w-4 h-4" />
              }
              <span>
                {exportingTranscript
                  ? `Áudio ${transcriptProgress.current}/${transcriptProgress.total}…`
                  : 'Exportar Transcrição'}
              </span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : listNotFound ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
                <Database className="w-8 h-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  A lista <span className="font-semibold">{activeProvince}_PreLaunch_Survey</span> ainda não existe no SharePoint.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
                <Search className="w-8 h-8" />
                <p className="text-sm">Nenhum resultado para &ldquo;{searchTerm}&rdquo;</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {TABLE_COLS.map(col => (
                      <th key={col.key} className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium text-gray-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(row => (
                    <tr key={row.Id} className="hover:bg-gray-50 transition-colors">
                      {TABLE_COLS.map(col => (
                        <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-48 truncate">
                          {col.key === 'DataPreenchimento' && row[col.key]
                            ? new Date(row[col.key]).toLocaleDateString('pt-AO')
                            : col.key === 'TemGravacoes'
                              ? row[col.key] === 'Sim'
                                ? <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Sim</span>
                                : <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Não</span>
                              : row[col.key] ?? '—'
                          }
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.TemGravacoes === 'Sim' && (
                            <button
                              onClick={() => handleTranscribeRow(row)}
                              disabled={!!transcribingRows[row.Id]}
                              className="text-gray-400 hover:text-purple-500 disabled:opacity-40 transition-colors"
                              title="Transcrever áudio"
                            >
                              {transcribingRows[row.Id]
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Mic className="w-4 h-4" />
                              }
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete({ itemId: row.Id })}
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

          {/* Footer count */}
          {!loading && records.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
              {filtered.length !== records.length
                ? `${filtered.length} de ${records.length} registos`
                : `${records.length} registo(s)`}
            </div>
          )}
        </div>

        </> /* end data tab */}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <Trash2 className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-base font-semibold">Eliminar registo</h2>
            </div>
            <p className="text-sm text-gray-600">
              Tem a certeza que pretende eliminar o registo <span className="font-medium">#{confirmDelete.itemId}</span>? Esta ação é irreversível.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
