import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@flowboard/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'fb-auth',
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);
