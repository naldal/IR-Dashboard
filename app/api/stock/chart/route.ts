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

    // 최대 30구간으로 집계 (구간 내 거래량 합산, 마지막 가격으로 시총 계산)
    const groupSize = Math.max(1, Math.floor(sorted.length / 30));
    const result = [];
    for (let i = 0; i < sorted.length; i += groupSize) {
      const group = sorted.slice(i, i + groupSize);
      const last = group[group.length - 1];
      const volSum = group.reduce((sum, p) => sum + Number(p.cntg_vol), 0);
      result.push({
        time: `${last.stck_cntg_hour.slice(0, 2)}:${last.stck_cntg_hour.slice(2, 4)}`,
        시가총액:
          sharesOut > 0
            ? Math.round((Number(last.stck_prpr) * sharesOut) / 100_000_000)
            : 0,
        거래량: volSum,
      });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
