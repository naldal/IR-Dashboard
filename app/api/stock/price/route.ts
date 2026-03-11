import { NextResponse } from 'next/server';
import { fetchKisApi } from '@/lib/kisToken';
import { routeErrorResponse } from '@/lib/routeError';

export async function GET() {
  try {
    const res = await fetchKisApi(
      '/uapi/domestic-stock/v1/quotations/inquire-price',
      {
        fid_cond_mrkt_div_code: 'J',
        fid_input_iscd: '112040',
      },
      'FHKST01010100'
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
  } catch (error) {
    return routeErrorResponse('/api/stock/price', error);
  }
}
