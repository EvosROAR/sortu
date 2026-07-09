import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackLink, Field, KeyboardScroll, MoneyField, PrimaryButton, Screen } from '@/presentation/components/ui';
import { RootStackParamList } from '@/presentation/navigation/types';
import { parseAmountInput, showMessage } from '@/lib/confirm';
import { colors, fonts } from '@/lib/format';
import { useSortuStore } from '@/store/sortuStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Income'>;

export function IncomeScreen() {
  const navigation = useNavigation<Nav>();
  const addIncome = useSortuStore((s) => s.addIncome);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('Gaji');

  const onSave = () => {
    const value = parseAmountInput(amount);
    if (!Number.isFinite(value) || value <= 0) {
      showMessage('Isi nominal pemasukan');
      return;
    }
    addIncome(value, note);
    navigation.goBack();
  };

  return (
    <Screen scrollable>
      <KeyboardScroll contentContainerStyle={styles.content} bottomPad={40}>
        <BackLink onPress={() => navigation.goBack()} />
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Pemasukan</Text>
          <Text style={styles.sub}>
            Masuk ke “Belum dialokasi”. Sortir ke kantong setelah ini.
          </Text>
        </Animated.View>

        <MoneyField
          label="Nominal"
          value={amount}
          onChangeText={setAmount}
          placeholder="5.000.000"
        />
        <Field
          label="Sumber / catatan"
          value={note}
          onChangeText={setNote}
          placeholder="Gaji, freelance, THR…"
        />

        <PrimaryButton label="Simpan pemasukan" onPress={onSave} />
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
});
