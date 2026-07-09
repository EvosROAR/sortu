import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  ALL_MONTHS,
  ALL_POCKETS,
  buildMonthOptions,
  buildPocketFilterOptions,
  filterHistoryEvents,
} from '@/application/historyFilters';
import { BackLink, Screen, useScreenContentInsets } from '@/presentation/components/ui';
import { RootStackParamList } from '@/presentation/navigation/types';
import { colors, fonts, formatRp } from '@/lib/format';
import { useSortuStore } from '@/store/sortuStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'History'>;

const TYPE_LABEL: Record<string, string> = {
  income: 'Pemasukan',
  allocation: 'Alokasi',
  transfer: 'Pindah',
  payment: 'Dikeluarkan',
};

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const events = useSortuStore((s) => s.events);
  const pockets = useSortuStore((s) => s.pockets);
  const contentInsets = useScreenContentInsets(40);

  const [monthKey, setMonthKey] = useState(ALL_MONTHS);
  const [pocketKey, setPocketKey] = useState(ALL_POCKETS);

  const monthOptions = useMemo(() => buildMonthOptions(events), [events]);
  const pocketOptions = useMemo(() => buildPocketFilterOptions(pockets), [pockets]);

  const filtered = useMemo(
    () => filterHistoryEvents(events, monthKey, pocketKey),
    [events, monthKey, pocketKey],
  );

  return (
    <Screen scrollable>
      <ScrollView
        contentContainerStyle={[contentInsets, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        <BackLink onPress={() => navigation.goBack()} />
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Riwayat</Text>
          <Text style={styles.sub}>Semua pergerakan uang di Sortu</Text>
        </Animated.View>

        {events.length > 0 ? (
          <View style={styles.filters}>
            <Text style={styles.filterLabel}>Bulan</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <FilterChip
                label="Semua"
                active={monthKey === ALL_MONTHS}
                onPress={() => setMonthKey(ALL_MONTHS)}
              />
              {monthOptions.map((m) => (
                <FilterChip
                  key={m.key}
                  label={m.label}
                  active={monthKey === m.key}
                  onPress={() => setMonthKey(m.key)}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>Kantong</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {pocketOptions.map((p) => (
                <FilterChip
                  key={p.key}
                  label={p.emoji ? `${p.emoji} ${p.label}` : p.label}
                  active={pocketKey === p.key}
                  onPress={() => setPocketKey(p.key)}
                />
              ))}
            </ScrollView>

            <Text style={styles.resultHint}>
              {filtered.length} dari {events.length} transaksi
            </Text>
          </View>
        ) : null}

        {events.length === 0 ? (
          <Text style={styles.hint}>Belum ada transaksi.</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.hint}>Tidak ada transaksi untuk filter ini.</Text>
        ) : (
          filtered.map((e, i) => (
            <Animated.View
              key={e.id}
              entering={FadeInDown.delay(40 + i * 35).springify()}
              style={styles.row}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {TYPE_LABEL[e.type] ?? e.type}
                </Text>
              </View>
              <View style={styles.detail}>
                <Text style={styles.note} numberOfLines={2}>
                  {e.note}
                </Text>
                <Text style={styles.date}>
                  {new Date(e.createdAt).toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={styles.amountCol}>
                <Text
                  style={[
                    styles.amount,
                    e.type === 'payment' ? styles.neg : styles.pos,
                  ]}
                >
                  {e.type === 'payment' ? '−' : '+'}
                  {formatRp(e.amount)}
                </Text>
              </View>
            </Animated.View>
          ))
        )}
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
    fontFamily: fonts.body,
  },
  filters: {
    marginBottom: 8,
    gap: 8,
  },
  filterLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 160,
  },
  chipActive: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.borderStrong,
  },
  chipText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.accentSoft,
    fontFamily: fonts.bodyBold,
  },
  resultHint: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: fonts.body,
    marginTop: 2,
    marginBottom: 4,
  },
  hint: { color: colors.textDim, fontFamily: fonts.body },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  badge: {
    width: 82,
    minHeight: 44,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  detail: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  note: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19 },
  date: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
    fontFamily: fonts.body,
  },
  amountCol: {
    width: 108,
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  amount: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  pos: { color: colors.accentSoft },
  neg: { color: colors.warning },
});
