import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  requestExactAlarmPermissionIfNeeded,
  upcomingDuePockets,
} from '@/application/DueReminderService';
import {
  BackupParseError,
  BackupExportCancelledError,
  exportBackupFile,
  ledgerFromBackup,
  pickAndParseBackup,
  summarizeBackup,
} from '@/application/BackupService';
import { saveLedger, type LedgerSnapshot } from '@/infrastructure/storage/ledgerStorage';
import { confirmAction, showMenu, showMessage } from '@/lib/confirm';
import { colors, fonts, formatRp } from '@/lib/format';
import { canRetrySync } from '@/lib/syncHint';
import { PocketCard } from '@/presentation/components/PocketCard';
import { PrimaryButton, Screen, useScreenContentInsets } from '@/presentation/components/ui';
import { RootStackParamList } from '@/presentation/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { useSortuStore } from '@/store/sortuStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const unallocated = useSortuStore((s) => s.unallocated);
  const pockets = useSortuStore((s) => s.pockets);
  const remindersEnabled = useSortuStore((s) => s.remindersEnabled);
  const setRemindersEnabled = useSortuStore((s) => s.setRemindersEnabled);

  const onRemindersToggle = (enabled: boolean) => {
    setRemindersEnabled(enabled);
    if (enabled && Platform.OS === 'android') {
      void requestExactAlarmPermissionIfNeeded();
    }
  };

  const user = useAuthStore((s) => s.user);
  const guestMode = useAuthStore((s) => s.guestMode);
  const requestLogin = useAuthStore((s) => s.requestLogin);
  const syncMessage = useSortuStore((s) => s.syncMessage);
  const requestSyncRetry = useSortuStore((s) => s.requestSyncRetry);
  const syncReady = useSortuStore((s) => s.syncReady);
  const scopeId = useSortuStore((s) => s.scopeId);
  const getSnapshot = useSortuStore((s) => s.getSnapshot);
  const hasLocalData = useSortuStore((s) => s.hasLocalData);
  const replaceLedger = useSortuStore((s) => s.replaceLedger);

  const dueSoon = useMemo(() => upcomingDuePockets(pockets, 3), [pockets]);
  const contentInsets = useScreenContentInsets(36);

  const commitImportedLedger = async (ledger: LedgerSnapshot) => {
    replaceLedger(ledger);
    if (scopeId !== 'pending') {
      await saveLedger(scopeId, ledger);
    }
    showMessage('Backup diimpor', 'Data kantong dan riwayat sudah dipulihkan.');
  };

  const onImportBackup = () => {
    void (async () => {
      try {
        const backup = await pickAndParseBackup();
        if (!backup) return;

        const ledger = ledgerFromBackup(backup);
        const summary = summarizeBackup(backup);

        if (hasLocalData()) {
          confirmAction(
            'Timpa data sekarang?',
            `Data di perangkat ini akan diganti dengan backup:\n\n${summary}\n\n` +
              `Diekspor: ${backup.exportedAt.slice(0, 10)}`,
            () => {
              void commitImportedLedger(ledger);
            },
            'Impor',
          );
          return;
        }

        await commitImportedLedger(ledger);
      } catch (e) {
        const message =
          e instanceof BackupParseError
            ? e.message
            : 'Tidak bisa membaca file backup. Coba lagi.';
        showMessage('Gagal impor', message);
      }
    })();
  };

  const onExportBackup = () => {
    const runExport = (mode: 'device' | 'share') => {
      void (async () => {
        try {
          await exportBackupFile(scopeId, getSnapshot(), mode);
          if (mode === 'device') {
            showMessage(
              'Backup tersimpan',
              'File JSON ada di folder yang kamu pilih (mis. Download). Buka Files untuk melihat.',
            );
          } else {
            showMessage('Backup siap dibagikan', 'Pilih Gmail, Drive, atau app lain di sheet berikutnya.');
          }
        } catch (e) {
          if (e instanceof BackupExportCancelledError) return;
          showMessage('Gagal', 'Tidak bisa mengekspor backup. Coba lagi.');
        }
      })();
    };

    if (Platform.OS === 'web') {
      runExport('device');
      return;
    }

    showMenu('Ekspor backup', 'Simpan langsung ke penyimpanan HP, atau bagikan lewat app lain.', [
      { label: 'Simpan ke HP', onPress: () => runExport('device'), role: 'confirm' },
      { label: 'Bagikan (Gmail, Drive, …)', onPress: () => runExport('share') },
    ]);
  };

  const onAccount = () => {
    if (guestMode || !user) {
      showMenu(
        'Akun & backup',
        'Login untuk sync cloud, atau kelola backup JSON lokal.',
        [
          { label: 'Ke login', onPress: () => requestLogin(), role: 'confirm' },
          { label: 'Ekspor backup', onPress: onExportBackup },
          { label: 'Impor backup', onPress: onImportBackup },
        ],
      );
      return;
    }

    showMenu(
      user.displayName || user.email,
      `${user.email}\n\nKeluar, ekspor, atau impor backup JSON.`,
      [
        {
          label: 'Keluar',
          onPress: () => {
            requestLogin();
            showMessage('Keluar', 'Kamu sudah keluar dari akun.');
          },
          role: 'danger',
        },
        { label: 'Ekspor backup', onPress: onExportBackup },
        { label: 'Impor backup', onPress: onImportBackup },
      ],
    );
  };

  return (
    <Screen scrollable>
      <ScrollView
        contentContainerStyle={[contentInsets, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(450)} style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>Sortu</Text>
            <Text style={styles.tagline}>Setiap rupiah ada kantongnya</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={onAccount}
              style={({ pressed }) => [styles.historyBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.historyBtnText}>{user ? 'Akun' : 'Masuk'}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('History')}
              style={({ pressed }) => [styles.historyBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.historyBtnText}>Riwayat</Text>
            </Pressable>
          </View>
        </Animated.View>

        {user ? (
          <View style={styles.syncRow}>
            <Text style={styles.syncHint} numberOfLines={2}>
              Sync aktif · {user.email}
              {syncMessage ? ` · ${syncMessage}` : ''}
            </Text>
            {canRetrySync(syncMessage) ? (
              <Pressable
                onPress={requestSyncRetry}
                disabled={!syncReady}
                style={({ pressed }) => [
                  styles.syncRetryBtn,
                  !syncReady && styles.syncRetryBtnDisabled,
                  pressed && syncReady && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.syncRetryText}>
                  {syncReady ? 'Coba lagi' : 'Sync…'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : guestMode ? (
          <Text style={styles.syncHint}>Mode lokal · belum sync cloud</Text>
        ) : null}

        {dueSoon.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(40)} style={styles.dueBanner}>
            <Text style={styles.dueTitle}>Jatuh tempo dekat</Text>
            {dueSoon.map(({ pocket, daysLeft }) => (
              <Pressable
                key={pocket.id}
                onPress={() =>
                  navigation.navigate('PocketDetail', { pocketId: pocket.id })
                }
              >
                <Text style={styles.dueLine}>
                  {pocket.emoji} {pocket.name} ·{' '}
                  {daysLeft === 0
                    ? 'hari ini'
                    : daysLeft === 1
                      ? 'besok'
                      : `${daysLeft} hari lagi`}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.hero}>
          <Text style={styles.heroEyebrow}>Siap disortir</Text>
          <Text style={styles.heroLabel}>Belum dialokasi</Text>
          <Text style={styles.heroAmount}>{formatRp(unallocated)}</Text>
          <Text style={styles.heroHint}>
            Uang di sini belum punya jatah. Alokasikan ke kantong sebelum dibelanjakan.
          </Text>
          <View style={styles.heroActions}>
            <View style={styles.heroBtn}>
              <PrimaryButton
                label="Pemasukan"
                compact
                onPress={() => navigation.navigate('Income')}
              />
            </View>
            <View style={styles.heroBtn}>
              <PrimaryButton
                label="Sortir"
                variant="ghost"
                compact
                onPress={() => navigation.navigate('Allocate')}
                disabled={unallocated <= 0 || pockets.length === 0}
              />
            </View>
          </View>
        </Animated.View>

        <View style={styles.reminderRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.reminderTitle}>Pengingat jatuh tempo</Text>
            <Text style={styles.reminderHint}>
              Notifikasi H-3, H-1 & hari H jam 09:00. Aktifkan "Alarm & pengingat" di Android. Buka app setelah jam 9 = cadangan.
            </Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={onRemindersToggle}
            trackColor={{ false: colors.border, true: colors.accentDeep }}
            thumbColor={remindersEnabled ? colors.accent : colors.textMuted}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Kantong kamu</Text>
          <Pressable onPress={() => navigation.navigate('PocketForm')}>
            <Text style={styles.link}>+ Baru</Text>
          </Pressable>
        </View>

        {pockets.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(120)} style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗂️</Text>
            <Text style={styles.emptyTitle}>Belum ada kantong</Text>
            <Text style={styles.hint}>
              Buat kantong untuk listrik, Netflix, game, dll. Lalu isi pelan-pelan sampai siap
              bayar.
            </Text>
            <PrimaryButton
              label="Buat kantong pertama"
              onPress={() => navigation.navigate('PocketForm')}
            />
          </Animated.View>
        ) : (
          pockets.map((p, i) => (
            <PocketCard
              key={p.id}
              pocket={p}
              index={i}
              onPress={() => navigation.navigate('PocketDetail', { pocketId: p.id })}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 16,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  syncRow: {
    marginTop: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncHint: {
    flex: 1,
    minWidth: 0,
    color: colors.textDim,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  syncRetryBtn: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  syncRetryBtnDisabled: {
    opacity: 0.5,
  },
  syncRetryText: {
    color: colors.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  brand: {
    fontSize: 38,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fonts.body,
  },
  historyBtn: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyBtnText: {
    color: colors.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  link: {
    color: colors.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  hint: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    fontFamily: fonts.body,
  },
  dueBanner: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(240, 201, 120, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(240, 201, 120, 0.28)',
    gap: 6,
  },
  dueTitle: {
    color: colors.warning,
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dueLine: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  hero: {
    marginTop: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroEyebrow: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyBold,
    marginBottom: 8,
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  heroAmount: {
    marginTop: 4,
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.5,
  },
  heroHint: {
    marginTop: 10,
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  heroBtn: { flex: 1, minWidth: 0 },
  reminderRow: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.bodyBold,
  },
  reminderHint: {
    marginTop: 4,
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.body,
  },
  sectionRow: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  empty: {
    padding: 22,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  emptyEmoji: { fontSize: 28, marginBottom: 4 },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    marginBottom: 2,
  },
});
