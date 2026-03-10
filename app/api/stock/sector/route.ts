import { NextResponse } from 'next/server';
import { getKisToken } from '@/lib/kisToken';

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

export async function GET() {
  try {
    const token = await getKisToken();

    const results = await Promise.all(
      STOCKS.map(async (stock) => {
        const res = await fetch(
          `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price` +
            `?fid_cond_mrkt_div_code=J&fid_input_iscd=${stock.code}`,
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
        const data = await res.json();
        return {
          name: stock.name,
          등락률: Number(data.output.prdy_ctrt ?? 0),
        };
      })
    );

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
