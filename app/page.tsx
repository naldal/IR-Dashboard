"use client";
import React, { useRef, useState, useEffect, useSyncExternalStore } from 'react';
import {
  ComposedChart, LineChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Activity, BarChart3, Sun, Moon } from 'lucide-react';
import { useStockData } from '@/hooks/useStockData';

const CHART_HEIGHT = 280;
const MOBILE_CHART_HEIGHT = 360;
const VALUE_ROLL_DURATION_MS = 280;
const DARK_MODE_STORAGE_KEY = 'darkMode';
const DARK_MODE_EVENT = 'dark-mode-change';
const CHART_LABELS = ['D-9', 'D-8', 'D-7', 'D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Today'];

const investorTrendData = CHART_LABELS.map((label, index) => ({
  label,
  거래량: [9.9862, 20.2169, 14.3635, 23.1169, 40.6773, 31.6632, 16.3167, 13.5748, 13.8554, 15.2203][index],
  기관순매매: [-0.9727, -1.1871, 1.8018, -1.192, 1.6217, 4.2783, 0.94, 0.8432, -3.5289, -5.1536][index],
  외국인순매매: [0.0244, -2.2728, -1.4905, -1.4176, 0.4287, -3.2832, 0.1248, 2.3404, -1.215, -2.0465][index],
}));

const gameTop10IndexData = CHART_LABELS.map((label, index) => ({
  label,
  코스피: [5.58, 5.58, 4.58, -2.66, -14.72, -5.09, -5.07, -11.03, -5.68, -4.28][index],
  코스닥: [1.99, 1.99, 2.38, -2.24, -16.24, -2.14, 1.29, -3.25, -0.04, -0.11][index],
  'KRX 게임 TOP 10 지수': [-2, -2, -2.95, -5.08, -15.82, -11.11, -5.24, -3.94, -2.05, -6.05][index],
}));

const majorGameIndustryData = CHART_LABELS.map((label, index) => ({
  label,
  위메이드: [-13.6067, -13.6067, -13.8289, -11.4428, -10.7962, -9.9415, -13.0252, -21.1204, -6.1407, -2.1654][index],
  크래프톤: [-10.3156, -10.3156, -9.6563, -5.6478, -14.1147, -10.7961, -13.5234, -17.7888, -7.1955, -0.216][index],
  엔씨소프트: [-7.6742, -7.6742, -8.6266, -4.2985, -7.1088, -6.6426, -11.5326, -16.0827, -5.1943, -3.1308][index],
  넷마블: [-0.9248, -0.9248, -2.2658, 3.169, 3.169, 0.9468, -10.3934, -16.4043, -5.4121, 4.6875][index],
  펄어비스: [18.4692, 18.4692, 20.5865, 25.3927, 27.8133, 15.3983, 8.2945, 6.6278, 16.6278, -2.4133][index],
  시프트업: [-6.2553, -6.2553, -5.1335, -6.928, -6.7651, -4.071, -8.5412, -15.6334, -6.8955, -2.7523][index],
  더블유게임즈: [-7.6035, -7.6035, -8.6096, -9.6258, -10.4455, -8.0455, -9.5683, -13.691, -4.8278, -1.1407][index],
  넥슨게임즈: [-7.0632, -7.0632, -8.4508, -6.3674, -5.4698, -5.2012, -5.6508, -12.1643, -1.855, 0][index],
}));

const kosdaqSectorData = CHART_LABELS.map((label, index) => ({
  label,
  게임: [-2, -2, -3, -5, -16, -11, -5, -4, -2, -6][index],
  엔터: [-2, -2, -1, -8, -18, -13, -8, -12, -10, -11][index],
  바이오: [-1, -1, -1, -7, -19, -10, -10, -13, -11, -11][index],
  '2차전지': [2, 2, 3, -4, -19, -8, -6, -11, -9, -9][index],
}));

