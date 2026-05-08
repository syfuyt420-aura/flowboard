import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@flowboard/shared';

interface AuthState {
  user: User | null;
  workspaceRole: UserRole | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  setUser: (user: User | null, role?: UserRole | null) => void;
  setWorkspaceRole: (role: UserRole | null) => void;
  setAuthenticated: (value: boolean) => void;
  completeOnboarding: () => void;
  logout: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      workspaceRole: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      setUser: (user, role) => set({
        user,
        isAuthenticated: !!user,
        ...(role !== undefined ? { workspaceRole: role } : {}),
      }),
      setWorkspaceRole: (role) => set({ workspaceRole: role }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      logout: () => set({ user: null, isAuthenticated: false, workspaceRole: null }),
      isAdmin: () => {
        const role = get().workspaceRole;
        return role === 'OWNER' || role === 'ADMIN' || role === 'PROJECT_MANAGER';
      },
    }),
    {
      name: 'fb-auth',
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);
