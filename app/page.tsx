"use client";
import React, { useRef, useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Activity, BarChart3, Sun, Moon } from 'lucide-react';
import { useStockData } from '@/hooks/useStockData';

const CHART_HEIGHT = 280;
const MOBILE_CHART_HEIGHT = 360;
const COMPANY_CHART_BREAKPOINT = 2000;
const VALUE_ROLL_DURATION_MS = 280;

// 세로 바 차트용 X축 레이블 (회전)
const GameTick = ({ x, y, payload, dark }: any) => (
  <text
    x={x} y={y}
    textAnchor="end"
    transform={`rotate(-35, ${x}, ${y})`}
    fill={payload.value === '위메이드' ? (dark ? '#f1f5f9' : '#111827') : (dark ? '#64748b' : '#6b7280')}
    fontSize={13}
    fontWeight={payload.value === '위메이드' ? 800 : 600}
  >
    {payload.value}
  </text>
);

// 가로 바 차트용 Y축 레이블
const HorizontalGameTick = ({ x, y, payload, dark }: any) => (
  <text
    x={x} y={y}
    textAnchor="end"
    dominantBaseline="middle"
    fill={payload.value === '위메이드' ? (dark ? '#f1f5f9' : '#111827') : (dark ? '#64748b' : '#6b7280')}
    fontSize={12}
    fontWeight={payload.value === '위메이드' ? 800 : 500}
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

function parseNumericText(value: string): number | null {
  const normalized = value.replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectRollDirection(previous: string, next: string): 'up' | 'down' {
  const prevNumber = parseNumericText(previous);
  const nextNumber = parseNumericText(next);
  if (prevNumber === null || nextNumber === null) return 'up';
  return nextNumber >= prevNumber ? 'up' : 'down';
}

function ValueRoller({ value, className }: { value: string; className: string }) {
  const committedRef = useRef(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [nextValue, setNextValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [isAnimating, setIsAnimating] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (value === committedRef.current) return;

    const previous = committedRef.current;
    setPreviousValue(previous);
    setNextValue(value);
    setDirection(detectRollDirection(previous, value));
    setIsAnimating(true);
    setStarted(false);

    const raf = requestAnimationFrame(() => setStarted(true));
    const timeoutId = setTimeout(() => {
      committedRef.current = value;
      setIsAnimating(false);
    }, VALUE_ROLL_DURATION_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeoutId);
    };
  }, [value]);

  const outgoingClass = started
    ? (direction === 'up' ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0')
    : 'translate-y-0 opacity-100';
  const incomingClass = started
    ? 'translate-y-0 opacity-100'
    : (direction === 'up' ? 'translate-y-full opacity-0' : '-translate-y-full opacity-0');

  const maxLength = Math.max(previousValue.length, nextValue.length);
  const previousChars = previousValue.padStart(maxLength, ' ').split('');
  const nextChars = nextValue.padStart(maxLength, ' ').split('');
  const isDigit = (ch: string) => /\d/.test(ch);

  return (
    <div className={`${className} h-[1.2em] whitespace-nowrap leading-[1.2]`}>
      <span className="inline-flex">
        {nextChars.map((nextChar, index) => {
          const prevChar = previousChars[index];
          const charKey = `${index}-${nextChar}`;
          const changedDigit = isAnimating && prevChar !== nextChar && isDigit(prevChar) && isDigit(nextChar);

          if (!changedDigit) {
            return (
              <span key={charKey} className="inline-flex">
                {nextChar === ' ' ? '\u00A0' : nextChar}
              </span>
            );
          }

          return (
            <span key={charKey} className="relative inline-flex h-[1.2em] min-w-[0.62em] overflow-hidden">
              <span className={`absolute inset-0 transition-all duration-300 ease-out ${outgoingClass}`}>
                {prevChar}
              </span>
              <span className={`absolute inset-0 transition-all duration-300 ease-out ${incomingClass}`}>
                {nextChar}
              </span>
            </span>
          );
        })}
      </span>
    </div>
  );
}

function useWindowWidth() {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

interface CardProps {
  title: string; value: string; change: string;
  icon: React.ElementType; up: boolean; isLoading: boolean; delay: number; dark: boolean;
}
function StatCard({ title, value, change, icon: Icon, up, isLoading, delay, dark }: CardProps) {
  return (
    <div
      className={`card-enter p-6 rounded-2xl shadow-md border flex flex-col transition-colors duration-300 ${
        dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-bold transition-colors duration-300 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{title}</h3>
        <Icon className={`h-6 w-6 transition-colors duration-300 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />
      </div>
      <ValueRoller
        value={value}
        className={`text-3xl font-extrabold tabular-nums transition-colors duration-300 ${dark ? 'text-white' : 'text-gray-900'} ${isLoading ? 'animate-pulse' : ''}`}
      />
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
  const [currentTime, setCurrentTime] = useState('');
  const windowWidth = useWindowWidth();
  const useHorizontalCompanyCharts = windowWidth !== null && windowWidth <= COMPANY_CHART_BREAKPOINT;
  const sectorHorizontalHeight = Math.max(MOBILE_CHART_HEIGHT, stock.sectorData.length * 42 + 28);
  const investorHorizontalHeight = Math.max(MOBILE_CHART_HEIGHT, stock.investorData.length * 56 + 28);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    setDark(saved);
  }, []);

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('ko-KR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleDark = () => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  };

  const axisStyle = { fontSize: 14, fill: dark ? '#64748b' : '#6b7280', fontWeight: 600 };
  const mobileAxisStyle = { fontSize: 12, fill: dark ? '#64748b' : '#6b7280', fontWeight: 600 };
  const gridStyle = { stroke: dark ? '#1e293b' : '#e5e7eb', strokeDasharray: '4 4' };
  const refLineColor = dark ? '#475569' : '#9ca3af';
  const cursorFill = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className={`text-4xl font-extrabold tracking-tight transition-colors duration-300 ${dark ? 'text-white' : 'text-gray-900'}`}>IR실 증시 현황 대시보드</h1>
            <div className="mt-5 flex items-center gap-3">
              {stock.isMarketOpen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  장중
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${dark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  장마감
                </span>
              )}
              <p className={`text-sm font-medium tabular-nums transition-colors duration-300 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
                {currentTime}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stock.error && <p className="text-sm text-red-500 font-medium">{stock.error}</p>}
          <button
            onClick={toggleDark}
            aria-label="다크모드 토글"
            aria-pressed={dark}
            className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
              dark ? 'bg-slate-700' : 'bg-amber-200'
            }`}
          >
            <span className={`pointer-events-none absolute left-1.5 transition-opacity duration-300 ${
              dark ? 'opacity-35' : 'opacity-100'
            }`}>
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            </span>
            <span className={`pointer-events-none absolute right-1.5 transition-opacity duration-300 ${
              dark ? 'opacity-100' : 'opacity-35'
            }`}>
              <Moon className={`h-3.5 w-3.5 ${dark ? 'text-slate-200' : 'text-slate-500'}`} />
            </span>
            <span className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
              dark ? 'translate-x-7' : 'translate-x-0.5'
            }`}>
              {dark ? (
                <Moon className="h-3.5 w-3.5 text-slate-700" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* 상단 카드뷰 */}
      <div className="grid grid-cols-1 min-[1181px]:grid-cols-5 gap-5 mb-10">
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
                  <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
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
                  <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
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
              <ResponsiveContainer width="100%" height={useHorizontalCompanyCharts ? sectorHorizontalHeight : CHART_HEIGHT}>
                {useHorizontalCompanyCharts ? (
                  /* 가로 바 차트: 회사명 고정 노출 */
                  <BarChart layout="vertical" data={stock.sectorData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridStyle} horizontal={false} />
                    <XAxis type="number" tick={mobileAxisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={(props) => <HorizontalGameTick {...props} dark={dark} />}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      width={96}
                    />
                    <ReferenceLine x={0} stroke={refLineColor} strokeWidth={2} />
                    <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`} />} cursor={{ fill: cursorFill }} />
                    <Bar dataKey="등락률" radius={[0, 3, 3, 0]}>
                      {stock.sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.등락률 >= 0 ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  /* 데스크톱: 세로 바 차트 (회사명 X축 회전) */
                  <BarChart data={stock.sectorData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid {...gridStyle} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={(props) => <GameTick {...props} dark={dark} />}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      minTickGap={0}
                      height={65}
                    />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={45} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
                    <ReferenceLine y={0} stroke={refLineColor} strokeWidth={2} />
                    <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`} />} cursor={{ fill: cursorFill }} />
                    <Bar dataKey="등락률">
                      {stock.sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.등락률 >= 0 ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* 4. 투자자별 순매매 */}
            <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '300ms' }}>
              <h3 className={chartTitle}>4. 투자자별 순매매 동향</h3>
              <p className={chartSub}>단위: 백만원</p>
              <ResponsiveContainer width="100%" height={useHorizontalCompanyCharts ? investorHorizontalHeight : CHART_HEIGHT}>
                {useHorizontalCompanyCharts ? (
                  /* 가로 바 차트: 회사명 고정 노출 */
                  <BarChart layout="vertical" data={stock.investorData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid {...gridStyle} horizontal={false} />
                    <XAxis type="number" tick={mobileAxisStyle} axisLine={false} tickLine={false} tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}B` : String(v)} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={(props) => <HorizontalGameTick {...props} dark={dark} />}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      width={96}
                    />
                    <ReferenceLine x={0} stroke={refLineColor} strokeWidth={2} />
                    <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v.toLocaleString()}백만`} />} cursor={{ fill: cursorFill }} />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} formatter={(value) => <span style={{ color: dark ? '#94a3b8' : '#4b5563', fontWeight: 700 }}>{value}</span>} />
                    <Bar dataKey="외국인" fill="#ef4444" fillOpacity={0.9} radius={[0, 3, 3, 0]} />
                    <Bar dataKey="기관" fill="#f59e0b" fillOpacity={0.9} radius={[0, 3, 3, 0]} />
                    <Bar dataKey="개인" fill="#3b82f6" fillOpacity={0.9} radius={[0, 3, 3, 0]} />
                  </BarChart>
                ) : (
                  /* 데스크톱: 세로 바 차트 (회사명 X축 회전) */
                  <BarChart data={stock.investorData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid {...gridStyle} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={(props) => <GameTick {...props} dark={dark} />}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      minTickGap={0}
                      height={65}
                    />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={65} tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}B` : String(v)} />
                    <ReferenceLine y={0} stroke={refLineColor} strokeWidth={2} />
                    <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(v: number) => `${v.toLocaleString()}백만`} />} cursor={{ fill: cursorFill }} />
                    <Legend wrapperStyle={{ fontSize: 14, paddingTop: 15 }} formatter={(value) => <span style={{ color: dark ? '#94a3b8' : '#4b5563', fontWeight: 700 }}>{value}</span>} />
                    <Bar dataKey="외국인" fill="#ef4444" fillOpacity={0.9} />
                    <Bar dataKey="기관" fill="#f59e0b" fillOpacity={0.9} />
                    <Bar dataKey="개인" fill="#3b82f6" fillOpacity={0.9} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <p className={`mt-10 text-center text-xs transition-colors duration-300 ${dark ? 'text-slate-700' : 'text-gray-400'}`}>Powered by 위메이드 송하민 대리</p>
    </div>
  );
}
