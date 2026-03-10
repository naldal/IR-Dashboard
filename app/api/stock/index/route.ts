import { NextResponse } from 'next/server';
import { getKisToken } from '@/lib/kisToken';

async function fetchIndex(token: string, code: string) {
  const res = await fetch(
    `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price` +
      `?fid_cond_mrkt_div_code=U&fid_input_iscd=${code}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: 'FHPUP02100000',
      },
      cache: 'no-store',
    }
  );
  return res.json();
}

export async function GET() {
  try {
    const token = await getKisToken();
    const [kospi, kosdaq] = await Promise.all([
      fetchIndex(token, '0001'),
      fetchIndex(token, '1001'),
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
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
