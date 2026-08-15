const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const SESSION_KEY = 'session_id';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface DashboardIdentity {
  accountId: string;
  sessionId: string;
  roles: string[];
  scopeType: 'GLOBAL' | 'CITY' | null;
  cityId: string | null;
  expiresAt: number;
}

export function readTokens(): SessionTokens | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!accessToken || !refreshToken || !sessionId) return null;
  return { accessToken, refreshToken, sessionId };
}

export function writeTokens(tokens: SessionTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(SESSION_KEY, tokens.sessionId);
  localStorage.setItem('token', tokens.accessToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('token');
}

export function decodeIdentity(accessToken: string): DashboardIdentity | null {
  try {
    const payloadPart = accessToken.split('.')[1];
    if (!payloadPart) return null;
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as {
      sub?: string;
      sid?: string;
      roles?: string[];
      scopeType?: 'GLOBAL' | 'CITY' | null;
      cityId?: string | null;
      exp?: number;
      app?: string;
    };
    if (payload.app !== 'DASHBOARD' || !payload.sub || !payload.sid) return null;
    return {
      accountId: payload.sub,
      sessionId: payload.sid,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      scopeType: payload.scopeType ?? null,
      cityId: payload.cityId ?? null,
      expiresAt: typeof payload.exp === 'number' ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}

export function currentIdentity(): DashboardIdentity | null {
  const tokens = readTokens();
  if (!tokens) return null;
  return decodeIdentity(tokens.accessToken);
}

export function hasSession(): boolean {
  return Boolean(readTokens()?.accessToken);
}
