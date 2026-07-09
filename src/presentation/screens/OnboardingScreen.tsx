import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { markOnboardingDone } from '@/infrastructure/storage/onboardingStorage';
import { colors, fonts } from '@/lib/format';
import { PrimaryButton, Screen } from '@/presentation/components/ui';

type Slide = {
  key: string;
  emoji: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    emoji: '🗂️',
    title: 'Setiap rupiah punya kantong',
    body:
      'Sortu pakai sistem amplop digital. Uang masuk dulu, baru kamu tentukan mau dipakai untuk apa.',
  },
  {
    key: '2',
    emoji: '💸',
    title: 'Sortir sebelum dibelanjakan',
    body:
      'Catat pemasukan, lalu alokasikan ke kantong — listrik, Netflix, game, tabungan, dan lainnya.',
  },
  {
    key: '3',
    emoji: '✅',
    title: 'Bayar = kurangi kantong',
    body:
      'Saat tagihan dibayar, tandai di kantong. Saldo kantong berkurang — bukan sisa target yang naik.',
  },
];

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  onDone: () => void;
};

export function OnboardingScreen({ onDone }: Props) {
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = viewableItems[0]?.index;
      if (typeof next === 'number') setIndex(next);
    },
  ).current;

  const finish = () => {
    void markOnboardingDone().then(onDone);
  };

  const onNext = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(next);
  };

  return (
    <Screen padded={false}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>Sortu</Text>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>Lewati</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        renderItem={({ item, index: i }) => (
          <Animated.View
            entering={FadeInDown.delay(i * 40).duration(400)}
            style={[styles.slide, { width: SCREEN_W }]}
          >
            <View style={styles.emojiWrap}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </Animated.View>
        )}
        style={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton
          label={index >= SLIDES.length - 1 ? 'Mulai pakai Sortu' : 'Lanjut'}
          onPress={onNext}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  skip: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 16,
  },
  emojiWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 42,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.accent,
  },
});
