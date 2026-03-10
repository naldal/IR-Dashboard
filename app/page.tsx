"use client";
import React, { useRef, useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Activity, BarChart3, RefreshCw, Sun, Moon } from 'lucide-react';
import { useStockData } from '@/hooks/useStockData';

const CHART_HEIGHT = 280;

const GameTick = ({ x, y, payload, dark }: any) => (
  <text
    x={x}
    y={y}
    textAnchor="end"
    transform={`rotate(-35, ${x}, ${y})`}
    fill={payload.value === '위메이드' ? (dark ? '#f1f5f9' : '#111827') : (dark ? '#64748b' : '#6b7280')}
    fontSize={13}
    fontWeight={payload.value === '위메이드' ? 800 : 600}
  >
    {payload.value}
  </text>
);

const ChartTooltip = ({ active, payload, label, valueFormatter, dark }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dark ? '#1e293b' : 'white',
      border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontSize: 16,
    }}>
      <p style={{ color: dark ? '#94a3b8' : '#4b5563', fontSize: 14, marginBottom: 8, fontWeight: 700 }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color, fontWeight: 800, margin: '4px 0' }}>
          {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

function isUp(changeRate: string): boolean {
  const n = parseFloat(changeRate);
  return !isNaN(n) && n >= 0;
}

function useFlash(value: string) {
  const [active, setActive] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current !== value && value !== '-') {
      setActive(true);
      const id = setTimeout(() => setActive(false), 700);
      prevRef.current = value;
      return () => clearTimeout(id);
    }
    prevRef.current = value;
  }, [value]);
  return active;
}

