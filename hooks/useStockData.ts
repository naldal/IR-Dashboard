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
  error: string | null;
  refresh: () => void;
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
  error: null,
};

export function useStockData(): StockState {
  const [state, setState] = useState<Omit<StockState, 'refresh'>>(INITIAL_STATE);

  const fetchSummary = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [price, index, exchange, investor, sector] = await Promise.all([
        fetch('/api/stock/price').then((r) => r.json()),
        fetch('/api/stock/index').then((r) => r.json()),
        fetch('/api/stock/exchange').then((r) => r.json()),
        fetch('/api/stock/investor').then((r) => r.json()),
        fetch('/api/stock/sector').then((r) => r.json()),
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
        lastUpdated: new Date(),
        isLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, error: '데이터 로드 실패' }));
    }
  }, []);

  const fetchChart = useCallback(async () => {
    setState((prev) => ({ ...prev, isChartLoading: true }));
    try {
      const chart = await fetch('/api/stock/chart').then((r) => r.json());
      setState((prev) => ({
        ...prev,
        chartHistory: Array.isArray(chart) ? chart : [],
        isChartLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isChartLoading: false }));
    }
  }, []);

  const refresh = useCallback(() => {
    fetchSummary();
    fetchChart();
  }, [fetchSummary, fetchChart]);

  useEffect(() => {
    fetchSummary();
    fetchChart();
  }, [fetchSummary, fetchChart]);

  return { ...state, refresh };
}
