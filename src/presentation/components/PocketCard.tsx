import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ProgressBar } from '@/presentation/components/ui';
import { Pocket } from '@/domain/entities/Pocket';
import { colors, dueLabel, fonts, formatRp, remainderLabel } from '@/lib/format';

const AnimPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  pocket: Pocket;
  index?: number;
  onPress: () => void;
};

export function PocketCard({ pocket, index = 0, onPress }: Props) {
  const scale = useSharedValue(1);
  const left = Math.max(0, pocket.targetAmount - pocket.currentAmount);
  const ready = pocket.targetAmount > 0 && left === 0 && pocket.currentAmount > 0;

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 70).springify().damping(16)}>
      <AnimPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        style={[styles.card, anim, ready && styles.cardReady]}
      >
        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Text style={styles.emoji}>{pocket.emoji}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.name} numberOfLines={1}>
              {pocket.name}
            </Text>
            <Text style={styles.due}>{dueLabel(pocket.dueDay)}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </View>

        <View style={styles.amounts}>
          <Text style={styles.saved}>{formatRp(pocket.currentAmount)}</Text>
          <Text style={styles.slash}> tersisih dari </Text>
          <Text style={styles.target}>{formatRp(pocket.targetAmount)}</Text>
        </View>

        <ProgressBar
          current={pocket.currentAmount}
          target={pocket.targetAmount}
          delay={120 + index * 60}
        />

        <Text style={[styles.remainder, ready && styles.remainderReady]}>
          {ready ? 'Siap dikeluarkan untuk pembayaran' : remainderLabel(pocket.currentAmount, pocket.targetAmount)}
        </Text>
      </AnimPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardReady: {
    borderColor: 'rgba(240, 201, 120, 0.35)',
    backgroundColor: 'rgba(240, 201, 120, 0.06)',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 22 },
  meta: { flex: 1 },
  name: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.bodyBold,
  },
  due: {
    marginTop: 2,
    color: colors.textDim,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  chev: {
    color: colors.textDim,
    fontSize: 22,
    marginLeft: 8,
    marginTop: -2,
  },
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  saved: {
    color: colors.accentSoft,
    fontSize: 18,
    fontFamily: fonts.display,
  },
  slash: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  target: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  remainder: {
    marginTop: 10,
    color: colors.warning,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  remainderReady: {
    color: colors.accentSoft,
  },
});