const majorIndustrySeries = [
  { key: '위메이드', color: '#ef4444' },
  { key: '크래프톤', color: '#f97316' },
  { key: '엔씨소프트', color: '#10b981' },
  { key: '넷마블', color: '#14b8a6' },
  { key: '펄어비스', color: '#8b5cf6' },
  { key: '시프트업', color: '#ec4899' },
  { key: '더블유게임즈', color: '#06b6d4' },
  { key: '넥슨게임즈', color: '#64748b' },
] as const;

const kosdaqSectorSeries = [
  { key: '게임', color: '#ef4444' },
  { key: '엔터', color: '#f59e0b' },
  { key: '바이오', color: '#10b981' },
  { key: '2차전지', color: '#3b82f6' },
] as const;

interface TooltipEntry {
  color?: string;
  fill?: string;
  name?: string | number;
  value?: number | string | ReadonlyArray<number | string> | null;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string;
  valueFormatter?: (value: number, name?: string) => string;
  dark: boolean;
}

function subscribeDarkMode(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', onStoreChange);
  window.addEventListener(DARK_MODE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(DARK_MODE_EVENT, onStoreChange);
  };
}

function getDarkModeSnapshot() {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
}

function formatTooltipValue(
  value: TooltipEntry['value'],
  name?: string,
  valueFormatter?: (value: number, name?: string) => string,
) {
  if (typeof value === 'number') {
    return valueFormatter ? valueFormatter(value, name) : value.toLocaleString();
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return value ?? '-';
}

const ChartTooltip = ({ active, payload, label, valueFormatter, dark }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dark ? '#1e293b' : 'white',
      border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontSize: 16,
      color: dark ? '#e2e8f0' : '#111827',
    }}>
      <p style={{ color: dark ? '#94a3b8' : '#4b5563', fontSize: 14, marginBottom: 8, fontWeight: 700 }}>{label ?? ''}</p>
      {payload.map((entry: TooltipEntry, i: number) => (
        <p
          key={`${entry.name ?? 'tooltip'}-${i}`}
          style={{ color: entry.color ?? entry.fill ?? (dark ? '#e2e8f0' : '#111827'), fontWeight: 800, margin: '4px 0' }}
        >
          {entry.name}: {formatTooltipValue(entry.value, String(entry.name ?? ''), valueFormatter)}
        </p>
      ))}
    </div>
  );
};

function isUp(changeRate: string): boolean {
  const n = parseFloat(changeRate);
  return !isNaN(n) && n >= 0;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(value);
}

