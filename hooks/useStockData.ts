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

function checkMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return t >= 9 * 60 && t <= 15 * 60 + 30;
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
  isMarketOpen: checkMarketOpen(),
  error: null,
};

export function useStockData(): StockState {
  const [state, setState] = useState<Omit<StockState, 'refresh'>>(INITIAL_STATE);

  // 5초 폴링: 가격/지수/환율만 + 차트 마지막 포인트 시가총액 갱신
  const fetchQuick = useCallback(async () => {
    try {
      const [price, index, exchange] = await Promise.all([
        fetch('/api/stock/price').then((r) => r.json()),
        fetch('/api/stock/index').then((r) => r.json()),
        fetch('/api/stock/exchange').then((r) => r.json()),
      ]);

      setState((prev) => {
        const newMarketCap = Number(price.marketCap ?? 0);
        const updatedChart =
          prev.chartHistory.length > 0 && newMarketCap > 0
            ? [
                ...prev.chartHistory.slice(0, -1),
                { ...prev.chartHistory[prev.chartHistory.length - 1], 시가총액: newMarketCap },
              ]
            : prev.chartHistory;

        return {
          ...prev,
          price: price.price ?? prev.price,
          priceChange: price.change ?? prev.priceChange,
          changeRate: price.changeRate ?? prev.changeRate,
          marketCap: price.marketCap ?? prev.marketCap,
          volume: price.volume ?? prev.volume,
          kospi: index.kospi ?? prev.kospi,
          kosdaq: index.kosdaq ?? prev.kosdaq,
          exchangeRate: exchange.rate ?? prev.exchangeRate,
          exchangeChange: exchange.change ?? prev.exchangeChange,
          chartHistory: updatedChart,
          lastUpdated: new Date(),
          isLoading: false,
        };
      });
    } catch {
      // 실패 시 기존 데이터 유지
    }
  }, []);

  // 최초 + 5분마다: 전체 데이터 (섹터, 투자자, 차트 포함)
  const fetchFull = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, isChartLoading: true, error: null }));
    try {
      const [price, index, exchange, investor, sector, chart] = await Promise.all([
        fetch('/api/stock/price').then((r) => r.json()),
        fetch('/api/stock/index').then((r) => r.json()),
        fetch('/api/stock/exchange').then((r) => r.json()),
        fetch('/api/stock/investor').then((r) => r.json()),
        fetch('/api/stock/sector').then((r) => r.json()),
        fetch('/api/stock/chart').then((r) => r.json()),
      ]);

      setState((prev) => ({
        ...prev,
        price: price.price ?? '-',
        priceChange: price.change ?? '-',
        changeRate: price.changeRate ?? '-',
        marketCap: price.marketCap ?? '-',
        volume: price.volume ?? '-',
        kospi: index.kospi ?? { value: '-', changeRate: '-' },
        kosdaq: index.kosdaq ?? { value: '-', changeRate: '-' },
        exchangeRate: exchange.rate ?? '-',
        exchangeChange: exchange.change ?? '-',
        sectorData: Array.isArray(sector) ? sector : [],
        investorData: Array.isArray(investor) ? investor : [],
        chartHistory: Array.isArray(chart) ? chart : [],
        lastUpdated: new Date(),
        isLoading: false,
        isChartLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, isChartLoading: false, error: '데이터 로드 실패' }));
    }
  }, []);

  const refresh = useCallback(() => { fetchFull(); }, [fetchFull]);

  useEffect(() => {
    fetchFull();

    if (!checkMarketOpen()) return;

    const quickTimer = setInterval(fetchQuick, 10_000);        // 10초: 가격/지수/환율
    const fullTimer  = setInterval(fetchFull,  5 * 60_000);    // 5분: 전체 갱신

    return () => {
      clearInterval(quickTimer);
      clearInterval(fullTimer);
    };
  }, [fetchQuick, fetchFull]);

  return { ...state, refresh };
}
