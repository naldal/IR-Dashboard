import { NextResponse } from 'next/server';
import { routeErrorResponse } from '@/lib/routeError';

export async function GET() {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=2d',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      }
    );
    const data = await res.json();
    const meta = data.chart.result[0].meta;

    const rate = meta.regularMarketPrice as number;
    const prev = meta.chartPreviousClose as number;
    const change = rate - prev;

    return NextResponse.json({
      rate: rate.toFixed(2),
      change: change.toFixed(2),
    });
  } catch (error) {
    return routeErrorResponse('/api/stock/exchange', error);
  }
}