function formatSignedNumber(value: number, maximumFractionDigits = 2) {
  return `${value > 0 ? '+' : ''}${formatNumber(value, maximumFractionDigits)}`;
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
  title: string; value: string; change?: string;
  icon: React.ElementType; up: boolean; isLoading: boolean; delay: number; dark: boolean;
}
function StatCard({ title, value, change, icon: Icon, up, isLoading, delay, dark }: CardProps) {
  return (
    <div
      className={`card-enter relative overflow-hidden p-6 rounded-2xl shadow-md border flex flex-col transition-colors duration-300 ${
        dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isLoading && (
        <>
          <div
            className={`card-loading-sheen pointer-events-none absolute inset-0 ${
              dark
                ? 'bg-[linear-gradient(110deg,transparent,rgba(148,163,184,0.08),transparent)]'
                : 'bg-[linear-gradient(110deg,transparent,rgba(59,130,246,0.09),transparent)]'
            }`}
          />
          <div className="pointer-events-none absolute inset-x-6 bottom-0 h-1 overflow-hidden rounded-full">
            <div className={`card-loading-bar h-full w-24 rounded-full ${dark ? 'bg-sky-300/80' : 'bg-sky-500/80'}`} />
          </div>
        </>
      )}

      <div className="relative flex justify-between items-center mb-4">
        <div className="flex flex-col gap-2">
          <h3 className={`text-lg font-bold transition-colors duration-300 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{title}</h3>
          {isLoading && (
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] ${
                dark ? 'bg-sky-400/10 text-sky-200' : 'bg-sky-50 text-sky-700'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dark ? 'bg-sky-300' : 'bg-sky-500'} animate-pulse`} />
              업데이트 중
            </span>
          )}
        </div>
        <Icon className={`h-6 w-6 transition-colors duration-300 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />
      </div>
      <ValueRoller
        value={value}
        className={`relative text-3xl font-extrabold tabular-nums transition-colors duration-300 ${dark ? 'text-white' : 'text-gray-900'} ${isLoading ? 'animate-pulse' : ''}`}
      />
      {change ? (
        <div className={`relative text-base font-bold mt-3 flex items-center ${up ? 'text-red-500' : 'text-blue-500'}`}>
          {up ? <ArrowUpRight className="h-5 w-5 mr-1" strokeWidth={3} /> : <ArrowDownRight className="h-5 w-5 mr-1" strokeWidth={3} />}
          {change}
        </div>
      ) : (
        <div className="mt-3 h-6" aria-hidden="true" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const stock = useStockData();
  const dark = useSyncExternalStore(subscribeDarkMode, getDarkModeSnapshot, () => false);
  const [currentTime, setCurrentTime] = useState('');
  const windowWidth = useWindowWidth();
  const isCompactChart = windowWidth !== null && windowWidth < 768;

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('ko-KR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(DARK_MODE_EVENT));
  };

  const axisStyle = { fontSize: 14, fill: dark ? '#64748b' : '#6b7280', fontWeight: 600 };
  const mobileAxisStyle = { fontSize: 12, fill: dark ? '#64748b' : '#6b7280', fontWeight: 600 };
  const gridStyle = { stroke: dark ? '#1e293b' : '#e5e7eb', strokeDasharray: '4 4' };
  const tooltipCursor = { stroke: dark ? '#475569' : '#cbd5e1', strokeDasharray: '4 4' };
  const chartHeight = isCompactChart ? MOBILE_CHART_HEIGHT : CHART_HEIGHT;

  const priceUp = isUp(stock.changeRate);
  const marketCapUp = isUp(stock.marketCapChange);
  const kospiUp = isUp(stock.kospi.changeRate);
  const kosdaqUp = isUp(stock.kosdaq.changeRate);
  const exchangeUp = isUp(stock.exchangeChange);

  const marketCapLabel = stock.marketCap !== '-'
    ? `${Number(stock.marketCap).toLocaleString()}억`
    : '-';
  const marketCapChangeLabel = stock.marketCapChange !== '-'
    ? `${marketCapUp ? '+' : ''}${Number(stock.marketCapChange).toLocaleString()}억`
    : '-';

  const cards = [
    {
      title: stock.isMarketOpen ? "위메이드 주가" : "위메이드 종가",
      value: stock.price !== '-' ? `${Number(stock.price).toLocaleString()}원` : '-',
      change: stock.changeRate !== '-' ? `${priceUp ? '+' : ''}${stock.changeRate}%` : '-',
      icon: Activity, up: priceUp,
    },
    {
      title: "시가총액",
      value: marketCapLabel,
      change: marketCapChangeLabel,
      icon: DollarSign, up: marketCapUp,
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
  const chartAxisStyle = isCompactChart ? mobileAxisStyle : axisStyle;
  const sharedXAxisProps = {
    dataKey: 'label',
    tick: chartAxisStyle,
    axisLine: false,
    tickLine: false,
    interval: 0 as const,
    height: isCompactChart ? 56 : 30,
    angle: isCompactChart ? -35 : 0,
    textAnchor: isCompactChart ? 'end' as const : 'middle' as const,
    tickMargin: isCompactChart ? 12 : 8,
  };
  const legendFormatter = (value: string) => (
    <span style={{ color: dark ? '#94a3b8' : '#4b5563', fontWeight: 700 }}>{value}</span>
  );

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
          {stock.isRefreshing && !stock.isLoading && (
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold border ${
                dark ? 'bg-slate-800 text-sky-200 border-slate-700' : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${dark ? 'bg-sky-300' : 'bg-sky-500'} animate-pulse`} />
              업데이트 중
            </span>
          )}
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
        <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '0ms' }}>
          <h3 className={chartTitle}>위메이드 투자자별 순매매 동향</h3>
          <p className={chartSub}>거래량(막대) · 기관/외국인 순매매(선)</p>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={investorTrendData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis {...sharedXAxisProps} />
              <YAxis
                yAxisId="volume"
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
                width={isCompactChart ? 40 : 48}
                tickFormatter={(value: number) => formatNumber(value, 0)}
              />
              <YAxis
                yAxisId="trade"
                orientation="right"
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
                width={isCompactChart ? 40 : 52}
                tickFormatter={(value: number) => formatSignedNumber(value, 0)}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    dark={dark}
                    valueFormatter={(value, name) => (
                      name === '거래량' ? formatNumber(value, 4) : formatSignedNumber(value, 4)
                    )}
                  />
                }
                cursor={tooltipCursor}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, lineHeight: '24px' }} formatter={legendFormatter} />
              <Bar yAxisId="volume" dataKey="거래량" fill="#94a3b8" fillOpacity={0.95} radius={[4, 4, 0, 0]} barSize={isCompactChart ? 14 : 18} />
              <Line yAxisId="trade" type="monotone" dataKey="기관순매매" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              <Line yAxisId="trade" type="monotone" dataKey="외국인순매매" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '100ms' }}>
          <h3 className={chartTitle}>게임TOP10지수 누적 등락률 (vs. 국내 증시)</h3>
          <p className={chartSub}>단위: %</p>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={gameTop10IndexData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis {...sharedXAxisProps} />
              <YAxis
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
                width={isCompactChart ? 40 : 48}
                tickFormatter={(value: number) => formatSignedNumber(value, 0)}
              />
              <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(value) => `${formatSignedNumber(value, 4)}%`} />} cursor={tooltipCursor} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, lineHeight: '24px' }} formatter={legendFormatter} />
              <Line type="monotone" dataKey="코스피" stroke="#64748b" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="코스닥" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="KRX 게임 TOP 10 지수" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '200ms' }}>
          <h3 className={chartTitle}>주요 게임업종 누적 등락률</h3>
          <p className={chartSub}>단위: %</p>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={majorGameIndustryData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis {...sharedXAxisProps} />
              <YAxis
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
                width={isCompactChart ? 40 : 48}
                tickFormatter={(value: number) => formatSignedNumber(value, 0)}
              />
              <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(value) => `${formatSignedNumber(value, 4)}%`} />} cursor={tooltipCursor} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, lineHeight: '24px' }} formatter={legendFormatter} />
              {majorIndustrySeries.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stroke={series.color}
                  strokeWidth={series.key === '위메이드' ? 3 : 2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`chart-enter ${chartCard}`} style={{ animationDelay: '300ms' }}>
          <h3 className={chartTitle}>KOSDAQ 업종별 누적 등락률(vs. 게임)</h3>
          <p className={chartSub}>단위: %</p>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={kosdaqSectorData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis {...sharedXAxisProps} />
              <YAxis
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
                width={isCompactChart ? 40 : 48}
                tickFormatter={(value: number) => formatSignedNumber(value, 0)}
              />
              <Tooltip content={<ChartTooltip dark={dark} valueFormatter={(value) => `${formatSignedNumber(value, 4)}%`} />} cursor={tooltipCursor} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, lineHeight: '24px' }} formatter={legendFormatter} />
              {kosdaqSectorSeries.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stroke={series.color}
                  strokeWidth={series.key === '게임' ? 3 : 2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className={`mt-10 text-center text-xs transition-colors duration-300 ${dark ? 'text-slate-700' : 'text-gray-400'}`}>Powered by 위메이드 송하민 대리</p>
    </div>
  );
}
