'use client';
import { useEffect, useState, useCallback } from 'react';

export interface ChartPoint {
  time: string;
  시가총액: number;
  거래량: number;
}

export interface SectorEntry {
  name: string;
  등락률: number;
}

export interface InvestorEntry {
  name: string;
  외국인: number;
  기관: number;
  개인: number;
}

export interface StockState {
  price: string;
  priceChange: string;
  changeRate: string;
  marketCap: string;
  volume: string;
  kospi: { value: string; changeRate: string };
  kosdaq: { value: string; changeRate: string };
  exchangeRate: string;
  exchangeChange: string;
  chartHistory: ChartPoint[];
  sectorData: SectorEntry[];
  investorData: InvestorEntry[];
  lastUpdated: Date | null;
  isLoading: boolean;
  isChartLoading: boolean;
  isMarketOpen: boolean;
  error: string | null;
  refresh: () => void;
}

interface PriceResponse {
  price?: string;
  change?: string;
  changeRate?: string;
  marketCap?: string;
  volume?: string;
  error?: string;
}

interface IndexResponse {
  kospi?: { value: string; changeRate: string };
  kosdaq?: { value: string; changeRate: string };
  error?: string;
}

interface ExchangeResponse {
  rate?: string;
  change?: string;
  error?: string;
}

interface DashboardQuickResponse {
  price?: PriceResponse;
  index?: IndexResponse;
  error?: string;
}

interface DashboardFullResponse extends DashboardQuickResponse {
  investor?: InvestorEntry[];
  sector?: SectorEntry[];
  chart?: ChartPoint[];
}

function checkMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return t >= 9 * 60 && t <= 15 * 60 + 30;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.error === 'string' && data.error.length > 0
        ? data.error
        : `${url} failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function getErrorMessage(results: PromiseSettledResult<unknown>[]) {
  const messages = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => (result.reason instanceof Error ? result.reason.message : '데이터 로드 실패'));

  const uniqueMessages = Array.from(new Set(messages));
  return uniqueMessages.length > 0 ? uniqueMessages.join(' / ') : null;
}

const INITIAL_STATE: Omit<StockState, 'refresh'> = {
  price: '-',
  priceChange: '-',
  changeRate: '-',
  marketCap: '-',
  volume: '-',
  kospi: { value: '-', changeRate: '-' },
  kosdaq: { value: '-', changeRate: '-' },
  exchangeRate: '-',
  exchangeChange: '-',
  chartHistory: [],
  sectorData: [],
  investorData: [],
  lastUpdated: null,
  isLoading: true,
  isChartLoading: true,
  isMarketOpen: false,
  error: null,
};

export function useStockData(): StockState {
  const [state, setState] = useState<Omit<StockState, 'refresh'>>(INITIAL_STATE);

  // 5초 폴링: KIS 대시보드 요약 + 환율
  const fetchQuick = useCallback(async () => {
    const [dashboardResult, exchangeResult] = await Promise.allSettled([
      fetchJson<DashboardQuickResponse>('/api/stock/dashboard?mode=quick'),
      fetchJson<ExchangeResponse>('/api/stock/exchange'),
    ]);

    setState((prev) => {
      const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
      const price = dashboard?.price ?? null;
      const index = dashboard?.index ?? null;
      const exchange = exchangeResult.status === 'fulfilled' ? exchangeResult.value : null;
      const newMarketCap = Number(price?.marketCap ?? 0);
      const updatedChart =
        prev.chartHistory.length > 0 && newMarketCap > 0
          ? [
              ...prev.chartHistory.slice(0, -1),
              { ...prev.chartHistory[prev.chartHistory.length - 1], 시가총액: newMarketCap },
            ]
          : prev.chartHistory;
      const errorMessage = getErrorMessage([dashboardResult, exchangeResult]);

      return {
        ...prev,
        price: price?.price ?? prev.price,
        priceChange: price?.change ?? prev.priceChange,
        changeRate: price?.changeRate ?? prev.changeRate,
        marketCap: price?.marketCap ?? prev.marketCap,
        volume: price?.volume ?? prev.volume,
        kospi: index?.kospi ?? prev.kospi,
        kosdaq: index?.kosdaq ?? prev.kosdaq,
        exchangeRate: exchange?.rate ?? prev.exchangeRate,
        exchangeChange: exchange?.change ?? prev.exchangeChange,
        chartHistory: updatedChart,
        lastUpdated:
          dashboardResult.status === 'fulfilled' ||
          exchangeResult.status === 'fulfilled'
            ? new Date()
            : prev.lastUpdated,
        isLoading: false,
        error: errorMessage ?? prev.error,
      };
    });
  }, []);

  // 최초 + 5분마다: 전체 데이터 (KIS 대시보드 + 환율)
  const fetchFull = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, isChartLoading: true, error: null }));
    const [dashboardResult, exchangeResult] =
      await Promise.allSettled([
        fetchJson<DashboardFullResponse>('/api/stock/dashboard'),
        fetchJson<ExchangeResponse>('/api/stock/exchange'),
      ]);

    const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
    const price = dashboard?.price ?? null;
    const index = dashboard?.index ?? null;

    setState((prev) => ({
      ...prev,
      price: price?.price ?? prev.price,
      priceChange: price?.change ?? prev.priceChange,
      changeRate: price?.changeRate ?? prev.changeRate,
      marketCap: price?.marketCap ?? prev.marketCap,
      volume: price?.volume ?? prev.volume,
      kospi: index?.kospi ?? prev.kospi,
      kosdaq: index?.kosdaq ?? prev.kosdaq,
      exchangeRate:
        exchangeResult.status === 'fulfilled' ? exchangeResult.value.rate ?? prev.exchangeRate : prev.exchangeRate,
      exchangeChange:
        exchangeResult.status === 'fulfilled' ? exchangeResult.value.change ?? prev.exchangeChange : prev.exchangeChange,
      sectorData:
        dashboardResult.status === 'fulfilled' && Array.isArray(dashboard?.sector)
          ? dashboard.sector
          : prev.sectorData,
      investorData:
        dashboardResult.status === 'fulfilled' && Array.isArray(dashboard?.investor)
          ? dashboard.investor
          : prev.investorData,
      chartHistory:
        dashboardResult.status === 'fulfilled' && Array.isArray(dashboard?.chart)
          ? dashboard.chart
          : prev.chartHistory,
      lastUpdated:
        dashboardResult.status === 'fulfilled' || exchangeResult.status === 'fulfilled'
          ? new Date()
          : prev.lastUpdated,
      isLoading: false,
      isChartLoading: false,
      error: getErrorMessage([dashboardResult, exchangeResult]),
    }));
  }, []);

  const refresh = useCallback(() => { fetchFull(); }, [fetchFull]);

  useEffect(() => {
    const syncMarketStatus = () => {
      const nextIsMarketOpen = checkMarketOpen();
      setState((prev) =>
        prev.isMarketOpen === nextIsMarketOpen ? prev : { ...prev, isMarketOpen: nextIsMarketOpen }
      );
    };

    syncMarketStatus();
    void fetchFull();

    const marketTimer = setInterval(syncMarketStatus, 60_000);
    const quickTimer = setInterval(() => {
      syncMarketStatus();
      if (checkMarketOpen()) {
        void fetchQuick();
      }
    }, 10_000);
    const fullTimer = setInterval(() => {
      syncMarketStatus();
      void fetchFull();
    }, 5 * 60_000);

    return () => {
      clearInterval(marketTimer);
      clearInterval(quickTimer);
      clearInterval(fullTimer);
    };
  }, [fetchQuick, fetchFull]);

  return { ...state, refresh };
}
