import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  BackLink,
  KeyboardScroll,
  MoneyField,
  PrimaryButton,
  ProgressBar,
  Screen,
} from '@/presentation/components/ui';
import { MidtransSnapModal } from '@/presentation/components/MidtransSnapModal';
import {
  createSnapTransaction,
  openSnapOnWeb,
  SnapPayResult,
} from '@/application/MidtransPaymentService';
import { isFirebaseConfigured } from '@/infrastructure/firebase/config';
import {
  isMidtransConfigured,
  MIDTRANS_MIN_AMOUNT,
} from '@/infrastructure/midtrans/midtransConfig';
import { RootStackParamList } from '@/presentation/navigation/types';
import {
  confirmAction,
  formatAmountInput,
  parseAmountInput,
  showMessage,
} from '@/lib/confirm';
import { colors, dueLabel, fonts, formatRp, remainderLabel } from '@/lib/format';
import { useSortuStore } from '@/store/sortuStore';
import { useAuthStore } from '@/store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PocketDetail'>;
type R = RouteProp<RootStackParamList, 'PocketDetail'>;

const HISTORY_PREVIEW = 3;

export function PocketDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const pocket = useSortuStore((s) => s.pockets.find((p) => p.id === params.pocketId));
  const eventsForPocket = useSortuStore((s) => s.eventsForPocket);
  const markPaid = useSortuStore((s) => s.markPaid);
  const deletePocket = useSortuStore((s) => s.deletePocket);
  const allEvents = useSortuStore((s) => s.events);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const guestMode = useAuthStore((s) => s.guestMode);
  const [payInput, setPayInput] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [midtransLoading, setMidtransLoading] = useState(false);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [snapOrderId, setSnapOrderId] = useState('');
  const [snapVisible, setSnapVisible] = useState(false);
  const [midtransAmount, setMidtransAmount] = useState<number | null>(null);

  const midtransReady =
    isFirebaseConfigured() && isMidtransConfigured() && isAuthenticated && !guestMode;

  const events = useMemo(
    () => (pocket ? eventsForPocket(pocket.id) : []),
    [pocket, eventsForPocket],
  );
  const visibleEvents = showAllHistory ? events : events.slice(0, HISTORY_PREVIEW);

  if (!pocket) {
    return (
      <Screen>
        <Text style={styles.missing}>Kantong tidak ditemukan</Text>
        <PrimaryButton label="Kembali" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const left = Math.max(0, pocket.targetAmount - pocket.currentAmount);
  const ready = pocket.targetAmount > 0 && left === 0 && pocket.currentAmount > 0;

  const onPay = () => {
    const amount = payInput.trim()
      ? parseAmountInput(payInput)
      : pocket.currentAmount;

    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage('Nominal tidak valid', 'Isi nominal atau pastikan kantong punya saldo.');
      return;
    }
    if (amount > pocket.currentAmount) {
      showMessage('Saldo tidak cukup', `Isi kantong hanya ${formatRp(pocket.currentAmount)}.`);
      return;
    }

    confirmAction(
      'Keluarkan dari kantong?',
      `${formatRp(amount)} akan keluar dari kantong "${pocket.name}". Ini menandai uang sudah dipakai bayar — bukan mengurangi target.`,
      () => {
        const result = markPaid(pocket.id, amount);
        if (!result.ok) {
          showMessage('Gagal', result.error);
          return;
        }
        setPayInput('');
        showMessage('Tercatat', 'Uang sudah dikeluarkan dari kantong.');
      },
      'Ya, keluarkan',
    );
  };

  const onDelete = () => {
    confirmAction(
      'Hapus kantong?',
      'Saldo di kantong ini akan dikembalikan ke “Belum dialokasi”.',
      () => {
        deletePocket(pocket.id);
        navigation.goBack();
      },
      'Hapus',
    );
  };

  const resolvePayAmount = () => {
    const amount = payInput.trim() ? parseAmountInput(payInput) : pocket.currentAmount;
    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage('Nominal tidak valid', 'Isi nominal atau pastikan kantong punya saldo.');
      return null;
    }
    if (amount > pocket.currentAmount) {
      showMessage('Saldo tidak cukup', `Isi kantong hanya ${formatRp(pocket.currentAmount)}.`);
      return null;
    }
    return amount;
  };

  const applyMidtransPayment = (orderId: string, amount: number) => {
    const alreadyRecorded = allEvents.some((e) => e.note?.includes(orderId));
    if (alreadyRecorded) {
      showMessage('Sudah tercatat', 'Pembayaran ini sudah masuk riwayat.');
      return;
    }

    const result = markPaid(pocket.id, amount, `Midtrans · ${orderId}`);
    if (!result.ok) {
      showMessage('Gagal', result.error);
      return;
    }
    setPayInput('');
    showMessage('Pembayaran berhasil', 'Saldo kantong sudah dikurangi (sandbox Midtrans).');
  };

  const handleSnapResult = (result: SnapPayResult, amount: number) => {
    if (result.status === 'success') {
      applyMidtransPayment(result.orderId, amount);
      return;
    }
    if (result.status === 'pending') {
      showMessage(
        'Menunggu konfirmasi',
        'Pembayaran masih pending. Cek riwayat Midtrans atau coba lagi nanti.',
      );
      return;
    }
    if (result.status === 'error') {
      showMessage('Pembayaran gagal', result.message);
    }
  };

  const onMidtransPay = async () => {
    if (!midtransReady) {
      showMessage(
        'Midtrans belum siap',
        guestMode || !isAuthenticated
          ? 'Login dulu (bukan mode guest) untuk bayar via Midtrans sandbox.'
          : 'Isi EXPO_PUBLIC_MIDTRANS_CLIENT_KEY + EXPO_PUBLIC_MIDTRANS_API_URL di .env (lihat docs/VERCEL_SETUP.md).',
      );
      return;
    }

    const amount = resolvePayAmount();
    if (amount == null) return;
    if (amount < MIDTRANS_MIN_AMOUNT) {
      showMessage(
        'Nominal terlalu kecil',
        `Midtrans sandbox minimal ${formatRp(MIDTRANS_MIN_AMOUNT)}.`,
      );
      return;
    }

    setMidtransLoading(true);
    try {
      const { snapToken: token, orderId } = await createSnapTransaction({
        pocketId: pocket.id,
        pocketName: pocket.name,
        amount,
      });

      if (Platform.OS === 'web') {
        setMidtransAmount(amount);
        const result = await openSnapOnWeb(token, orderId);
        handleSnapResult(result, amount);
        setMidtransAmount(null);
        return;
      }

      setMidtransAmount(amount);
      setSnapToken(token);
      setSnapOrderId(orderId);
      setSnapVisible(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal membuat transaksi Midtrans.';
      showMessage('Midtrans', message);
    } finally {
      setMidtransLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <KeyboardScroll contentContainerStyle={styles.content} bottomPad={48}>
        <BackLink onPress={() => navigation.goBack()} />

        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>{pocket.emoji}</Text>
          </View>
          <Text style={styles.title}>{pocket.name}</Text>
          <Text style={styles.due}>{dueLabel(pocket.dueDay)}</Text>
          {pocket.note ? <Text style={styles.note}>{pocket.note}</Text> : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80)} style={styles.stats}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Tersisih di kantong</Text>
            <Text style={styles.statValue}>{formatRp(pocket.currentAmount)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Target</Text>
            <Text style={styles.statValueMuted}>{formatRp(pocket.targetAmount)}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120)} style={styles.progressCard}>
          <ProgressBar
            current={pocket.currentAmount}
            target={pocket.targetAmount}
            delay={100}
          />
          <Text style={[styles.remainder, ready && styles.remainderReady]}>
            {ready
              ? 'Target terpenuhi — siap dikeluarkan saat bayar sungguhan'
              : remainderLabel(pocket.currentAmount, pocket.targetAmount)}
          </Text>
        </Animated.View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <PrimaryButton
              label="Isi"
              compact
              onPress={() => navigation.navigate('Allocate', { pocketId: pocket.id })}
            />
          </View>
          <View style={styles.flex}>
            <PrimaryButton
              label="Edit"
              variant="ghost"
              compact
              onPress={() => navigation.navigate('PocketForm', { pocketId: pocket.id })}
            />
          </View>
        </View>

        <View style={styles.payCard}>
          <Text style={styles.section}>Keluarkan uang (saat sudah bayar)</Text>
          <Text style={styles.hint}>
            Tombol ini menurunkan isi kantong — bukan menghitung “sisa tagihan”. Kalau baru isi
            Rp10rb ke target Rp100rb, sisa kurang Rp90rb. Jangan diklik kecuali uang benar-benar
            sudah dipakai bayar.
          </Text>
          <MoneyField
            label="Nominal (kosongkan = keluarkan semua isi kantong)"
            value={payInput}
            onChangeText={setPayInput}
            placeholder={formatAmountInput(String(pocket.currentAmount)) || '0'}
          />
          <PrimaryButton
            label="Keluarkan dari kantong"
            variant="soft"
            onPress={onPay}
            disabled={pocket.currentAmount <= 0}
          />
          <View style={styles.midtransBlock}>
            <PrimaryButton
              label={midtransLoading ? 'Menyiapkan…' : 'Bayar via Midtrans (sandbox)'}
              onPress={onMidtransPay}
              disabled={pocket.currentAmount <= 0 || midtransLoading}
            />
            {midtransLoading ? (
              <ActivityIndicator color={colors.accentSoft} style={styles.midtransSpinner} />
            ) : null}
            <Text style={styles.midtransHint}>
              Simulasi bayar sungguhan lewat Midtrans sandbox. Setelah sukses, saldo kantong
              berkurang otomatis. Butuh login + setup Midtrans di `.env`.
            </Text>
          </View>
        </View>

        <MidtransSnapModal
          visible={snapVisible}
          snapToken={snapToken}
          orderId={snapOrderId}
          onDismiss={() => {
            setSnapVisible(false);
            setSnapToken(null);
            setMidtransAmount(null);
          }}
          onResult={(result) => {
            if (midtransAmount != null) {
              handleSnapResult(result, midtransAmount);
            }
            setMidtransAmount(null);
          }}
        />

        <Text style={[styles.section, { marginTop: 28 }]}>Riwayat kantong</Text>
        {events.length === 0 ? (
          <Text style={styles.hint}>Belum ada aktivitas.</Text>
        ) : (
          <>
            {visibleEvents.map((e, i) => (
              <Animated.View
                key={e.id}
                entering={FadeInDown.delay(40 + i * 30)}
                style={styles.event}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.eventNote} numberOfLines={1}>
                    {e.note ?? e.type}
                  </Text>
                  <Text style={styles.eventDate}>
                    {new Date(e.createdAt).toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.eventAmount,
                    e.type === 'payment' ? styles.neg : styles.pos,
                  ]}
                >
                  {e.type === 'payment' ? '−' : '+'}
                  {formatRp(e.amount)}
                </Text>
              </Animated.View>
            ))}

            {events.length > HISTORY_PREVIEW ? (
              <Pressable
                onPress={() => setShowAllHistory((v) => !v)}
                style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.moreBtnText}>
                  {showAllHistory
                    ? 'Sembunyikan'
                    : `Lihat semua (${events.length})`}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}

        <View style={{ height: 20 }} />
        <PrimaryButton label="Hapus kantong" variant="danger" onPress={onDelete} />
      </KeyboardScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%' },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroEmoji: { fontSize: 30 },
  title: {
    color: colors.text,
    fontSize: 32,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.6,
  },
  due: {
    marginTop: 6,
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
  },
  note: {
    marginTop: 8,
    color: colors.textDim,
    fontStyle: 'italic',
    fontFamily: fonts.body,
  },
  stats: {
    marginTop: 22,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  statBlock: { flex: 1, minWidth: 0 },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    marginBottom: 4,
  },
  statValue: {
    color: colors.accentSoft,
    fontSize: 18,
    fontFamily: fonts.display,
  },
  statValueMuted: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.display,
  },
  progressCard: {
    marginTop: 12,
    marginBottom: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  remainder: {
    marginTop: 12,
    color: colors.warning,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  remainderReady: { color: colors.accentSoft },
  row: { flexDirection: 'row', gap: 10, marginBottom: 8, width: '100%' },
  flex: { flex: 1, minWidth: 0 },
  payCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(240, 201, 120, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(240, 201, 120, 0.2)',
    width: '100%',
    overflow: 'hidden',
  },
  section: {
    marginBottom: 8,
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hint: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 19,
    fontFamily: fonts.body,
  },
  midtransBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 201, 120, 0.15)',
    gap: 8,
  },
  midtransHint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.body,
  },
  midtransSpinner: { marginTop: 4 },
  event: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
    width: '100%',
  },
  eventNote: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    flexShrink: 1,
  },
  eventDate: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 3,
    fontFamily: fonts.body,
  },
  eventAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    flexShrink: 0,
  },
  moreBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  moreBtnText: {
    color: colors.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pos: { color: colors.accentSoft },
  neg: { color: colors.warning },
  missing: { color: colors.text, marginBottom: 16, marginTop: 20, fontFamily: fonts.body },
});
