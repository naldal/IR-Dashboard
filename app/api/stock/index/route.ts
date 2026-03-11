import { NextResponse } from 'next/server';
import { fetchKisApi } from '@/lib/kisToken';
import { routeErrorResponse } from '@/lib/routeError';

async function fetchIndex(code: string) {
  const res = await fetchKisApi(
    '/uapi/domestic-stock/v1/quotations/inquire-index-price',
    {
      fid_cond_mrkt_div_code: 'U',
      fid_input_iscd: code,
    },
    'FHPUP02100000'
  );
  return res.json();
}

export async function GET() {
  try {
    const [kospi, kosdaq] = await Promise.all([
      fetchIndex('0001'),
      fetchIndex('1001'),
    ]);

    return NextResponse.json({
      kospi: {
        value: kospi.output.bstp_nmix_prpr,
        changeRate: kospi.output.bstp_nmix_prdy_ctrt,
      },
      kosdaq: {
        value: kosdaq.output.bstp_nmix_prpr,
        changeRate: kosdaq.output.bstp_nmix_prdy_ctrt,
      },
    });
  } catch (error) {
    return routeErrorResponse('/api/stock/index', error);
  }
}
