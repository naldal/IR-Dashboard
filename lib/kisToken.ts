type KisTokenState = {
  cachedToken: { token: string; expiresAt: number } | null;
  pendingTokenPromise: Promise<string> | null;
  pendingForcedRefreshPromise: Promise<string> | null;
};

declare global {
  var __kisTokenState__: KisTokenState | undefined;
}

const kisTokenState =
  globalThis.__kisTokenState__ ??
  (globalThis.__kisTokenState__ = {
    cachedToken: null,
    pendingTokenPromise: null,
    pendingForcedRefreshPromise: null,
  });

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

async function requestKisToken() {
  const now = Date.now();
  const { appKey, appSecret, baseUrl } = getKisConfig();

  const res = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret,
    }),
    cache: 'no-store',
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

  const token = String(data.access_token ?? '');
  const expiresAt = now + Number(data.expires_in ?? 0) * 1000;

  if (!token) {
    throw new Error('KIS token error: empty access_token');
  }

  return {
    token,
    expiresAt,
  };
}

export function invalidateKisToken(token?: string) {
  if (!token || kisTokenState.cachedToken?.token === token) {
    kisTokenState.cachedToken = null;
  }
}

export async function getKisToken(options?: { forceRefresh?: boolean }): Promise<string> {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();
  if (!forceRefresh && kisTokenState.cachedToken && kisTokenState.cachedToken.expiresAt > now + 60_000) {
    return kisTokenState.cachedToken.token;
  }

  if (!forceRefresh && kisTokenState.pendingTokenPromise) {
    return kisTokenState.pendingTokenPromise;
  }

  if (!forceRefresh && kisTokenState.pendingForcedRefreshPromise) {
    return kisTokenState.pendingForcedRefreshPromise;
  }

  if (forceRefresh) {
    if (kisTokenState.pendingForcedRefreshPromise) {
      return kisTokenState.pendingForcedRefreshPromise;
    }

    kisTokenState.pendingForcedRefreshPromise = (async () => {
      const nextToken = await requestKisToken();
      kisTokenState.cachedToken = nextToken;
      return nextToken.token;
    })();

    try {
      return await kisTokenState.pendingForcedRefreshPromise;
    } finally {
      kisTokenState.pendingForcedRefreshPromise = null;
      kisTokenState.pendingTokenPromise = null;
    }
  }

  kisTokenState.pendingTokenPromise = (async () => {
    const nextToken = await requestKisToken();
    kisTokenState.cachedToken = nextToken;
    return nextToken.token;
  })();

  try {
    return await kisTokenState.pendingTokenPromise;
  } finally {
    kisTokenState.pendingTokenPromise = null;
  }
}

export async function fetchKisApi(
  path: string,
  query: Record<string, string>,
  trId: string,
  init: RequestInit = {}
): Promise<Response> {
  const { appKey, appSecret, baseUrl } = getKisConfig();
  const url = `${baseUrl}${path}?${new URLSearchParams(query).toString()}`;

  const execute = async (forceRefresh = false) => {
    const token = await getKisToken({ forceRefresh });
    const headers = new Headers(init.headers);

    headers.set('authorization', `Bearer ${token}`);
    headers.set('appkey', appKey);
    headers.set('appsecret', appSecret);
    headers.set('tr_id', trId);

    return {
      token,
      response: await fetch(url, {
        ...init,
        headers,
        cache: init.cache ?? 'no-store',
      }),
    };
  };

  const { token, response } = await execute();
  if (response.status !== 401) {
    return response;
  }

  invalidateKisToken(token);
  const retry = await execute(true);
  return retry.response;
}
