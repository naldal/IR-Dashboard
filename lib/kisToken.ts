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
    appKey,
    appSecret,
    baseUrl,
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

  if (!res.ok) throw new Error(`KIS token error: ${res.status}`);

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.token;
}
