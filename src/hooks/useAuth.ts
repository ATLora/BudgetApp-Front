import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api/auth';
import { tokenStore } from '@/services/api/client';
import type { LoginRequest, RegisterRequest } from '@/types/api';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  async function login(data: LoginRequest) {
    const tokens = await authApi.login(data);
    tokenStore.setAccessToken(tokens.accessToken);
    const profile = await authApi.me();
    setAuth(profile, tokens.accessToken, tokens.refreshToken);
    return profile;
  }

  async function register(data: RegisterRequest) {
    const tokens = await authApi.register(data);
    tokenStore.setAccessToken(tokens.accessToken);
    const profile = await authApi.me();
    setAuth(profile, tokens.accessToken, tokens.refreshToken);
    return profile;
  }

  async function logout() {
    try {
      await authApi.revoke();
    } finally {
      clearAuth();
    }
  }

  return { user, isAuthenticated, login, register, logout };
}
