import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { RefreshCw, TrendingUp, Users, Mic, Smartphone, ChevronRight, ChevronDown, BarChart2, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSharePoint } from '@/hooks/useSharePoint';

const PROVINCES = ['Cabinda', 'Bié', 'Zaire'];

const COLORS = {
  primary:   '#FF6B00',
  secondary: '#3B82F6',
  tertiary:  '#10B981',
  quaternary:'#8B5CF6',
  danger:    '#EF4444',
  warning:   '#F59E0B',
  gray:      '#6B7280',
};

const PALETTE = [
  COLORS.primary, COLORS.secondary, COLORS.tertiary,
  COLORS.quaternary, COLORS.warning, COLORS.danger,
  '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

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

// ── Small reusable components ────────────────────────────────────────────────

function KPICard({ title, value, sub, icon: Icon, color = 'orange' }) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</h3>
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

// ── Drill-down table: province → municipality ────────────────────────────────

function DrilldownTable({ allRecords }) {
  const [expanded, setExpanded] = useState({});

  const byProvince = useMemo(() => {
    const map = {};
    PROVINCES.forEach(p => { map[p] = {}; });
    allRecords.forEach(r => {
      const prov = r.Provincia || r._province || '—';
      const mun  = r.Municipio || '—';
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
            <th className="px-4 py-3 text-left font-medium text-gray-600">Província / Município</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Respostas</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">% do total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {PROVINCES.map(prov => {
            const munis = byProvince[prov] || {};
            const provTotal = Object.values(munis).reduce((a, b) => a + b, 0);
            const totalAll  = allRecords.length || 1;
            const isOpen    = expanded[prov];

            return (
              <React.Fragment key={prov}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggle(prov)}
                >
                  <td className="px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                    {prov}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{provTotal}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {((provTotal / totalAll) * 100).toFixed(1)}%
                  </td>
                </tr>
                {isOpen && Object.entries(munis)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mun, count]) => (
                    <tr key={mun} className="bg-orange-50/40 hover:bg-orange-50 transition-colors">
                      <td className="px-4 py-2.5 pl-12 text-gray-600">{mun}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{count}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                        {((count / totalAll) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))
                }
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    .slice(-30); // last 30 days
}

// ── Main analytics component ─────────────────────────────────────────────────

export default function Analytics({ isOwner }) {
  const { t } = useTranslation();
  const { sp, getProvinceRecords } = useSharePoint();
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [drillProvince, setDrillProvince] = useState(null); // null = all provinces

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
      const combined = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);
      setAllRecords(combined);
    } catch (err) {
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [sp, getProvinceRecords]);

  useEffect(() => {
    if (isOwner === true && sp) loadAll();
  }, [isOwner, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ────────────────────────────────────────────────────────────

  const view = useMemo(() =>
    drillProvince ? allRecords.filter(r => (r.Provincia || r._province) === drillProvince) : allRecords,
    [allRecords, drillProvince]
  );

  const total        = view.length;
  const withAudio    = view.filter(r => r.TemGravacoes === 'Sim').length;
  const avgSatisf    = avgNumber(view, 'SatisfacaoOperador');
  const avgCoverage  = avgNumber(view, 'CoberturaDaRede');

  const provinceData = useMemo(() =>
    PROVINCES.map(p => ({
      name: p,
      respostas: allRecords.filter(r => (r.Provincia || r._province) === p).length,
    })),
    [allRecords]
  );

  const unknown = t('analytics.charts.unknown');
  const genderData      = useMemo(() => freq(view, 'Genero',           unknown), [view, unknown]);
  const operatorData    = useMemo(() => freq(view, 'OperadorAtual',    unknown).slice(0, 6), [view, unknown]);
  const ageData         = useMemo(() => freq(view, 'FaixaEtaria',      unknown), [view, unknown]);
  const phoneTypeData   = useMemo(() => freq(view, 'TipoTelefone',     unknown).slice(0, 5), [view, unknown]);
  const sim4GData       = useMemo(() => freq(view, 'Suporta4G',        unknown), [view, unknown]);
  const simConfigData   = useMemo(() => freq(view, 'ConfiguracaoSIM',  unknown), [view, unknown]);
  const rechargeFreqData= useMemo(() => freq(view, 'FrequenciaRecarga',unknown), [view, unknown]);
  const rechargeValData = useMemo(() => freq(view, 'ValorRecarga',     unknown).slice(0, 6), [view, unknown]);
  const switchData      = useMemo(() => freq(view, 'MudariaOperador',  unknown), [view, unknown]);
  const mobileMoneyData = useMemo(() => freq(view, 'UsaMobileMoney',   unknown), [view, unknown]);
  const occupationData  = useMemo(() => freq(view, 'Ocupacao',         unknown).slice(0, 6), [view, unknown]);
  const timelineData    = useMemo(() => responsesByDay(view), [view]);
  const bundleData      = useMemo(() => freq(view, 'PacotePreferido',  unknown).slice(0, 6), [view, unknown]);

  const municipioData = useMemo(() =>
    freq(view, 'Municipio', unknown).slice(0, 10),
    [view, unknown]
  );

  const surveyorData = useMemo(() =>
    freq(view, 'AuthorName', unknown).slice(0, 20),
    [view, unknown]
  );

  const radarData = useMemo(() => [
    { metric: 'Satisfação Op.', value: avgNumber(view, 'SatisfacaoOperador') || 0 },
    { metric: 'Cobertura Rede', value: avgNumber(view, 'CoberturaDaRede') || 0 },
  ], [view]);

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

  return (
    <div className="space-y-8 pb-10">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('analytics.kpi.totalResponses')} value={total} icon={Users} color="orange"
          sub={drillProvince ? `${t('analytics.kpi.province')}${drillProvince}` : t('analytics.kpi.allProvinces')} />
        <KPICard title={t('analytics.kpi.withAudio')} value={withAudio}
          sub={`${total ? ((withAudio / total) * 100).toFixed(1) : 0}${t('analytics.kpi.percentOfTotal')}`}
          icon={Mic} color="blue" />
        <KPICard title={t('analytics.kpi.avgSatisfaction')} value={avgSatisf ? `${avgSatisf}/5` : '—'}
          sub={t('analytics.kpi.scale')} icon={TrendingUp} color="green" />
        <KPICard title={t('analytics.kpi.avgCoverage')} value={avgCoverage ? `${avgCoverage}/5` : '—'}
          sub={t('analytics.kpi.scale')} icon={Smartphone} color="purple" />
      </div>

      {/* Surveyor Leaderboard */}
      {surveyorData.length > 0 && (
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500 inline" /> Inquiridores — Inquéritos Realizados</span>
          </SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Ranked table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-10">#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Inquiridor</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Inquéritos</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">% Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {surveyorData.map((row, i) => {
                    const pct = total ? ((row.value / total) * 100).toFixed(1) : 0;
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
            <ChartCard title="Inquéritos por Inquiridor">
              <ResponsiveContainer width="100%" height={Math.max(180, surveyorData.length * 32)}>
                <BarChart data={surveyorData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Inquéritos" radius={[0, 4, 4, 0]}>
                    {surveyorData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? COLORS.warning : i === 1 ? COLORS.secondary : i === 2 ? COLORS.tertiary : COLORS.gray} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        </div>
      )}

      {/* Timeline */}
      {timelineData.length > 1 && (
        <div>
          <SectionTitle>{t('analytics.charts.responsesOverTime')}</SectionTitle>
          <ChartCard title={t('analytics.charts.responsesByDay')}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" name={t('analytics.charts.responses')}
                  stroke={COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Province overview (only when viewing all) */}
      {!drillProvince && (
        <div>
          <SectionTitle>{t('analytics.charts.provinceOverview')}</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t('analytics.charts.byProvince')}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={provinceData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="respostas" name={t('analytics.charts.responses')} radius={[6, 6, 0, 0]}>
                    {provinceData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('analytics.charts.distributionByProvince')}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={provinceData} dataKey="respostas" nameKey="name"
                    cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    } labelLine={false}>
                    {provinceData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* Drill-down: top municipalities */}
      <div>
        <SectionTitle>
          {drillProvince ? t('analytics.charts.municipalities', { province: drillProvince }) : t('analytics.charts.municipalitiesAll')}
        </SectionTitle>
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

          <div>
            <DrilldownTable allRecords={allRecords} />
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div>
        <SectionTitle>{t('analytics.charts.demographics')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title={t('analytics.charts.gender')}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {genderData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.ageGroup')}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ageData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name={t('analytics.charts.people')} fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.occupation')}>
            <ResponsiveContainer width="100%" height={180}>
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

      {/* Device & connectivity */}
      <div>
        <SectionTitle>{t('analytics.charts.deviceConnectivity')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title={t('analytics.charts.phoneType')}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={phoneTypeData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {phoneTypeData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.supports4G')}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sim4GData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {sim4GData.map((_, i) => <Cell key={i} fill={PALETTE[i + 2]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.charts.simConfig')}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={simConfigData} barSize={22}>
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

      {/* Operator & network */}
      <div>
        <SectionTitle>{t('analytics.charts.operatorNetwork')}</SectionTitle>
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
            <div className="grid grid-cols-2 gap-4 mt-2">
              {[
                { labelKey: 'analytics.charts.operatorSatisfaction', key: 'SatisfacaoOperador', color: COLORS.primary },
                { labelKey: 'analytics.charts.networkCoverage',      key: 'CoberturaDaRede',    color: COLORS.secondary },
              ].map(({ labelKey, key, color }) => {
                const label = t(labelKey);
                const avg = avgNumber(view, key);
                const pct = avg ? (parseFloat(avg) / 5) * 100 : 0;
                return (
                  <div key={key} className="space-y-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-800">{avg ?? '—'}<span className="text-sm text-gray-400 font-normal">/5</span></p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-3">{t('analytics.charts.wouldSwitch')}</p>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={switchData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={50}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {switchData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Usage & recharge */}
      <div>
        <SectionTitle>{t('analytics.charts.usageRecharges')}</SectionTitle>
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
              <BarChart data={rechargeValData} barSize={20}>
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
                <Pie data={mobileMoneyData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {mobileMoneyData.map((_, i) => <Cell key={i} fill={PALETTE[i + 1]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Preferences */}
      <div>
        <SectionTitle>{t('analytics.charts.preferencesOffers')}</SectionTitle>
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
                    name: p,
                    [t('analytics.charts.withAudio')]: rows.filter(r => r.TemGravacoes === 'Sim').length,
                    [t('analytics.charts.withoutAudio')]: rows.filter(r => r.TemGravacoes !== 'Sim').length,
                  };
                })}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={t('analytics.charts.withAudio')} stackId="a" fill={COLORS.secondary} radius={[0, 0, 0, 0]} />
                <Bar dataKey={t('analytics.charts.withoutAudio')} stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

    </div>
  );
}
