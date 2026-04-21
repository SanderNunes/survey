import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import {
  RefreshCw, TrendingUp, Users, Mic, Smartphone, ChevronRight, ChevronDown,
  BarChart2, Trophy, Clock, MapPin, Signal, CreditCard, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSharePoint } from '@/hooks/useSharePoint';

const PROVINCES = ['Cabinda', 'Zaire'];

const MUNICIPALITY_TARGETS = { 'Cabinda': 600, "M'banza Congo": 100, 'Soyo': 300 };
const TOTAL_TARGET = 1000;

const COLORS = {
  primary:    '#FF6B00',
  secondary:  '#3B82F6',
  tertiary:   '#10B981',
  quaternary: '#8B5CF6',
  danger:     '#EF4444',
  warning:    '#F59E0B',
  gray:       '#6B7280',
};

const PALETTE = [
  COLORS.primary, COLORS.secondary, COLORS.tertiary,
  COLORS.quaternary, COLORS.warning, COLORS.danger,
  '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

const NAV_SECTIONS = [
  { id: 'overview',     icon: TrendingUp,  colorClass: 'bg-orange-100 text-orange-600'  },
  { id: 'progress',     icon: MapPin,      colorClass: 'bg-blue-100 text-blue-600'      },
  { id: 'surveyors',    icon: Trophy,      colorClass: 'bg-yellow-100 text-yellow-600'  },
  { id: 'demographics', icon: Users,       colorClass: 'bg-purple-100 text-purple-600'  },
  { id: 'devices',      icon: Smartphone,  colorClass: 'bg-green-100 text-green-600'    },
  { id: 'operator',     icon: Signal,      colorClass: 'bg-blue-100 text-blue-600'      },
  { id: 'usage',        icon: CreditCard,  colorClass: 'bg-orange-100 text-orange-600'  },
];

// ── Reusable UI components ───────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function KPICard({ title, value, sub, icon: Icon, colorClass = 'bg-orange-50 text-orange-600' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${className}`}>
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon: Icon, colorClass, innerRef }) {
  return (
    <div className="flex items-center gap-3 mb-5" ref={innerRef}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-gray-200 my-8" />;
}

// ── Drill-down table: province → municipality ────────────────────────────────

function DrilldownTable({ allRecords }) {
  const [expanded, setExpanded] = useState({});

  const byProvince = useMemo(() => {
    const map = {};
    PROVINCES.forEach(p => { map[p] = {}; });
    allRecords.forEach(r => {
      const prov = r.Provincia || r._province || '—';
      const mun  = r.Municipio  || '—';
      if (!map[prov]) map[prov] = {};
      if (!map[prov][mun]) map[prov][mun] = 0;
      map[prov][mun]++;
    });
    return map;
  }, [allRecords]);

  const toggle = (p) => setExpanded(prev => ({ ...prev, [p]: !prev[p] }));

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Província / Município</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Respostas</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">% total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {PROVINCES.map(prov => {
            const munis    = byProvince[prov] || {};
            const provTotal = Object.values(munis).reduce((a, b) => a + b, 0);
            const totalAll  = allRecords.length || 1;
            const isOpen    = expanded[prov];
            return (
              <React.Fragment key={prov}>
                <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggle(prov)}>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    <span className="flex items-center gap-2">
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                      {prov}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{provTotal}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {((provTotal / totalAll) * 100).toFixed(1)}%
                  </td>
                </tr>
                {isOpen && Object.entries(munis).sort((a, b) => b[1] - a[1]).map(([mun, count]) => (
                  <tr key={mun} className="bg-orange-50/40 hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-2.5 pl-12 text-gray-600">{mun}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{count}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                      {((count / totalAll) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Helper functions ─────────────────────────────────────────────────────────

function freq(records, key, unknown = 'N/A') {
  const map = {};
  records.forEach(r => {
    const v = r[key] || unknown;
    map[v] = (map[v] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function avgNumber(records, key) {
  const vals = records.map(r => Number(r[key])).filter(n => !isNaN(n) && n > 0);
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function formatDuration(s) {
  if (!s || s <= 0) return '—';
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min ${sec}seg`;
  if (m > 0) return `${m} min ${sec} seg`;
  return `${sec} seg`;
}

function durationStats(records) {
  const vals = records.map(r => Number(r.DuracaoInquerito)).filter(n => !isNaN(n) && n > 0);
  if (!vals.length) return { avg: null, min: null, max: null, median: null };
  const sorted = [...vals].sort((a, b) => a - b);
  return {
    avg:    Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    min:    sorted[0],
    max:    sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

function durationBuckets(records) {
  const buckets = [
    { label: '< 5 min',   min: 0,    max: 300      },
    { label: '5–10 min',  min: 300,  max: 600      },
    { label: '10–15 min', min: 600,  max: 900      },
    { label: '15–20 min', min: 900,  max: 1200     },
    { label: '20–30 min', min: 1200, max: 1800     },
    { label: '> 30 min',  min: 1800, max: Infinity },
  ];
  const vals = records.map(r => Number(r.DuracaoInquerito)).filter(n => !isNaN(n) && n > 0);
  return buckets.map(b => ({
    name:  b.label,
    value: vals.filter(v => v >= b.min && v < b.max).length,
  }));
}

function avgDurationByGroup(records, key) {
  const map = {};
  records.forEach(r => {
    const d = Number(r.DuracaoInquerito);
    if (!isNaN(d) && d > 0) {
      const group = r[key] || '—';
      if (!map[group]) map[group] = [];
      map[group].push(d);
    }
  });
  return Object.entries(map)
    .map(([name, vals]) => ({
      name,
      avg:   Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      count: vals.length,
    }))
    .sort((a, b) => b.avg - a.avg);
}

function velocityForecast(records, targets) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const WINDOW = 7; // always fixed 7-day denominator

  if (!records.length) return null;

  // Global pace: submissions in last 7 days ÷ 7
  const recentTotal = records.filter(r => {
    const t = r.DataPreenchimento ? new Date(r.DataPreenchimento).getTime() : 0;
    return t >= sevenDaysAgo;
  }).length;
  const avgPerDay = recentTotal / WINDOW;

  const totalTarget  = Object.values(targets).reduce((a, b) => a + b, 0);
  const totalCurrent = records.length;

  // Per-municipality forecast — each uses its own 7-day rate
  const forecasts = Object.entries(targets).map(([mun, target]) => {
    const current   = records.filter(r => r.Municipio === mun).length;
    const remaining = Math.max(0, target - current);
    const munRecent = records.filter(r => {
      if (r.Municipio !== mun) return false;
      const t = r.DataPreenchimento ? new Date(r.DataPreenchimento).getTime() : 0;
      return t >= sevenDaysAgo;
    }).length;
    const munAvg  = munRecent / WINDOW;
    const daysLeft = munAvg > 0 ? remaining / munAvg : null;
    return {
      mun,
      current,
      target,
      remaining,
      avgPerDay:     Math.round(munAvg * 10) / 10,
      projectedDate: daysLeft !== null ? new Date(now + daysLeft * 24 * 60 * 60 * 1000) : null,
      done:          current >= target,
    };
  });

  // Overall projected completion = the SLOWEST incomplete municipality (bottleneck).
  // All municipalities must reach their target for the project to be done.
  const bottleneck = forecasts
    .filter(f => !f.done && f.projectedDate !== null)
    .reduce((latest, f) => (!latest || f.projectedDate > latest.projectedDate ? f : latest), null);

  const allDone = forecasts.every(f => f.done);

  return {
    avgPerDay:           Math.round(avgPerDay * 10) / 10,
    totalCurrent,
    totalTarget,
    totalRemaining:      Math.max(0, totalTarget - totalCurrent),
    projectedCompletion: allDone ? null : (bottleneck?.projectedDate ?? null),
    forecasts,
  };
}

function responsesByDay(records) {
  const map = {};
  records.forEach(r => {
    if (!r.DataPreenchimento) return;
    const d = new Date(r.DataPreenchimento).toLocaleDateString('pt-AO');
    map[d] = (map[d] || 0) + 1;
  });
  return Object.entries(map)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Analytics({ isOwner }) {
  const { t } = useTranslation();
  const { sp, getProvinceRecords } = useSharePoint();

  const [allRecords,    setAllRecords]    = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [drillProvince, setDrillProvince] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  const sectionRefs = useRef({});

  const scrollToSection = (id) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const loadAll = useCallback(async () => {
    if (!sp) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        PROVINCES.map(p =>
          getProvinceRecords(p, { top: 5000 }).then(rows =>
            rows.map(r => ({ ...r, _province: p, AuthorName: r.Author?.Title || 'Desconhecido' }))
          )
        )
      );
      setAllRecords(
        results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
      );
    } catch (err) {
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [sp, getProvinceRecords]);

  useEffect(() => {
    if (isOwner === true && sp) loadAll();
  }, [isOwner, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ─────────────────────────────────────────────────────────

  const view = useMemo(() =>
    drillProvince
      ? allRecords.filter(r => (r.Provincia || r._province) === drillProvince)
      : allRecords,
    [allRecords, drillProvince]
  );

  const total       = view.length;
  const withAudio   = view.filter(r => r.TemGravacoes === 'Sim').length;
  const avgSatisf   = avgNumber(view, 'SatisfacaoOperador');
  const avgCoverage = avgNumber(view, 'CoberturaDaRede');

  const provinceData   = useMemo(() =>
    PROVINCES.map(p => ({
      name:      p,
      respostas: allRecords.filter(r => (r.Provincia || r._province) === p).length,
    })),
    [allRecords]
  );

  const unknown          = t('analytics.charts.unknown');
  const genderData       = useMemo(() => freq(view, 'Genero',          unknown), [view, unknown]);
  const operatorData     = useMemo(() => freq(view, 'OperadorAtual',   unknown).slice(0, 6), [view, unknown]);
  const ageData          = useMemo(() => freq(view, 'FaixaEtaria',     unknown), [view, unknown]);
  const phoneTypeData    = useMemo(() => freq(view, 'TipoTelefone',    unknown).slice(0, 5), [view, unknown]);
  const sim4GData        = useMemo(() => freq(view, 'Suporta4G',       unknown), [view, unknown]);
  const simConfigData    = useMemo(() => freq(view, 'ConfiguracaoSIM', unknown), [view, unknown]);
  const rechargeFreqData = useMemo(() => freq(view, 'FrequenciaRecarga', unknown), [view, unknown]);
  const rechargeValData  = useMemo(() => freq(view, 'ValorRecarga',    unknown).slice(0, 6), [view, unknown]);
  const switchData       = useMemo(() => freq(view, 'MudariaOperador', unknown), [view, unknown]);
  const mobileMoneyData  = useMemo(() => freq(view, 'UsaMobileMoney',  unknown), [view, unknown]);
  const occupationData   = useMemo(() => freq(view, 'Ocupacao',        unknown).slice(0, 6), [view, unknown]);
  const timelineData     = useMemo(() => responsesByDay(view), [view]);
  const bundleData       = useMemo(() => freq(view, 'PacotePreferido', unknown).slice(0, 6), [view, unknown]);
  const municipioData    = useMemo(() => freq(view, 'Municipio',       unknown).slice(0, 10), [view, unknown]);
  const surveyorData     = useMemo(() => freq(view, 'AuthorName',      unknown).slice(0, 20), [view, unknown]);

  const velocity        = useMemo(() => velocityForecast(allRecords, MUNICIPALITY_TARGETS), [allRecords]);

  const durStats        = useMemo(() => durationStats(view), [view]);
  const durBucketData   = useMemo(() => durationBuckets(view), [view]);
  const durByProvince   = useMemo(() => avgDurationByGroup(view, 'Provincia'), [view]);
  const durBySurveyor   = useMemo(() => avgDurationByGroup(view, 'AuthorName').slice(0, 15), [view]);
  const hasDurationData = durStats.avg !== null;

  // ── Loading / empty states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (total === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-2">
        <BarChart2 className="w-10 h-10 text-gray-300" />
        <p className="text-sm">{t('analytics.noData')}</p>
        <button onClick={loadAll} className="text-xs text-primary hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> {t('analytics.retry')}
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="pb-16">

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">{t('analytics.filter')}</span>
          <button
            onClick={() => setDrillProvince(null)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              !drillProvince ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('analytics.all')}
          </button>
          {PROVINCES.map(p => (
            <button
              key={p}
              onClick={() => setDrillProvince(p === drillProvince ? null : p)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                drillProvince === p ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('analytics.refresh')}
        </button>
      </div>

      {/* ── Sticky section nav ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-white/95 backdrop-blur-sm border-b border-gray-200 mb-8">
        <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${
                activeSection === s.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {t(`analytics.nav.${s.id}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
      <div
        id="overview"
        ref={el => { sectionRefs.current.overview = el; }}
        className="scroll-mt-14 space-y-4"
      >
        <SectionHeader
          icon={TrendingUp}
          title={t('analytics.nav.overview')}
          subtitle={`${total} ${t('analytics.kpi.totalResponses').toLowerCase()}`}
          colorClass="bg-orange-100 text-orange-600"
        />

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={t('analytics.kpi.totalResponses')}
            value={total}
            icon={Users}
            colorClass="bg-orange-50 text-orange-600"
            sub={drillProvince ? drillProvince : t('analytics.kpi.allProvinces')}
          />
          <KPICard
            title={t('analytics.kpi.withAudio')}
            value={withAudio}
            sub={`${total ? ((withAudio / total) * 100).toFixed(1) : 0}${t('analytics.kpi.percentOfTotal')}`}
            icon={Mic}
            colorClass="bg-blue-50 text-blue-600"
          />
          <KPICard
            title={t('analytics.kpi.avgSatisfaction')}
            value={avgSatisf ? `${avgSatisf}/5` : '—'}
            sub={t('analytics.kpi.scale')}
            icon={TrendingUp}
            colorClass="bg-green-50 text-green-600"
          />
          <KPICard
            title={t('analytics.kpi.avgCoverage')}
            value={avgCoverage ? `${avgCoverage}/5` : '—'}
            sub={t('analytics.kpi.scale')}
            icon={Smartphone}
            colorClass="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Duration KPIs */}
        {hasDurationData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title={t('analytics.duration.avgTitle')}
              value={formatDuration(durStats.avg)}
              sub={t('analytics.duration.avgSub')}
              icon={Clock}
              colorClass="bg-blue-50 text-blue-600"
            />
            <KPICard
              title={t('analytics.velocity.kpiTitle')}
              value={velocity ? `${velocity.avgPerDay}/dia` : '—'}
              sub={velocity?.projectedCompletion
                ? `${t('analytics.velocity.kpiSub')} ${velocity.projectedCompletion.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : t('analytics.velocity.noActivity')}
              icon={Zap}
              colorClass="bg-purple-50 text-purple-600"
            />
            <KPICard
              title={t('analytics.duration.fastestTitle')}
              value={formatDuration(durStats.min)}
              sub={t('analytics.duration.fastestSub')}
              icon={Clock}
              colorClass="bg-green-50 text-green-600"
            />
            <KPICard
              title={t('analytics.duration.slowestTitle')}
              value={formatDuration(durStats.max)}
              sub={t('analytics.duration.slowestSub')}
              icon={Clock}
              colorClass="bg-orange-50 text-orange-600"
            />
          </div>
        )}

        {/* Duration histogram + timeline */}
        {(hasDurationData || timelineData.length > 1) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {hasDurationData && (
              <ChartCard title={t('analytics.duration.distributionChart')}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={durBucketData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={t('analytics.surveyor.colSurveys')} radius={[4, 4, 0, 0]}>
                      {durBucketData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {timelineData.length > 1 && (
              <ChartCard title={t('analytics.charts.responsesByDay')}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone" dataKey="count"
                      name={t('analytics.charts.responses')}
                      stroke={COLORS.primary} strokeWidth={2} dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        )}
      </div>

      <SectionDivider />

      {/* ══ PROGRESS ══════════════════════════════════════════════════ */}
      <div
        id="progress"
        ref={el => { sectionRefs.current.progress = el; }}
        className="scroll-mt-14 space-y-4"
      >
        <SectionHeader
          icon={MapPin}
          title={t('analytics.nav.progress')}
          subtitle={t('analytics.charts.provinceOverview')}
          colorClass="bg-blue-100 text-blue-600"
        />

        {/* Province overview (all view) */}
        {!drillProvince && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t('analytics.charts.byProvince')}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={provinceData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="respostas" name={t('analytics.charts.responses')} radius={[6, 6, 0, 0]}>
                    {provinceData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('analytics.charts.distributionByProvince')}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={provinceData} dataKey="respostas" nameKey="name"
                    cx="50%" cy="50%" outerRadius={78}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {provinceData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* Municipalities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t('analytics.charts.byMunicipality')}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={municipioData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.responses')} fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <DrilldownTable allRecords={allRecords} />
        </div>

        {/* Velocity forecast */}
        {velocity && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">{t('analytics.velocity.title')}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t('analytics.velocity.pace', { n: velocity.avgPerDay })}
                </p>
              </div>
              {velocity.projectedCompletion && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">{t('analytics.velocity.overallLabel')}</p>
                  <p className="text-sm font-bold text-primary">
                    {velocity.projectedCompletion.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {velocity.forecasts.map(({ mun, current, target, remaining, avgPerDay: mAvg, projectedDate, done }) => {
                const pct = Math.min(100, Math.round((current / target) * 100));
                return (
                  <div key={mun}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{mun}</span>
                        <span className="text-gray-400">{current}/{target}</span>
                        {done && (
                          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {t('analytics.velocity.complete')}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {done ? (
                          <span className="text-green-600 font-semibold">✓</span>
                        ) : projectedDate ? (
                          <span className="text-gray-600">
                            {projectedDate.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' })}
                            {mAvg > 0 && (
                              <span className="text-gray-400 ml-1">· {mAvg}/dia</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">{t('analytics.velocity.noActivity')}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${done ? 'bg-green-400' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
              <span>{t('analytics.velocity.totalLabel', { current: velocity.totalCurrent, target: velocity.totalTarget })}</span>
              <span>{velocity.totalRemaining} {t('analytics.velocity.remaining')}</span>
            </div>
          </div>
        )}

        {/* Duration by province */}
        {hasDurationData && durByProvince.length > 0 && (
          <ChartCard title={t('analytics.duration.byGroupTitle')}>
            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">
              {t('analytics.duration.byProvinceLabel')}
            </p>
            <div className="space-y-3">
              {durByProvince.map(({ name, avg, count }) => {
                const pct = durStats.max ? Math.round((avg / durStats.max) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">
                        {name}{' '}
                        <span className="text-gray-400 font-normal">
                          ({count} {t('analytics.duration.surveysUnit')})
                        </span>
                      </span>
                      <span className="font-semibold text-blue-600">{formatDuration(avg)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}
      </div>

      <SectionDivider />

      {/* ══ SURVEYORS ═════════════════════════════════════════════════ */}
      <div
        id="surveyors"
        ref={el => { sectionRefs.current.surveyors = el; }}
        className="scroll-mt-14 space-y-4"
      >
        <SectionHeader
          icon={Trophy}
          title={t('analytics.nav.surveyors')}
          subtitle={t('analytics.surveyor.title')}
          colorClass="bg-yellow-100 text-yellow-600"
        />

        {surveyorData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ranked table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                      {t('analytics.surveyor.colRank')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('analytics.surveyor.colName')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('analytics.surveyor.colSurveys')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('analytics.surveyor.colPercent')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {surveyorData.map((row, i) => {
                    const pct   = total ? ((row.value / total) * 100).toFixed(1) : 0;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                    return (
                      <tr key={row.name} className={`hover:bg-gray-50 transition-colors ${i < 3 ? 'font-medium' : ''}`}>
                        <td className="px-4 py-2.5 text-center text-base">{medal}</td>
                        <td className="px-4 py-2.5 text-gray-800">{row.name}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-primary">{row.value}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bar chart */}
            <ChartCard title={t('analytics.surveyor.chartTitle')}>
              <ResponsiveContainer width="100%" height={Math.max(180, surveyorData.length * 32)}>
                <BarChart data={surveyorData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name={t('analytics.surveyor.colSurveys')} radius={[0, 4, 4, 0]}>
                    {surveyorData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? COLORS.warning : i === 1 ? COLORS.secondary : i === 2 ? COLORS.tertiary : COLORS.gray}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* Duration by surveyor */}
        {hasDurationData && durBySurveyor.length > 0 && (
          <ChartCard title={t('analytics.duration.bySurveyorLabel')}>
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider">
                      {t('analytics.duration.colSurveyor')}
                    </th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase tracking-wider">
                      {t('analytics.duration.colAvg')}
                    </th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase tracking-wider">
                      {t('analytics.duration.colCount')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {durBySurveyor.slice(0, 10).map(({ name, avg, count }) => (
                    <tr key={name} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[180px]">{name}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-600">{formatDuration(avg)}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}
      </div>

      <SectionDivider />

      {/* ══ DEMOGRAPHICS ══════════════════════════════════════════════ */}
      <div
        id="demographics"
        ref={el => { sectionRefs.current.demographics = el; }}
        className="scroll-mt-14 space-y-4"
      >
        <SectionHeader
          icon={Users}
          title={t('analytics.nav.demographics')}
          subtitle={t('analytics.charts.demographics')}
          colorClass="bg-purple-100 text-purple-600"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title={t('analytics.charts.gender')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={genderData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {genderData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.ageGroup')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.occupation')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={occupationData} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} fill={COLORS.tertiary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <SectionDivider />

      {/* ══ DEVICES ════════════════════════════════════════════════════ */}
      <div
        id="devices"
        ref={el => { sectionRefs.current.devices = el; }}
        className="scroll-mt-14 space-y-4"
      >
        <SectionHeader
          icon={Smartphone}
          title={t('analytics.nav.devices')}
          subtitle={t('analytics.charts.deviceConnectivity')}
          colorClass="bg-green-100 text-green-600"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title={t('analytics.charts.phoneType')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={phoneTypeData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={78}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {phoneTypeData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.supports4G')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sim4GData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {sim4GData.map((_, i) => <Cell key={i} fill={PALETTE[i + 2]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.simConfig')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={simConfigData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} fill={COLORS.quaternary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <SectionDivider />

      {/* ══ OPERATOR ══════════════════════════════════════════════════ */}
      <div
        id="operator"
        ref={el => { sectionRefs.current.operator = el; }}
        className="scroll-mt-14 space-y-4"
      >
        <SectionHeader
          icon={Signal}
          title={t('analytics.nav.operator')}
          subtitle={t('analytics.charts.operatorNetwork')}
          colorClass="bg-blue-100 text-blue-600"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t('analytics.charts.topOperators')}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={operatorData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} radius={[6, 6, 0, 0]}>
                  {operatorData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.satisfactionCoverage')}>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { labelKey: 'analytics.charts.operatorSatisfaction', key: 'SatisfacaoOperador', color: COLORS.primary },
                { labelKey: 'analytics.charts.networkCoverage',      key: 'CoberturaDaRede',    color: COLORS.secondary },
              ].map(({ labelKey, key, color }) => {
                const avg = avgNumber(view, key);
                const pct = avg ? (parseFloat(avg) / 5) * 100 : 0;
                return (
                  <div key={key} className="space-y-2">
                    <p className="text-xs text-gray-500">{t(labelKey)}</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {avg ?? '—'}
                      <span className="text-sm text-gray-400 font-normal">/5</span>
                    </p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mb-3">{t('analytics.charts.wouldSwitch')}</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={switchData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={52}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {switchData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <SectionDivider />

      {/* ══ USAGE ══════════════════════════════════════════════════════ */}
      <div
        id="usage"
        ref={el => { sectionRefs.current.usage = el; }}
        className="scroll-mt-14 space-y-4"
      >
        <SectionHeader
          icon={CreditCard}
          title={t('analytics.nav.usage')}
          subtitle={t('analytics.charts.usageRecharges')}
          colorClass="bg-orange-100 text-orange-600"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title={t('analytics.charts.rechargeFrequency')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rechargeFreqData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} fill={COLORS.warning} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.rechargeAmount')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rechargeValData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.mobileMoney')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mobileMoneyData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {mobileMoneyData.map((_, i) => <Cell key={i} fill={PALETTE[i + 1]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t('analytics.charts.preferredBundle')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bundleData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} fill={COLORS.tertiary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.audioByProvince')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={PROVINCES.map(p => {
                  const rows = allRecords.filter(r => (r.Provincia || r._province) === p);
                  return {
                    name:                            p,
                    [t('analytics.charts.withAudio')]:    rows.filter(r => r.TemGravacoes === 'Sim').length,
                    [t('analytics.charts.withoutAudio')]: rows.filter(r => r.TemGravacoes !== 'Sim').length,
                  };
                })}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={t('analytics.charts.withAudio')}    stackId="a" fill={COLORS.secondary} radius={[0, 0, 0, 0]} />
                <Bar dataKey={t('analytics.charts.withoutAudio')} stackId="a" fill="#E5E7EB"          radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

    </div>
  );
}
