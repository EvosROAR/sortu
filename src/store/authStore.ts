import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AuthUser } from '@/domain/entities/Auth';
import { authService } from '@/infrastructure/firebase/authService';
import { isFirebaseConfigured } from '@/infrastructure/firebase/config';

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Lewati login (mode lokal saja). */
  guestMode: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (v: boolean) => void;
  setGuestMode: (v: boolean) => void;
  logoutLocal: () => void;
  /** Keluar guest / reset session → tampilkan layar login. */
  requestLogin: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      guestMode: false,
      setUser: (user) =>
        set(
          user
            ? { user, isAuthenticated: true, isLoading: false, guestMode: false }
            : { user: null, isAuthenticated: false, isLoading: false },
        ),
      setLoading: (isLoading) => set({ isLoading }),
      setGuestMode: (guestMode) => {
        if (guestMode && isFirebaseConfigured()) {
          void authService.logout().catch(() => undefined);
        }
        set({ guestMode, isLoading: false, user: null, isAuthenticated: false });
      },
      logoutLocal: () =>
        set({ user: null, isAuthenticated: false, guestMode: false }),
      requestLogin: () => {
        void (async () => {
          set({ guestMode: false, user: null, isAuthenticated: false, isLoading: true });
          if (isFirebaseConfigured()) {
            try {
              await authService.logout();
            } catch {
              // ignore
            }
          }
          set({ isLoading: false });
        })();
      },
    }),
    {
      name: 'sortu-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        guestMode: s.guestMode,
      }),
      onRehydrateStorage: () => (state) => {
        // setelah hydrate, tetap tunggu AuthBootstrap set loading false
        state?.setLoading(true);
      },
    },
  ),
);
