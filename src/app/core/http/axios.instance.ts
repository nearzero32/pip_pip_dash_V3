import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { environment } from '../config/environment';
import { clearTokens, readTokens, writeTokens } from '../auth/session';
import { HTTP_CONFIG } from './http.config';
import { TokenRefreshResponse } from '../auth/auth.models';

export const axiosInstance = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: HTTP_CONFIG.NORMAL_TIMEOUT,
});

const refreshClient = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: HTTP_CONFIG.REFRESH_TIMEOUT,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<string | null> | null = null;
let isRedirecting = false;

function redirectToSignInOnce() {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
    if (!isRedirecting) {
      isRedirecting = true;
      window.location.href = '/auth/sign-in';
    }
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens?.refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post('/api/v1/dashboard/auth/token/refresh', {
        refresh_token: tokens.refreshToken,
      })
      .then((response) => {
        const data = response.data as TokenRefreshResponse;
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
      redirectToSignInOnce();
    }
    return Promise.reject(error);
  }
);
