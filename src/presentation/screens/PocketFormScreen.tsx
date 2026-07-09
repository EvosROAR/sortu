import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackLink, Field, KeyboardScroll, MoneyField, PrimaryButton, Screen } from '@/presentation/components/ui';
import { RootStackParamList } from '@/presentation/navigation/types';
import { digitsOnly, formatAmountInput, parseAmountInput, showMessage } from '@/lib/confirm';
import { EMOJI_PRESETS, colors, fonts } from '@/lib/format';
import { useSortuStore } from '@/store/sortuStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PocketForm'>;
type R = RouteProp<RootStackParamList, 'PocketForm'>;

export function PocketFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const pocketId = route.params?.pocketId;
  const existing = useSortuStore((s) => s.pockets.find((p) => p.id === pocketId));
  const addPocket = useSortuStore((s) => s.addPocket);
  const updatePocket = useSortuStore((s) => s.updatePocket);

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🎯');
  const [target, setTarget] = useState(
    existing ? formatAmountInput(String(existing.targetAmount)) : '',
  );
  const [dueDay, setDueDay] = useState(
    existing?.dueDay != null ? String(existing.dueDay) : '',
  );
  const [note, setNote] = useState(existing?.note ?? '');

  const isEdit = useMemo(() => Boolean(existing), [existing]);

  const onSave = () => {
    if (!name.trim()) {
      showMessage('Nama wajib diisi');
      return;
    }
    const targetAmount = parseAmountInput(target);
    const resolvedTarget = Number.isFinite(targetAmount) ? targetAmount : 0;
    let due: number | null = null;
    if (dueDay.trim()) {
      const d = Number(dueDay);
      if (!Number.isInteger(d) || d < 1 || d > 28) {
        showMessage('Jatuh tempo harus angka 1–28 (atau kosongkan)');
        return;
      }
      due = d;
    }

    if (isEdit && pocketId) {
      const result = updatePocket({
        id: pocketId,
        name,
        emoji,
        targetAmount: resolvedTarget,
        dueDay: due,
        note,
      });
      if (!result.ok) {
        showMessage('Gagal', result.error);
        return;
      }
    } else {
      addPocket({ name, emoji, targetAmount: resolvedTarget, dueDay: due, note });
    }
    navigation.goBack();
  };

  return (
    <Screen scrollable>
      <KeyboardScroll contentContainerStyle={styles.content} bottomPad={48}>
        <BackLink onPress={() => navigation.goBack()} />
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>{isEdit ? 'Edit kantong' : 'Kantong baru'}</Text>
          <Text style={styles.sub}>
            Target = jatah yang ingin kamu kumpulkan. Isi pelan-pelan sampai penuh, baru keluarkan
            saat bayar.
          </Text>
        </Animated.View>

        <Field label="Nama" value={name} onChangeText={setName} placeholder="Netflix, Listrik…" />

        <Text style={styles.label}>Icon</Text>
        <View style={styles.emojiRow}>
          {EMOJI_PRESETS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[styles.emojiChip, emoji === e && styles.emojiChipActive]}
            >
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <MoneyField
          label="Target bulanan"
          value={target}
          onChangeText={setTarget}
          placeholder="120.000"
        />
        <Field
          label="Jatuh tempo (tanggal 1–28, opsional)"
          value={dueDay}
          onChangeText={(t) => setDueDay(digitsOnly(t).slice(0, 2))}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="12"
          maxLength={2}
        />
        <Field
          label="Catatan (opsional)"
          value={note}
          onChangeText={setNote}
          placeholder="No. pelanggan / email langganan"
        />

        <PrimaryButton label={isEdit ? 'Simpan' : 'Buat kantong'} onPress={onSave} />
      </KeyboardScroll>
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
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
    fontFamily: fonts.bodyMedium,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiChip: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  emoji: { fontSize: 22 },
});
