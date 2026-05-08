import { api, setAccessToken, clearAccessToken } from '@/lib/axios';
import type { User } from '@flowboard/shared';

interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  data: {
    user: User;
    accessToken: string;
    expiresIn: number;
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<User> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    setAccessToken(data.data.accessToken);
    return data.data.user;
  },

  async signup(payload: SignupPayload): Promise<{ message: string; userId: string }> {
    const { data } = await api.post<{ data: { message: string; userId: string } }>(
      '/auth/signup',
      payload
    );
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    clearAccessToken();
  },

  async refreshToken(): Promise<string> {
    const { data } = await api.post<{ data: { accessToken: string } }>('/auth/refresh');
    setAccessToken(data.data.accessToken);
    return data.data.accessToken;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<{ data: User }>('/auth/me');
    return data.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.patch(`/auth/reset-password/${token}`, { password });
  },

  async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token });
  },

  async resendVerification(email: string): Promise<void> {
    await api.post('/auth/resend-verification', { email });
  },
};
