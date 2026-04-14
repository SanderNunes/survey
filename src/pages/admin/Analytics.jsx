import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { RefreshCw, TrendingUp, Users, Mic, Smartphone, ChevronRight, ChevronDown, BarChart2 } from 'lucide-react';
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

function freq(records, key) {
  const map = {};
  records.forEach(r => {
    const v = r[key] || 'Não informado';
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
            rows.map(r => ({ ...r, _province: p }))
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

  const genderData      = useMemo(() => freq(view, 'Genero'), [view]);
  const operatorData    = useMemo(() => freq(view, 'OperadorAtual').slice(0, 6), [view]);
  const ageData         = useMemo(() => freq(view, 'FaixaEtaria'), [view]);
  const phoneTypeData   = useMemo(() => freq(view, 'TipoTelefone').slice(0, 5), [view]);
  const sim4GData       = useMemo(() => freq(view, 'Suporta4G'), [view]);
  const simConfigData   = useMemo(() => freq(view, 'ConfiguracaoSIM'), [view]);
  const rechargeFreqData= useMemo(() => freq(view, 'FrequenciaRecarga'), [view]);
  const rechargeValData = useMemo(() => freq(view, 'ValorRecarga').slice(0, 6), [view]);
  const switchData      = useMemo(() => freq(view, 'MudariaOperador'), [view]);
  const mobileMoneyData = useMemo(() => freq(view, 'UsaMobileMoney'), [view]);
  const occupationData  = useMemo(() => freq(view, 'Ocupacao').slice(0, 6), [view]);
  const timelineData    = useMemo(() => responsesByDay(view), [view]);
  const bundleData      = useMemo(() => freq(view, 'PacotePreferido').slice(0, 6), [view]);

  const municipioData = useMemo(() =>
    freq(view, 'Municipio').slice(0, 10),
    [view]
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
        <p className="text-sm">Nenhum dado disponível. Carregue as respostas primeiro.</p>
        <button onClick={loadAll} className="text-xs text-primary hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filtrar por província:</span>
          <button
            onClick={() => setDrillProvince(null)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              !drillProvince ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
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
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total de Respostas" value={total} icon={Users} color="orange"
          sub={drillProvince ? `Província: ${drillProvince}` : 'Todas as províncias'} />
        <KPICard title="Com Gravação de Áudio" value={withAudio}
          sub={`${total ? ((withAudio / total) * 100).toFixed(1) : 0}% do total`}
          icon={Mic} color="blue" />
        <KPICard title="Satisfação Média Operador" value={avgSatisf ? `${avgSatisf}/5` : '—'}
          sub="Escala 1–5" icon={TrendingUp} color="green" />
        <KPICard title="Cobertura de Rede Média" value={avgCoverage ? `${avgCoverage}/5` : '—'}
          sub="Escala 1–5" icon={Smartphone} color="purple" />
      </div>

      {/* Timeline */}
      {timelineData.length > 1 && (
        <div>
          <SectionTitle>Respostas ao longo do tempo</SectionTitle>
          <ChartCard title="Respostas por dia (últimos 30 dias)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" name="Respostas"
                  stroke={COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Province overview (only when viewing all) */}
      {!drillProvince && (
        <div>
          <SectionTitle>Visão geral por província</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Respostas por província">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={provinceData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="respostas" name="Respostas" radius={[6, 6, 0, 0]}>
                    {provinceData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Distribuição por província">
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
          {drillProvince ? `Municípios — ${drillProvince}` : 'Top municípios (todas as províncias)'}
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Respostas por município (top 10)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={municipioData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Respostas" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
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
        <SectionTitle>Perfil demográfico</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Género">
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

          <ChartCard title="Faixa etária">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ageData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pessoas" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Ocupação">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={occupationData} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pessoas" fill={COLORS.tertiary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Device & connectivity */}
      <div>
        <SectionTitle>Dispositivo e conectividade</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Tipo de telefone">
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

          <ChartCard title="Suporta 4G">
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

          <ChartCard title="Configuração SIM">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={simConfigData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pessoas" fill={COLORS.quaternary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Operator & network */}
      <div>
        <SectionTitle>Operador e rede</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Operador atual (top 6)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={operatorData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pessoas" radius={[6, 6, 0, 0]}>
                  {operatorData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Médias de satisfação e cobertura">
            <div className="grid grid-cols-2 gap-4 mt-2">
              {[
                { label: 'Satisfação com operador', key: 'SatisfacaoOperador', color: COLORS.primary },
                { label: 'Cobertura de rede',        key: 'CoberturaDaRede',    color: COLORS.secondary },
              ].map(({ label, key, color }) => {
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
              <p className="text-xs text-gray-500 mb-3">Mudaria de operador?</p>
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
        <SectionTitle>Uso e recargas</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Frequência de recarga">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rechargeFreqData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pessoas" fill={COLORS.warning} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Valor de recarga habitual">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rechargeValData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pessoas" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Usa Mobile Money?">
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
        <SectionTitle>Preferências e oferta</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Pacote preferido">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bundleData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Pessoas" fill={COLORS.tertiary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Gravações de áudio por província">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={PROVINCES.map(p => {
                  const rows = allRecords.filter(r => (r.Provincia || r._province) === p);
                  return {
                    name: p,
                    'Com áudio': rows.filter(r => r.TemGravacoes === 'Sim').length,
                    'Sem áudio': rows.filter(r => r.TemGravacoes !== 'Sim').length,
                  };
                })}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Com áudio" stackId="a" fill={COLORS.secondary} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Sem áudio" stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

    </div>
  );
}
