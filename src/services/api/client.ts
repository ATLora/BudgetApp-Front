import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthTokensDto, RefreshRequest } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// Key used to persist the refresh token across page reloads
const REFRESH_TOKEN_KEY = 'budget_refresh_token';
const USER_ID_KEY = 'budget_user_id';

// In-memory access token — never written to localStorage (XSS protection)
let _accessToken: string | null = null;

export const tokenStore = {
  getAccessToken: () => _accessToken,
  setAccessToken: (token: string | null) => {
    _accessToken = token;
  },
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string | null) => {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  getUserId: () => localStorage.getItem(USER_ID_KEY),
  setUserId: (id: string | null) => {
    if (id) localStorage.setItem(USER_ID_KEY, id);
    else localStorage.removeItem(USER_ID_KEY);
  },
  clear: () => {
    _accessToken = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
  },
};

export const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──────────────────────────────
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: transparent token refresh on 401 ───────────────
let _isRefreshing = false;
let _pendingRequests: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  _pendingRequests.forEach((cb) => cb(token));
  _pendingRequests = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    const refreshToken = tokenStore.getRefreshToken();
    const userId = tokenStore.getUserId();

    if (!refreshToken || !userId) {
      // No stored credentials — redirect to login
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (_isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve) => {
        _pendingRequests.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(client(originalRequest));
        });
      });
    }

    _isRefreshing = true;
    originalRequest._retry = true;

    try {
      const body: RefreshRequest = { userId, refreshToken };
      const { data } = await axios.post<AuthTokensDto>(`${BASE_URL}/api/v1/auth/refresh`, body);

      tokenStore.setAccessToken(data.accessToken);
      tokenStore.setRefreshToken(data.refreshToken);

      onRefreshed(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return client(originalRequest);
    } catch {
      tokenStore.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      _isRefreshing = false;
    }
  },
);
