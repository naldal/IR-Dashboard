"use client";
import React from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Activity, BarChart3 } from 'lucide-react';

const mockSummary = {
  wemadePrice: "52,300",
  wemadeChange: "+2.4%",
  marketCap: "1조 7,650억",
  kospi: "2,745.21",
  kospiChange: "+0.5%",
  kosdaq: "872.15",
  kosdaqChange: "-1.2%",
  exchangeRate: "1,345.50",
  exchangeChange: "-3.0"
};

const mockChartData = [
  { time: '09:00', 시가총액: 17200, 거래량: 120000 },
  { time: '10:00', 시가총액: 17350, 거래량: 250000 },
  { time: '11:00', 시가총액: 17100, 거래량: 180000 },
  { time: '12:00', 시가총액: 17500, 거래량: 310000 },
  { time: '13:00', 시가총액: 17650, 거래량: 420000 },
];

const mockSectorData = [
  { name: '위메이드', 등락률: 2.4 },
  { name: '크래프톤', 등락률: 1.5 },
  { name: '엔씨소프트', 등락률: -0.8 },
  { name: '넷마블', 등락률: 0.2 },
  { name: '펄어비스', 등락률: -1.5 },
];

const mockInvestorData = [
  { name: '위메이드', 외국인: 1500, 기관: 800, 개인: -2300 },
  { name: '게임섹터', 외국인: 4500, 기관: -1200, 개인: -3300 },
];

// 축 글씨 크기를 11에서 14로 키웠습니다.
const AXIS_STYLE = { fontSize: 14, fill: '#6b7280', fontWeight: 600 }; 
const GRID_STYLE = { stroke: '#e5e7eb', strokeDasharray: '4 4' };
const CHART_HEIGHT = 280; // 차트가 덜 답답해 보이도록 높이도 약간 키웠습니다.

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

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-10 tracking-tight">📈 [Live] IR실 증시 Dashboard v1.1</h1>

      {/* 상단 카드뷰 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-10">
        {[
          { title: "위메이드 종가", value: `${mockSummary.wemadePrice}원`, change: mockSummary.wemadeChange, icon: Activity, up: true },
          { title: "시가총액", value: mockSummary.marketCap, change: "-", icon: DollarSign, up: true },
          { title: "KOSPI", value: mockSummary.kospi, change: mockSummary.kospiChange, icon: BarChart3, up: true },
          { title: "KOSDAQ", value: mockSummary.kosdaq, change: mockSummary.kosdaqChange, icon: BarChart3, up: false },
          { title: "원/달러 환율", value: mockSummary.exchangeRate, change: mockSummary.exchangeChange, icon: DollarSign, up: false },
        ].map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              {/* 카드 타이틀 글씨 크기 및 진하기 증가 */}
              <h3 className="text-lg font-bold text-gray-600">{card.title}</h3>
              <card.icon className="h-6 w-6 text-gray-400" />
            </div>
            {/* 카드 메인 수치 글씨 크기 대폭 증가 */}
            <div className="text-3xl font-extrabold text-gray-900">{card.value}</div>
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

        {/* 1. 시총 차트 */}
        <div className="bg-white p-7 rounded-2xl shadow-md border border-gray-200">
          {/* 차트 제목 글씨 크기 증가 */}
          <h3 className="text-xl font-bold text-gray-800 tracking-tight mb-2">1. 시가총액 추이</h3>
          <p className="text-sm font-medium text-gray-500 mb-6">단위: 억원</p>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
          <p className="text-sm font-medium text-gray-500 mb-6">단위: 주</p>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={mockChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="30%">
              <defs>
                <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
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
                cursor={{ fill: '#f3f4f6' }}
              />
              <Bar dataKey="거래량" fill="url(#gradVolume)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3. 등락률 (세로형 차트로 변경 - 렌더링 안정화) */}
        <div className="bg-white p-7 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 tracking-tight mb-2">3. 주요 게임사 등락률</h3>
          <p className="text-sm font-medium text-gray-500 mb-6">단위: %</p>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart
              data={mockSectorData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              barCategoryGap="25%"
            >
              <CartesianGrid {...GRID_STYLE} vertical={false} />
              <XAxis
                dataKey="name"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                dy={10}
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
              {/* radius 속성 제거: 깔끔한 직각 형태로 렌더링 오류 방지 */}
              <Bar dataKey="등락률">
                {mockSectorData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.등락률 >= 0 ? '#ef4444' : '#3b82f6'}
                    fillOpacity={0.9}
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
            <BarChart data={mockInvestorData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid {...GRID_STYLE} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} dy={10} />
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
              <Bar dataKey="외국인" stackId="a" fill="#ef4444" fillOpacity={0.9} />
              <Bar dataKey="기관" stackId="a" fill="#f59e0b" fillOpacity={0.9} />
              {/* stack 차트이므로 마지막 개인 막대에서 음수/양수에 따라 둥글기를 주면 모양이 깨질 수 있어 기본 형태로 유지 */}
              <Bar dataKey="개인" stackId="a" fill="#3b82f6" fillOpacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}