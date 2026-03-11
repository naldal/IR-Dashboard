import { NextResponse } from 'next/server';
import { fetchKisApi } from '@/lib/kisToken';
import { routeErrorResponse } from '@/lib/routeError';

const STOCKS = [
  { name: '위메이드', code: '112040' },
  { name: '위메이드맥스', code: '101730' },
  { name: '위메이드플레이', code: '123420' },
  { name: '크래프톤', code: '259960' },
  { name: '넷마블', code: '251270' },
  { name: '시프트업', code: '462870' },
  { name: '엔씨소프트', code: '036570' },
  { name: '펄어비스', code: '263750' },
  { name: '카카오게임즈', code: '293490' },
  { name: '넥슨게임즈', code: '225570' },
  { name: '컴투스', code: '078340' },
];

type ChartPoint = {
  time: string;
  시가총액: number | null;
  거래량: number | null;
};

type DashboardChartState = {
  lastSuccessfulChart: {
    dateKey: string;
    points: ChartPoint[];
  } | null;
};

declare global {
  var __dashboardChartState__: DashboardChartState | undefined;
}

const dashboardChartState =
  globalThis.__dashboardChartState__ ??
  (globalThis.__dashboardChartState__ = {
    lastSuccessfulChart: null,
  });

const CHART_BUCKETS = Array.from({ length: 14 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
});

function parseKisNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLatestInvestorOutput(
  output: Record<string, string>[] | Record<string, string> | undefined
) {
  if (!Array.isArray(output)) {
    return output;
  }

  return output.find((entry) =>
    [entry.frgn_ntby_tr_pbmn, entry.orgn_ntby_tr_pbmn, entry.prsn_ntby_tr_pbmn].some(
      (value) => typeof value === 'string' && value.trim() !== ''
  )
  ) ?? output[0];
}

function getKSTTimeParts() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const second = parts.find((part) => part.type === 'second')?.value ?? '00';

  return {
    dateKey: `${year}-${month}-${day}`,
    hour,
    minute,
    second,
    compact: `${hour}${minute}${second}`,
  };
}

function hasUsableChartData(points: ChartPoint[] | undefined): points is ChartPoint[] {
  return Array.isArray(points) && points.some((point) => point.시가총액 !== null || point.거래량 !== null);
}

function getCurrentChartBucketLabel() {
  const { hour, minute } = getKSTTimeParts();
  const totalMinutes = Number(hour) * 60 + Number(minute);

  if (totalMinutes < 9 * 60) {
    return null;
  }

  if (totalMinutes >= 15 * 60 + 30) {
    return CHART_BUCKETS[CHART_BUCKETS.length - 1];
  }

  const bucketMinutes = Math.floor(totalMinutes / 30) * 30;
  const bucketHour = String(Math.floor(bucketMinutes / 60)).padStart(2, '0');
  const bucketMinute = String(bucketMinutes % 60).padStart(2, '0');
  return `${bucketHour}:${bucketMinute}`;
}

async function fetchKisJson<T>(
  path: string,
  query: Record<string, string>,
  trId: string
): Promise<T> {
  const response = await fetchKisApi(path, query, trId);

  const text = await response.text();
  let data: Record<string, unknown> = {};

  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail = [
      typeof data.msg_cd === 'string' ? data.msg_cd : null,
      typeof data.msg1 === 'string' ? data.msg1 : null,
      !data.msg_cd && !data.msg1 && text ? text : null,
    ]
      .filter(Boolean)
      .join(' ');

    throw new Error(`KIS request error: ${response.status}${detail ? ` - ${detail}` : ''}`);
  }

  if (typeof data.rt_cd === 'string' && data.rt_cd !== '0') {
    const detail = [
      typeof data.msg_cd === 'string' ? data.msg_cd : null,
      typeof data.msg1 === 'string' ? data.msg1 : null,
    ]
      .filter(Boolean)
      .join(' ');

    throw new Error(`KIS request error: ${detail || data.rt_cd}`);
  }

  return data as T;
}

