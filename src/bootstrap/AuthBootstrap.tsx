import { useEffect } from 'react';

import { authService } from '@/infrastructure/firebase/authService';
import { isFirebaseConfigured } from '@/infrastructure/firebase/config';
import { useAuthStore } from '@/store/authStore';

/**
 * Dengarkan auth Firebase. Guest mode = tidak subscribe.
 * Saat user keluar dari guest (mau login), subscribe lagi.
 */
export function AuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const guestMode = useAuthStore((s) => s.guestMode);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    if (guestMode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setLoading(false);
    };

    const unsub = authService.onAuthStateChanged((user) => {
      if (useAuthStore.getState().guestMode) {
        finish();
        return;
      }
      setUser(user);
    });

    // Jangan stuck spinner jika auth callback terlewat (race rehydrate di web)
    const timer = setTimeout(finish, 4000);

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [guestMode, setLoading, setUser]);

  return null;
}
