import { NextResponse } from 'next/server';
import { getKisToken } from '@/lib/kisToken';

function getKSTTimeString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const h = String(kst.getUTCHours()).padStart(2, '0');
  const m = String(kst.getUTCMinutes()).padStart(2, '0');
  const s = String(kst.getUTCSeconds()).padStart(2, '0');
  return `${h}${m}${s}`;
}

export async function GET() {
  try {
    const token = await getKisToken();

    // 상장주식수 조회 (시가총액 계산용)
    const priceRes = await fetch(
      `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price` +
        `?fid_cond_mrkt_div_code=J&fid_input_iscd=112040`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          appkey: process.env.KIS_APP_KEY!,
          appsecret: process.env.KIS_APP_SECRET!,
          tr_id: 'FHKST01010100',
        },
        cache: 'no-store',
      }
    );
    const priceData = await priceRes.json();
    const sharesOut = Number(priceData.output?.lstn_stcn ?? 0);

    // 분봉 데이터 페이지네이션 (현재/15:30 → 09:00 방향)
    const kstNow = getKSTTimeString();
    let inputHour =
      kstNow > '153000' ? '153000' : kstNow < '090000' ? '090000' : kstNow;

    const allPoints: Record<string, string>[] = [];

    for (let i = 0; i < 15; i++) {
      const res = await fetch(
        `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice` +
          `?FID_ETC_CLS_CODE=&FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=112040` +
          `&FID_INPUT_HOUR_1=${inputHour}&FID_PW_DATA_INCU_YN=Y`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            appkey: process.env.KIS_APP_KEY!,
            appsecret: process.env.KIS_APP_SECRET!,
            tr_id: 'FHKST03010200',
          },
          cache: 'no-store',
        }
      );
      const data = await res.json();
      const points: Record<string, string>[] = data.output2 ?? [];

      if (!points.length) break;
      allPoints.push(...points);

      const oldest = points[points.length - 1]?.stck_cntg_hour;
      if (!oldest || oldest <= '090000') break;
      inputHour = oldest;
    }

    // 장 시간 필터, 중복 제거, 시간순 정렬
    const seen = new Set<string>();
    const sorted = allPoints
      .filter((p) => {
        const t = p.stck_cntg_hour;
        if (!t || t < '090000' || t > '153000') return false;
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      })
      .reverse();

    // 30분 단위 버킷으로 집계 (09:00, 09:30, 10:00 ... 15:30)
    const buckets = new Map<string, { price: number; volSum: number }>();
    for (const p of sorted) {
      const hh = p.stck_cntg_hour.slice(0, 2);
      const mm = parseInt(p.stck_cntg_hour.slice(2, 4));
      const key = `${hh}:${mm < 30 ? '00' : '30'}`;
      const entry = buckets.get(key);
      if (entry) {
        entry.price = Number(p.stck_prpr); // 구간 내 마지막 가격
        entry.volSum += Number(p.cntg_vol);
      } else {
        buckets.set(key, { price: Number(p.stck_prpr), volSum: Number(p.cntg_vol) });
      }
    }

    let cumVol = 0;
    const result = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, { price, volSum }]) => {
        cumVol += volSum;
        return {
          time,
          시가총액: sharesOut > 0 ? Math.round((price * sharesOut) / 100_000_000) : 0,
          거래량: cumVol,
        };
      });

    // 마지막 포인트의 시가총액을 동시호가 체결 종가 기준으로 교정
    // (분봉 15:30 = 동시호가 직전 가격, price API hts_avls = 실제 종가 기준 시총)
    if (result.length > 0) {
      const actualMarketCap = Number(priceData.output?.hts_avls ?? 0);
      if (actualMarketCap > 0) {
        result[result.length - 1].시가총액 = actualMarketCap;
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