async function fetchPriceSummary() {
  const data = await fetchKisJson<{ output?: Record<string, string> }>(
    '/uapi/domestic-stock/v1/quotations/inquire-price',
    {
      fid_cond_mrkt_div_code: 'J',
      fid_input_iscd: '112040',
    },
    'FHKST01010100'
  );

  const output = data.output ?? {};
  const sharesOut = Number(output.lstn_stcn ?? 0);
  const priceChange = Number(output.prdy_vrss ?? 0);
  const marketCapChange =
    sharesOut > 0 && Number.isFinite(priceChange)
      ? String(Math.round((sharesOut * priceChange) / 100_000_000))
      : '-';

  return {
    summary: {
      price: output.stck_prpr,
      change: output.prdy_vrss,
      changeRate: output.prdy_ctrt,
      marketCap: output.hts_avls,
      marketCapChange,
      volume: output.acml_vol,
    },
    sharesOut,
    actualMarketCap: Number(output.hts_avls ?? 0),
  };
}

async function fetchIndexSummary() {
  const fetchIndex = async (code: string) =>
    fetchKisJson<{ output?: Record<string, string> }>(
      '/uapi/domestic-stock/v1/quotations/inquire-index-price',
      {
        fid_cond_mrkt_div_code: 'U',
        fid_input_iscd: code,
      },
      'FHPUP02100000'
    );

  const [kospi, kosdaq] = await Promise.all([fetchIndex('0001'), fetchIndex('1001')]);

  return {
    kospi: {
      value: kospi.output?.bstp_nmix_prpr ?? '-',
      changeRate: kospi.output?.bstp_nmix_prdy_ctrt ?? '-',
    },
    kosdaq: {
      value: kosdaq.output?.bstp_nmix_prpr ?? '-',
      changeRate: kosdaq.output?.bstp_nmix_prdy_ctrt ?? '-',
    },
  };
}

async function fetchSectorData() {
  return Promise.all(
    STOCKS.map(async (stock) => {
      const data = await fetchKisJson<{ output?: Record<string, string> }>(
        '/uapi/domestic-stock/v1/quotations/inquire-price',
        {
          fid_cond_mrkt_div_code: 'J',
          fid_input_iscd: stock.code,
        },
        'FHKST01010100'
      );

      return {
        name: stock.name,
        등락률: Number(data.output?.prdy_ctrt ?? 0),
      };
    })
  );
}

async function fetchInvestorData() {
  const results = await Promise.allSettled(
    STOCKS.map(async (stock) => {
      const data = await fetchKisJson<{ output?: Record<string, string>[] | Record<string, string> }>(
        '/uapi/domestic-stock/v1/quotations/inquire-investor',
        {
          fid_cond_mrkt_div_code: 'J',
          fid_input_iscd: stock.code,
        },
        'FHKST01010900'
      );

      const output = getLatestInvestorOutput(data.output);

      return {
        name: stock.name,
        외국인: parseKisNumber(output?.frgn_ntby_tr_pbmn),
        기관: parseKisNumber(output?.orgn_ntby_tr_pbmn),
        개인: parseKisNumber(output?.prsn_ntby_tr_pbmn),
      };
    })
  );

  return results.map((result, i) =>
    result.status === 'fulfilled'
      ? result.value
      : { name: STOCKS[i].name, 외국인: 0, 기관: 0, 개인: 0 }
  );
}

