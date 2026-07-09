import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { authService } from '@/infrastructure/firebase/authService';
import { isFirebaseConfigured } from '@/infrastructure/firebase/config';
import { showMessage } from '@/lib/confirm';
import { colors, fonts } from '@/lib/format';
import { Field, PrimaryButton, Screen, useScreenContentInsets } from '@/presentation/components/ui';
import { useAuthStore } from '@/store/authStore';

type Mode = 'login' | 'register';

function mapAuthError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : '';
  if (code.includes('invalid-email')) return 'Email tidak valid';
  if (code.includes('user-not-found') || code.includes('invalid-credential')) {
    return 'Email atau password salah';
  }
  if (code.includes('wrong-password')) return 'Password salah';
  if (code.includes('email-already-in-use')) return 'Email sudah terdaftar';
  if (code.includes('weak-password')) return 'Password minimal 6 karakter';
  if (code.includes('network')) return 'Jaringan bermasalah. Coba lagi.';
  return 'Gagal autentikasi. Coba lagi.';
}

export function AuthScreen() {
  const setUser = useAuthStore((s) => s.setUser);
  const setGuestMode = useAuthStore((s) => s.setGuestMode);
  const configured = isFirebaseConfigured();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const contentInsets = useScreenContentInsets(32);

  const onSubmit = async () => {
    if (!configured) {
      showMessage('Firebase belum siap', 'Isi file .env dulu, lalu restart Expo.');
      return;
    }
    if (!email.trim() || !password) {
      showMessage('Lengkapi form', 'Email dan password wajib diisi.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      showMessage('Password terlalu pendek', 'Minimal 6 karakter.');
      return;
    }

    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await authService.login(email, password)
          : await authService.register(email, password, name || 'User');
      setUser(user);
    } catch (err) {
      showMessage('Gagal', mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scrollable>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[contentInsets, styles.content]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.brand}>Sortu</Text>
            <Text style={styles.tagline}>
              {mode === 'login' ? 'Masuk untuk sync cloud' : 'Buat akun Sortu'}
            </Text>
          </Animated.View>

          {!configured ? (
            <View style={styles.warn}>
              <Text style={styles.warnTitle}>Firebase belum dikonfigurasi</Text>
              <Text style={styles.warnBody}>
                Salin `.env.example` → `.env`, isi kredensial Firebase, lalu restart `npm start`.
                Sementara itu kamu bisa lanjut mode lokal.
              </Text>
            </View>
          ) : null}

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Masuk</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                Daftar
              </Text>
            </Pressable>
          </View>

          {mode === 'register' ? (
            <Field label="Nama" value={name} onChangeText={setName} placeholder="Nama kamu" />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="kamu@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimal 6 karakter"
            secureTextEntry
            autoComplete={mode === 'login' ? 'password' : 'new-password'}
          />

          <PrimaryButton
            label={busy ? 'Sebentar…' : mode === 'login' ? 'Masuk' : 'Daftar'}
            onPress={() => {
              void onSubmit();
            }}
            disabled={busy}
          />

          {busy ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
          ) : null}

          <Pressable
            onPress={() => setGuestMode(true)}
            style={({ pressed }) => [styles.guest, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.guestText}>Lanjut tanpa akun (lokal saja)</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {},
  brand: {
    fontSize: 40,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop: 6,
    marginBottom: 22,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  warn: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 201, 120, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(240, 201, 120, 0.28)',
  },
  warnTitle: {
    color: colors.warning,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  warnBody: {
    marginTop: 6,
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSolid,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  tabText: { color: colors.textDim, fontFamily: fonts.bodyMedium },
  tabTextActive: { color: colors.accentSoft, fontFamily: fonts.bodyBold },
  guest: { marginTop: 22, alignItems: 'center', padding: 12 },
  guestText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
