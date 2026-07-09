import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackLink, MoneyField, PrimaryButton, Screen, useScreenContentInsets } from '@/presentation/components/ui';
import { RootStackParamList } from '@/presentation/navigation/types';
import { parseAmountInput, showMessage } from '@/lib/confirm';
import { colors, fonts, formatRp } from '@/lib/format';
import { useSortuStore } from '@/store/sortuStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Allocate'>;
type R = RouteProp<RootStackParamList, 'Allocate'>;

export function AllocateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const unallocated = useSortuStore((s) => s.unallocated);
  const pockets = useSortuStore((s) => s.pockets);
  const allocate = useSortuStore((s) => s.allocate);
  const transfer = useSortuStore((s) => s.transfer);

  const [mode, setMode] = useState<'allocate' | 'transfer'>('allocate');
  const [toId, setToId] = useState(route.params?.pocketId ?? pockets[0]?.id ?? '');
  const [fromId, setFromId] = useState(pockets[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const contentInsets = useScreenContentInsets(40);

  const onSubmit = () => {
    const value = parseAmountInput(amount);
    if (!Number.isFinite(value) || value <= 0) {
      showMessage('Isi nominal');
      return;
    }
    if (mode === 'allocate') {
      if (!toId) {
        showMessage('Pilih kantong tujuan');
        return;
      }
      const result = allocate(toId, value);
      if (!result.ok) {
        showMessage('Gagal', result.error);
        return;
      }
    } else {
      const result = transfer(fromId, toId, value);
      if (!result.ok) {
        showMessage('Gagal', result.error);
        return;
      }
    }
    navigation.goBack();
  };

  return (
    <Screen scrollable>
      <ScrollView
        contentContainerStyle={[contentInsets, styles.content]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackLink onPress={() => navigation.goBack()} />
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Sortir uang</Text>
          <Text style={styles.sub}>Belum dialokasi: {formatRp(unallocated)}</Text>
        </Animated.View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mode === 'allocate' && styles.tabActive]}
            onPress={() => setMode('allocate')}
          >
            <Text style={[styles.tabText, mode === 'allocate' && styles.tabTextActive]}>
              Dari belum dialokasi
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'transfer' && styles.tabActive]}
            onPress={() => setMode('transfer')}
          >
            <Text style={[styles.tabText, mode === 'transfer' && styles.tabTextActive]}>
              Antar kantong
            </Text>
          </Pressable>
        </View>

        {mode === 'transfer' ? (
          <>
            <Text style={styles.label}>Dari</Text>
            <View style={styles.list}>
              {pockets.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.chip, fromId === p.id && styles.chipActive]}
                  onPress={() => setFromId(p.id)}
                >
                  <Text style={styles.chipText}>
                    {p.emoji} {p.name} · {formatRp(p.currentAmount)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Ke</Text>
        <View style={styles.list}>
          {pockets.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.chip, toId === p.id && styles.chipActive]}
              onPress={() => setToId(p.id)}
            >
              <Text style={styles.chipText}>
                {p.emoji} {p.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <MoneyField
          label="Nominal"
          value={amount}
          onChangeText={setAmount}
          placeholder="50.000"
        />

        <PrimaryButton label="Pindahkan ke kantong" onPress={onSubmit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {},
  title: {
    color: colors.text,
    fontSize: 30,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.5,
  },
  sub: {
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 18,
    fontFamily: fonts.bodyMedium,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    textAlign: 'center',
  },
  tabTextActive: { color: colors.accentSoft },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
    fontFamily: fonts.bodyMedium,
  },
  list: { gap: 8, marginBottom: 14 },
  chip: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: { color: colors.text, fontFamily: fonts.bodyMedium },
});