async function fetchChartData(sharesOut: number, actualMarketCap: number) {
  const { compact: kstNow } = getKSTTimeParts();
  const currentBucket = getCurrentChartBucketLabel();
  const fetchAllPoints = async (startHour: string) => {
    const points: Record<string, string>[] = [];
    let inputHour = startHour;

    for (let i = 0; i < 15; i += 1) {
      const data = await fetchKisJson<{ output2?: Record<string, string>[] }>(
        '/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice',
        {
          FID_ETC_CLS_CODE: '',
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: '112040',
          FID_INPUT_HOUR_1: inputHour,
          FID_PW_DATA_INCU_YN: 'Y',
        },
        'FHKST03010200'
      );

      const chunk = data.output2 ?? [];
      if (!chunk.length) break;

      points.push(...chunk);

      const oldest = chunk[chunk.length - 1]?.stck_cntg_hour;
      if (!oldest || oldest <= '090000') break;
      inputHour = oldest;
    }

    return points;
  };

  const initialHour =
    kstNow >= '153000' ? '153000' : kstNow < '090000' ? '090000' : kstNow;
  let allPoints = await fetchAllPoints(initialHour);

  if (!allPoints.length && kstNow >= '153000') {
    allPoints = await fetchAllPoints('152959');
  }

  const seen = new Set<string>();
  const sorted = allPoints
    .filter((point) => {
      const time = point.stck_cntg_hour;
      if (!time || time < '090000' || time > '153000') return false;
      if (seen.has(time)) return false;
      seen.add(time);
      return true;
    })
    .reverse();

  const buckets = new Map<string, { price: number; volume: number }>();

  for (const point of sorted) {
    const hh = point.stck_cntg_hour.slice(0, 2);
    const mm = Number(point.stck_cntg_hour.slice(2, 4));
    const key = `${hh}:${mm < 30 ? '00' : '30'}`;
    const existing = buckets.get(key);

    if (existing) {
      existing.price = Number(point.stck_prpr);
      existing.volume += Number(point.cntg_vol);
      continue;
    }

    buckets.set(key, {
      price: Number(point.stck_prpr),
      volume: Number(point.cntg_vol),
    });
  }

  let cumulativeVolume = 0;
  const result: ChartPoint[] = CHART_BUCKETS.map((time) => {
    const bucket = buckets.get(time);

    if (!bucket) {
      return {
        time,
        시가총액: null,
        거래량: null,
      };
    }

    cumulativeVolume += bucket.volume;

    const marketCap =
      sharesOut > 0 ? Math.round((bucket.price * sharesOut) / 100_000_000) : null;
    const isFutureBucket = currentBucket !== null && time > currentBucket;

    return {
      time,
      시가총액: isFutureBucket ? null : marketCap,
      거래량: isFutureBucket ? null : cumulativeVolume,
    };
  });

  if (currentBucket && actualMarketCap > 0) {
    const currentBucketEntry = result.find((entry) => entry.time === currentBucket);
    if (currentBucketEntry && currentBucketEntry.시가총액 !== null) {
      currentBucketEntry.시가총액 = actualMarketCap;
    }
  }

  return result;
}

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode');

  try {
    const [price, index] = await Promise.all([
      fetchPriceSummary(),
      fetchIndexSummary(),
    ]);

    if (mode === 'quick') {
      return NextResponse.json({
        price: price.summary,
        index,
      });
    }

    const [investorResult, sectorResult, chartResult] = await Promise.allSettled([
      fetchInvestorData(),
      fetchSectorData(),
      fetchChartData(price.sharesOut, price.actualMarketCap),
    ]);

    const { dateKey } = getKSTTimeParts();
    const chart =
      chartResult.status === 'fulfilled' && hasUsableChartData(chartResult.value)
        ? chartResult.value
        : dashboardChartState.lastSuccessfulChart?.dateKey === dateKey
          ? dashboardChartState.lastSuccessfulChart.points
          : [];

    if (hasUsableChartData(chart)) {
      dashboardChartState.lastSuccessfulChart = {
        dateKey,
        points: chart,
      };
    }

    return NextResponse.json({
      price: price.summary,
      index,
      investor: investorResult.status === 'fulfilled' ? investorResult.value : [],
      sector: sectorResult.status === 'fulfilled' ? sectorResult.value : [],
      chart,
    });
  } catch (error) {
    return routeErrorResponse('/api/stock/dashboard', error);
  }
}