interface CardProps {
  title: string; value: string; change: string;
  icon: React.ElementType; up: boolean; isLoading: boolean; delay: number; dark: boolean;
}
function StatCard({ title, value, change, icon: Icon, up, isLoading, delay, dark }: CardProps) {
  const flashing = useFlash(value);
  return (
    <div
      className={`card-enter p-6 rounded-2xl shadow-md border flex flex-col transition-colors duration-300 ${
        dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      } ${flashing ? (up ? 'flash-up' : 'flash-down') : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-bold transition-colors duration-300 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{title}</h3>
        <Icon className={`h-6 w-6 transition-colors duration-300 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />
      </div>
      <div className={`text-3xl font-extrabold transition-colors duration-300 ${dark ? 'text-white' : 'text-gray-900'} ${isLoading ? 'animate-pulse' : ''}`}>
        {value}
      </div>
      <div className={`text-base font-bold mt-3 flex items-center ${up ? 'text-red-500' : 'text-blue-500'}`}>
        {up ? <ArrowUpRight className="h-5 w-5 mr-1" strokeWidth={3} /> : <ArrowDownRight className="h-5 w-5 mr-1" strokeWidth={3} />}
        {change}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const stock = useStockData();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    setDark(saved);
  }, []);

  const toggleDark = () => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  };

  const axisStyle = { fontSize: 14, fill: dark ? '#64748b' : '#6b7280', fontWeight: 600 };
  const gridStyle = { stroke: dark ? '#1e293b' : '#e5e7eb', strokeDasharray: '4 4' };

  const priceUp = isUp(stock.changeRate);
  const kospiUp = isUp(stock.kospi.changeRate);
  const kosdaqUp = isUp(stock.kosdaq.changeRate);
  const exchangeUp = isUp(stock.exchangeChange);

  const marketCapLabel = stock.marketCap !== '-'
    ? `${Number(stock.marketCap).toLocaleString()}억`
    : '-';

  const cards = [
    {
      title: "위메이드 종가",
      value: stock.price !== '-' ? `${Number(stock.price).toLocaleString()}원` : '-',
      change: stock.changeRate !== '-' ? `${priceUp ? '+' : ''}${stock.changeRate}%` : '-',
      icon: Activity, up: priceUp,
    },
    {
      title: "시가총액",
      value: marketCapLabel,
      change: stock.priceChange !== '-' ? `${priceUp ? '+' : ''}${Number(stock.priceChange).toLocaleString()}원` : '-',
      icon: DollarSign, up: priceUp,
    },
    {
      title: "KOSPI",
      value: stock.kospi.value !== '-' ? Number(stock.kospi.value).toLocaleString() : '-',
      change: stock.kospi.changeRate !== '-' ? `${kospiUp ? '+' : ''}${stock.kospi.changeRate}%` : '-',
      icon: BarChart3, up: kospiUp,
    },
    {
      title: "KOSDAQ",
      value: stock.kosdaq.value !== '-' ? Number(stock.kosdaq.value).toLocaleString() : '-',
      change: stock.kosdaq.changeRate !== '-' ? `${kosdaqUp ? '+' : ''}${stock.kosdaq.changeRate}%` : '-',
      icon: BarChart3, up: kosdaqUp,
    },
    {
      title: "원/달러 환율",
      value: stock.exchangeRate !== '-' ? `${Number(stock.exchangeRate).toLocaleString()}원` : '-',
      change: stock.exchangeChange !== '-' ? `${exchangeUp ? '+' : ''}${stock.exchangeChange}` : '-',
      icon: DollarSign, up: exchangeUp,
    },
  ];

  const chartCard = `p-7 rounded-2xl shadow-md border transition-colors duration-300 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`;
  const chartTitle = `text-xl font-bold tracking-tight mb-2 transition-colors duration-300 ${dark ? 'text-slate-100' : 'text-gray-800'}`;
  const chartSub = `text-sm font-medium mb-6 transition-colors duration-300 ${dark ? 'text-slate-500' : 'text-gray-400'}`;

  return (
    <div className={`min-h-screen p-6 md:p-10 font-sans transition-colors duration-300 ${dark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stock.isMarketOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className={`relative inline-flex h-3 w-3 rounded-full ${stock.isMarketOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
          <h1 className={`text-4xl font-extrabold tracking-tight transition-colors duration-300 ${dark ? 'text-white' : 'text-gray-900'}`}>IR실 증시 Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {stock.lastUpdated && (
            <p className={`text-sm font-medium transition-colors duration-300 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
              기준: {stock.lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          )}
          {stock.error && <p className="text-sm text-red-500 font-medium">{stock.error}</p>}
          <button
            onClick={toggleDark}
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-200 ${
              dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            aria-label="다크모드 토글"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={stock.refresh}
            disabled={stock.isLoading || stock.isChartLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors duration-200 ${
              dark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-900 hover:bg-gray-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${stock.isLoading || stock.isChartLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 상단 카드뷰 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-10">
        {cards.map((card, index) => (
          <StatCard key={index} {...card} isLoading={stock.isLoading} delay={index * 80} dark={dark} />
        ))}
      </div>

      {/* 2x2 차트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {stock.isChartLoading ? (
          <div className={`col-span-2 text-center py-16 font-medium transition-colors duration-300 ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
            당일 차트 데이터 로딩 중...
          </div>
        ) : (
          <>
            {/* 1. 시총 차트 */}
            <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '0ms' }}>
              <h3 className={chartTitle}>1. 시가총액 추이</h3>
              <p className={chartSub}>단위: 억원</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={stock.chartHistory} margin={{ top: 10, right: 28, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMarketCap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} tick={axisStyle} axisLine={false} tickLine={false} width={65} tickFormatter={v => v.toLocaleString()} />
                  <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v.toLocaleString()}억`} />} cursor={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="시가총액" stroke="#ef4444" strokeWidth={3} fill="url(#gradMarketCap)"
                    dot={(props: any) => {
                      if (!stock.isMarketOpen) return <g key={props.key} />;
                      if (props.index !== stock.chartHistory.length - 1) return <g key={props.key} />;
                      return (
                        <g key={props.key}>
                          <circle cx={props.cx} cy={props.cy} r={9} fill="#ef4444" className="live-dot-pulse" />
                          <circle cx={props.cx} cy={props.cy} r={5} fill="#ef4444" stroke={dark ? '#1e293b' : 'white'} strokeWidth={2} />
                        </g>
                      );
                    }}
                    activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 3, stroke: dark ? '#1e293b' : 'white' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 2. 거래량 차트 */}
            <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '100ms' }}>
              <h3 className={chartTitle}>2. 거래량 추이</h3>
              <p className={chartSub}>단위: 주 (구간 합산)</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={stock.chartHistory} margin={{ top: 10, right: 28, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={65} tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v} />
                  <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v.toLocaleString()}주`} />} cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="거래량" stroke="#3b82f6" strokeWidth={3} fill="url(#gradVolume)"
                    dot={(props: any) => {
                      if (!stock.isMarketOpen) return <g key={props.key} />;
                      if (props.index !== stock.chartHistory.length - 1) return <g key={props.key} />;
                      return (
                        <g key={props.key}>
                          <circle cx={props.cx} cy={props.cy} r={9} fill="#3b82f6" className="live-dot-pulse" />
                          <circle cx={props.cx} cy={props.cy} r={5} fill="#3b82f6" stroke={dark ? '#1e293b' : 'white'} strokeWidth={2} />
                        </g>
                      );
                    }}
                    activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: dark ? '#1e293b' : 'white' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 3. 등락률 */}
            <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '200ms' }}>
              <h3 className={chartTitle}>3. 주요 게임사 등락률</h3>
              <p className={chartSub}>단위: %</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={stock.sectorData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="name" tick={(props) => <GameTick {...props} dark={dark} />} axisLine={false} tickLine={false} height={65} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={45} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
                  <ReferenceLine y={0} stroke={dark ? '#475569' : '#9ca3af'} strokeWidth={2} />
                  <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`} />} cursor={{ fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="등락률">
                    {stock.sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.등락률 >= 0 ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 4. 투자자별 순매매 */}
            <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '300ms' }}>
              <h3 className={chartTitle}>4. 투자자별 순매매 동향</h3>
              <p className={chartSub}>단위: 백만원</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={stock.investorData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="name" tick={(props) => <GameTick {...props} dark={dark} />} axisLine={false} tickLine={false} height={65} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={65} tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}B` : v} />
                  <ReferenceLine y={0} stroke={dark ? '#475569' : '#9ca3af'} strokeWidth={2} />
                  <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v.toLocaleString()}백만`} />} cursor={{ fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
                  <Legend wrapperStyle={{ fontSize: 14, paddingTop: 15 }} formatter={(value) => <span style={{ color: dark ? '#94a3b8' : '#4b5563', fontWeight: 700 }}>{value}</span>} />
                  <Bar dataKey="외국인" fill="#ef4444" fillOpacity={0.9} />
                  <Bar dataKey="기관" fill="#f59e0b" fillOpacity={0.9} />
                  <Bar dataKey="개인" fill="#3b82f6" fillOpacity={0.9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <p className={`mt-10 text-center text-xs transition-colors duration-300 ${dark ? 'text-slate-700' : 'text-gray-400'}`}>Powered by 위메이드 송하민 대리</p>
    </div>
  );
}
