import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { environment } from '../config/environment';
import { clearTokens, readTokens, writeTokens } from '../auth/session';

export const axiosInstance = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 100000,
});

const refreshClient = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 100000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens?.refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post('/api/v1/dashboard/auth/token/refresh', {
        refresh_token: tokens.refreshToken,
      })
      .then((response) => {
        const data = response.data as {
          access_token: string;
          refresh_token: string;
          session_id: string;
        };
        writeTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          sessionId: data.session_id,
        });
        return data.access_token;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = readTokens()?.accessToken;
      config.headers = config.headers || {};
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';
    const isAuthCall =
      url.includes('/api/v1/dashboard/auth/login') ||
      url.includes('/api/v1/dashboard/auth/token/refresh');

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${nextToken}`;
        return axiosInstance(original);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
        window.location.href = '/auth/sign-in';
      }
    }
    return Promise.reject(error);
  }
);
