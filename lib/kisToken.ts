let cachedToken: { token: string; expiresAt: number } | null = null;

export function getKisConfig() {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  const baseUrl = process.env.KIS_BASE_URL;

  const missing = [
    !appKey && 'KIS_APP_KEY',
    !appSecret && 'KIS_APP_SECRET',
    !baseUrl && 'KIS_BASE_URL',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing KIS environment variables: ${missing.join(', ')}`);
  }

  return {
    appKey: appKey!,
    appSecret: appSecret!,
    baseUrl: baseUrl!,
  };
}

export async function getKisToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const { appKey, appSecret, baseUrl } = getKisConfig();

  const res = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret,
    }),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};

  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const detail = [
      typeof data.msg_cd === 'string' ? data.msg_cd : null,
      typeof data.msg1 === 'string' ? data.msg1 : null,
      !data.msg_cd && !data.msg1 && text ? text : null,
    ]
      .filter(Boolean)
      .join(' ');

    throw new Error(`KIS token error: ${res.status}${detail ? ` - ${detail}` : ''}`);
  }

  cachedToken = {
    token: String(data.access_token ?? ''),
    expiresAt: now + Number(data.expires_in ?? 0) * 1000,
  };

  if (!cachedToken.token) {
    throw new Error('KIS token error: empty access_token');
  }

  return cachedToken.token;
}
