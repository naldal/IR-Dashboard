import { NextResponse } from 'next/server';
import { getKisToken } from '@/lib/kisToken';

export async function GET() {
  try {
    const token = await getKisToken();
    const res = await fetch(
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

    const data = await res.json();
    const o = data.output;

    return NextResponse.json({
      price: o.stck_prpr,
      change: o.prdy_vrss,
      changeRate: o.prdy_ctrt,
      marketCap: o.hts_avls,
      volume: o.acml_vol,
    });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
