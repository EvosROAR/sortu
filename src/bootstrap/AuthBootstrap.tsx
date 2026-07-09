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
    const unsub = authService.onAuthStateChanged((user) => {
      if (useAuthStore.getState().guestMode) {
        setLoading(false);
        return;
      }
      setUser(user);
    });

    return unsub;
  }, [guestMode, setLoading, setUser]);

  return null;
}
