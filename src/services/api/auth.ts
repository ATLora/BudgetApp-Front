import { client } from './client';
import type {
  AuthTokensDto,
  LoginRequest,
  RegisterRequest,
  UserProfileDto,
} from '@/types/api';

export const authApi = {
  register: (data: RegisterRequest) =>
    client.post<AuthTokensDto>('/api/v1/auth/register', data).then((r) => r.data),

  login: (data: LoginRequest) =>
    client.post<AuthTokensDto>('/api/v1/auth/login', data).then((r) => r.data),

  refresh: (userId: string, refreshToken: string) =>
    client.post<AuthTokensDto>('/api/v1/auth/refresh', { userId, refreshToken }).then((r) => r.data),

  revoke: () =>
    client.post('/api/v1/auth/revoke').then((r) => r.data),

  me: () =>
    client.get<UserProfileDto>('/api/v1/auth/me').then((r) => r.data),
};
