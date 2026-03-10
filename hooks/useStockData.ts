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

  // 5초 폴링: 가격/지수/환율만 + 차트 마지막 포인트 시가총액 갱신
  const fetchQuick = useCallback(async () => {
    const [priceResult, indexResult, exchangeResult] = await Promise.allSettled([
      fetchJson<PriceResponse>('/api/stock/price'),
      fetchJson<IndexResponse>('/api/stock/index'),
      fetchJson<ExchangeResponse>('/api/stock/exchange'),
    ]);

    setState((prev) => {
      const price = priceResult.status === 'fulfilled' ? priceResult.value : null;
      const index = indexResult.status === 'fulfilled' ? indexResult.value : null;
      const exchange = exchangeResult.status === 'fulfilled' ? exchangeResult.value : null;
      const newMarketCap = Number(price?.marketCap ?? 0);
      const updatedChart =
        prev.chartHistory.length > 0 && newMarketCap > 0
          ? [
              ...prev.chartHistory.slice(0, -1),
              { ...prev.chartHistory[prev.chartHistory.length - 1], 시가총액: newMarketCap },
            ]
          : prev.chartHistory;
      const errorMessage = getErrorMessage([priceResult, indexResult, exchangeResult]);

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
          priceResult.status === 'fulfilled' ||
          indexResult.status === 'fulfilled' ||
          exchangeResult.status === 'fulfilled'
            ? new Date()
            : prev.lastUpdated,
        isLoading: false,
        error: errorMessage ?? prev.error,
      };
    });
  }, []);

  // 최초 + 5분마다: 전체 데이터 (섹터, 투자자, 차트 포함)
  const fetchFull = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, isChartLoading: true, error: null }));
    const [priceResult, indexResult, exchangeResult, investorResult, sectorResult, chartResult] =
      await Promise.allSettled([
        fetchJson<PriceResponse>('/api/stock/price'),
        fetchJson<IndexResponse>('/api/stock/index'),
        fetchJson<ExchangeResponse>('/api/stock/exchange'),
        fetchJson<InvestorEntry[]>('/api/stock/investor'),
        fetchJson<SectorEntry[]>('/api/stock/sector'),
        fetchJson<ChartPoint[]>('/api/stock/chart'),
      ]);

    setState((prev) => ({
      ...prev,
      price: priceResult.status === 'fulfilled' ? priceResult.value.price ?? prev.price : prev.price,
      priceChange: priceResult.status === 'fulfilled' ? priceResult.value.change ?? prev.priceChange : prev.priceChange,
      changeRate: priceResult.status === 'fulfilled' ? priceResult.value.changeRate ?? prev.changeRate : prev.changeRate,
      marketCap: priceResult.status === 'fulfilled' ? priceResult.value.marketCap ?? prev.marketCap : prev.marketCap,
      volume: priceResult.status === 'fulfilled' ? priceResult.value.volume ?? prev.volume : prev.volume,
      kospi: indexResult.status === 'fulfilled' ? indexResult.value.kospi ?? prev.kospi : prev.kospi,
      kosdaq: indexResult.status === 'fulfilled' ? indexResult.value.kosdaq ?? prev.kosdaq : prev.kosdaq,
      exchangeRate:
        exchangeResult.status === 'fulfilled' ? exchangeResult.value.rate ?? prev.exchangeRate : prev.exchangeRate,
      exchangeChange:
        exchangeResult.status === 'fulfilled' ? exchangeResult.value.change ?? prev.exchangeChange : prev.exchangeChange,
      sectorData:
        sectorResult.status === 'fulfilled' && Array.isArray(sectorResult.value)
          ? sectorResult.value
          : prev.sectorData,
      investorData:
        investorResult.status === 'fulfilled' && Array.isArray(investorResult.value)
          ? investorResult.value
          : prev.investorData,
      chartHistory:
        chartResult.status === 'fulfilled' && Array.isArray(chartResult.value)
          ? chartResult.value
          : prev.chartHistory,
      lastUpdated:
        priceResult.status === 'fulfilled' ||
        indexResult.status === 'fulfilled' ||
        exchangeResult.status === 'fulfilled' ||
        investorResult.status === 'fulfilled' ||
        sectorResult.status === 'fulfilled' ||
        chartResult.status === 'fulfilled'
          ? new Date()
          : prev.lastUpdated,
      isLoading: false,
      isChartLoading: false,
      error: getErrorMessage([priceResult, indexResult, exchangeResult, investorResult, sectorResult, chartResult]),
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
