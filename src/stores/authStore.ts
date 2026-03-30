import { create } from 'zustand';
import { tokenStore } from '@/services/api/client';
import type { UserProfileDto } from '@/types/api';

interface AuthState {
  user: UserProfileDto | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfileDto, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!tokenStore.getRefreshToken(), // restore session indicator on page load

  setAuth: (user, accessToken, refreshToken) => {
    tokenStore.setAccessToken(accessToken);
    tokenStore.setRefreshToken(refreshToken);
    tokenStore.setUserId(user.id);
    set({ user, isAuthenticated: true });
  },

  clearAuth: () => {
    tokenStore.clear();
    set({ user: null, isAuthenticated: false });
  },
}));
