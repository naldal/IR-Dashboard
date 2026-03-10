"use client";
import React from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Activity, BarChart3, RefreshCw } from 'lucide-react';
import { useStockData } from '@/hooks/useStockData';

// 축 글씨 크기를 11에서 14로 키웠습니다.
const AXIS_STYLE = { fontSize: 14, fill: '#6b7280', fontWeight: 600 };
const GRID_STYLE = { stroke: '#e5e7eb', strokeDasharray: '4 4' };
const CHART_HEIGHT = 280; // 차트가 덜 답답해 보이도록 높이도 약간 키웠습니다.

const GameTick = ({ x, y, payload }: any) => (
  <text
    x={x}
    y={y}
    textAnchor="end"
    transform={`rotate(-35, ${x}, ${y})`}
    fill={payload.value === '위메이드' ? '#111827' : '#6b7280'}
    fontSize={13}
    fontWeight={payload.value === '위메이드' ? 800 : 600}
  >
    {payload.value}
  </text>
);

const ChartTooltip = ({ active, payload, label, valueFormatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      fontSize: 16, // 툴팁 글씨 크기 확대
    }}>
      <p style={{ color: '#4b5563', fontSize: 14, marginBottom: 8, fontWeight: 700 }}>{label}</p>
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

export default function Dashboard() {
  const stock = useStockData();

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
      icon: Activity,
      up: priceUp,
    },
    {
      title: "시가총액",
      value: marketCapLabel,
      change: stock.priceChange !== '-' ? `${priceUp ? '+' : ''}${Number(stock.priceChange).toLocaleString()}원` : '-',
      icon: DollarSign,
      up: priceUp,
    },
    {
      title: "KOSPI",
      value: stock.kospi.value !== '-' ? Number(stock.kospi.value).toLocaleString() : '-',
      change: stock.kospi.changeRate !== '-' ? `${kospiUp ? '+' : ''}${stock.kospi.changeRate}%` : '-',
      icon: BarChart3,
      up: kospiUp,
    },
    {
      title: "KOSDAQ",
      value: stock.kosdaq.value !== '-' ? Number(stock.kosdaq.value).toLocaleString() : '-',
      change: stock.kosdaq.changeRate !== '-' ? `${kosdaqUp ? '+' : ''}${stock.kosdaq.changeRate}%` : '-',
      icon: BarChart3,
      up: kosdaqUp,
    },
    {
      title: "원/달러 환율",
      value: stock.exchangeRate !== '-' ? `${Number(stock.exchangeRate).toLocaleString()}원` : '-',
      change: stock.exchangeChange !== '-' ? `${exchangeUp ? '+' : ''}${stock.exchangeChange}` : '-',
      icon: DollarSign,
      up: exchangeUp,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">IR실 증시 Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          {stock.lastUpdated && (
            <p className="text-sm text-gray-400 font-medium">
              기준: {stock.lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          )}
          {stock.error && (
            <p className="text-sm text-red-500 font-medium">{stock.error}</p>
          )}
          <button
            onClick={stock.refresh}
            disabled={stock.isLoading || stock.isChartLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${stock.isLoading || stock.isChartLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 상단 카드뷰 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-10">
        {cards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              {/* 카드 타이틀 글씨 크기 및 진하기 증가 */}
              <h3 className="text-lg font-bold text-gray-600">{card.title}</h3>
              <card.icon className="h-6 w-6 text-gray-400" />
            </div>
            {/* 카드 메인 수치 글씨 크기 대폭 증가 */}
            <div className={`text-3xl font-extrabold text-gray-900 ${stock.isLoading ? 'animate-pulse' : ''}`}>
              {card.value}
            </div>
            {/* 등락률 글씨 크기 증가 */}
            <div className={`text-base font-bold mt-3 flex items-center ${card.up ? 'text-red-600' : 'text-blue-600'}`}>
              {card.up ? <ArrowUpRight className="h-5 w-5 mr-1" strokeWidth={3} /> : <ArrowDownRight className="h-5 w-5 mr-1" strokeWidth={3} />}
              {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* 2x2 차트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {stock.isChartLoading ? (
          <div className="col-span-2 text-center py-16 text-gray-400 font-medium">
            당일 차트 데이터 로딩 중...
          </div>
        ) : (
          <>
            {/* 1. 시총 차트 */}
            <div className="bg-white p-7 rounded-2xl shadow-md border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 tracking-tight mb-2">1. 시가총액 추이</h3>
              <p className="text-sm font-medium text-gray-500 mb-6">단위: 억원</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={stock.chartHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMarketCap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} vertical={false} />
                  <XAxis dataKey="time" tick={AXIS_STYLE} axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                    tickFormatter={v => v.toLocaleString()}
                  />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v: number) => `${v.toLocaleString()}억`} />}
                    cursor={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="시가총액"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fill="url(#gradMarketCap)"
                    dot={false}
                    activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 3, stroke: 'white' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 2. 거래량 차트 */}
            <div className="bg-white p-7 rounded-2xl shadow-md border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 tracking-tight mb-2">2. 거래량 추이</h3>
              <p className="text-sm font-medium text-gray-500 mb-6">단위: 주 (구간 합산)</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={stock.chartHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} vertical={false} />
                  <XAxis dataKey="time" tick={AXIS_STYLE} axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                    tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v}
                  />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v: number) => `${v.toLocaleString()}주`} />}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="거래량"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#gradVolume)"
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: 'white' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 3. 등락률 */}
            <div className="bg-white p-7 rounded-2xl shadow-md border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 tracking-tight mb-2">3. 주요 게임사 등락률</h3>
              <p className="text-sm font-medium text-gray-500 mb-6">단위: %</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart
                  data={stock.sectorData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid {...GRID_STYLE} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={<GameTick />}
                    axisLine={false}
                    tickLine={false}
                    height={65}
                  />
                  <YAxis
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                    tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`} />}
                    cursor={{ fill: '#f9fafb' }}
                  />
                  <Bar dataKey="등락률">
                    {stock.sectorData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.등락률 >= 0 ? '#ef4444' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 4. 투자자별 순매매 */}
            <div className="bg-white p-7 rounded-2xl shadow-md border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 tracking-tight mb-2">4. 투자자별 순매매 동향</h3>
              <p className="text-sm font-medium text-gray-500 mb-6">단위: 백만원</p>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={stock.investorData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid {...GRID_STYLE} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={<GameTick />}
                    axisLine={false}
                    tickLine={false}
                    height={65}
                  />
                  <YAxis
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                    tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}B` : v}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v: number) => `${v.toLocaleString()}백만`} />}
                    cursor={{ fill: '#f9fafb' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 14, paddingTop: 15 }}
                    formatter={(value) => <span style={{ color: '#4b5563', fontWeight: 700 }}>{value}</span>}
                  />
                  <Bar dataKey="외국인" fill="#ef4444" fillOpacity={0.9} />
                  <Bar dataKey="기관" fill="#f59e0b" fillOpacity={0.9} />
                  <Bar dataKey="개인" fill="#3b82f6" fillOpacity={0.9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
