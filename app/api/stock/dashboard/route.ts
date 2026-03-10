import { NextResponse } from 'next/server';
import { getKisConfig, getKisToken } from '@/lib/kisToken';
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

function getKSTTimeString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const h = String(kst.getUTCHours()).padStart(2, '0');
  const m = String(kst.getUTCMinutes()).padStart(2, '0');
  const s = String(kst.getUTCSeconds()).padStart(2, '0');
  return `${h}${m}${s}`;
}

async function fetchKisJson<T>(
  token: string,
  path: string,
  query: Record<string, string>,
  trId: string
): Promise<T> {
  const { appKey, appSecret, baseUrl } = getKisConfig();
  const url = `${baseUrl}${path}?${new URLSearchParams(query).toString()}`;

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: trId,
    },
    cache: 'no-store',
  });

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

async function fetchPriceSummary(token: string) {
  const data = await fetchKisJson<{ output?: Record<string, string> }>(
    token,
    '/uapi/domestic-stock/v1/quotations/inquire-price',
    {
      fid_cond_mrkt_div_code: 'J',
      fid_input_iscd: '112040',
    },
    'FHKST01010100'
  );

  const output = data.output ?? {};

  return {
    summary: {
      price: output.stck_prpr,
      change: output.prdy_vrss,
      changeRate: output.prdy_ctrt,
      marketCap: output.hts_avls,
      volume: output.acml_vol,
    },
    sharesOut: Number(output.lstn_stcn ?? 0),
    actualMarketCap: Number(output.hts_avls ?? 0),
  };
}

async function fetchIndexSummary(token: string) {
  const fetchIndex = async (code: string) =>
    fetchKisJson<{ output?: Record<string, string> }>(
      token,
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

async function fetchSectorData(token: string) {
  return Promise.all(
    STOCKS.map(async (stock) => {
      const data = await fetchKisJson<{ output?: Record<string, string> }>(
        token,
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

async function fetchInvestorData(token: string) {
  return Promise.all(
    STOCKS.map(async (stock) => {
      const data = await fetchKisJson<{ output?: Record<string, string>[] | Record<string, string> }>(
        token,
        '/uapi/domestic-stock/v1/quotations/inquire-investor',
        {
          fid_cond_mrkt_div_code: 'J',
          fid_input_iscd: stock.code,
        },
        'FHKST01010900'
      );

      const output = Array.isArray(data.output) ? data.output[0] : data.output;

      return {
        name: stock.name,
        외국인: Number(output?.frgn_ntby_tr_pbmn ?? 0),
        기관: Number(output?.orgn_ntby_tr_pbmn ?? 0),
        개인: Number(output?.prsn_ntby_tr_pbmn ?? 0),
      };
    })
  );
}

async function fetchChartData(token: string, sharesOut: number, actualMarketCap: number) {
  const allPoints: Record<string, string>[] = [];
  const kstNow = getKSTTimeString();
  let inputHour =
    kstNow > '153000' ? '153000' : kstNow < '090000' ? '090000' : kstNow;

  for (let i = 0; i < 15; i += 1) {
    const data = await fetchKisJson<{ output2?: Record<string, string>[] }>(
      token,
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

    const points = data.output2 ?? [];
    if (!points.length) break;

    allPoints.push(...points);

    const oldest = points[points.length - 1]?.stck_cntg_hour;
    if (!oldest || oldest <= '090000') break;
    inputHour = oldest;
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
  const result = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, { price, volume }]) => {
      cumulativeVolume += volume;

      return {
        time,
        시가총액: sharesOut > 0 ? Math.round((price * sharesOut) / 100_000_000) : 0,
        거래량: cumulativeVolume,
      };
    });

  if (result.length > 0 && actualMarketCap > 0) {
    result[result.length - 1].시가총액 = actualMarketCap;
  }

  return result;
}

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode');

  try {
    const token = await getKisToken();
    const [price, index] = await Promise.all([
      fetchPriceSummary(token),
      fetchIndexSummary(token),
    ]);

    if (mode === 'quick') {
      return NextResponse.json({
        price: price.summary,
        index,
      });
    }

    const [investor, sector, chart] = await Promise.all([
      fetchInvestorData(token),
      fetchSectorData(token),
      fetchChartData(token, price.sharesOut, price.actualMarketCap),
    ]);

    return NextResponse.json({
      price: price.summary,
      index,
      investor,
      sector,
      chart,
    });
  } catch (error) {
    return routeErrorResponse('/api/stock/dashboard', error);
  }
}
