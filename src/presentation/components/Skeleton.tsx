import { ReactNode, useEffect } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/lib/format';
import { Screen, useScreenContentInsets } from '@/presentation/components/ui';

function ShimmerBone({
  width,
  height,
  style,
  radius = 12,
}: {
  width: number | `${number}%`;
  height: number;
  style?: ViewStyle;
  radius?: number;
}) {
  const shimmer = useSharedValue(0.45);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

  const anim = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bone,
        { width, height, borderRadius: radius, opacity: 0.45 },
        anim,
        style,
      ]}
    />
  );
}

function SkeletonBlock({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.block, style]}>{children}</View>;
}

export function HomeScreenSkeleton() {
  const contentInsets = useScreenContentInsets(36);

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={[contentInsets, styles.content]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ShimmerBone width="42%" height={34} radius={10} />
            <ShimmerBone width="68%" height={14} radius={8} style={{ marginTop: 10 }} />
          </View>
          <ShimmerBone width={64} height={36} radius={12} />
          <ShimmerBone width={64} height={36} radius={12} />
        </View>

        <SkeletonBlock style={styles.hero}>
          <ShimmerBone width="38%" height={12} radius={6} />
          <ShimmerBone width="52%" height={16} radius={8} style={{ marginTop: 14 }} />
          <ShimmerBone width="72%" height={40} radius={10} style={{ marginTop: 10 }} />
          <ShimmerBone width="100%" height={14} radius={8} style={{ marginTop: 14 }} />
          <View style={styles.heroActions}>
            <ShimmerBone width="48%" height={44} radius={14} />
            <ShimmerBone width="48%" height={44} radius={14} />
          </View>
        </SkeletonBlock>

        <SkeletonBlock style={styles.reminder}>
          <View style={{ flex: 1, gap: 8 }}>
            <ShimmerBone width="55%" height={16} radius={8} />
            <ShimmerBone width="100%" height={12} radius={6} />
            <ShimmerBone width="88%" height={12} radius={6} />
          </View>
          <ShimmerBone width={48} height={28} radius={14} />
        </SkeletonBlock>

        <View style={styles.sectionRow}>
          <ShimmerBone width={120} height={18} radius={8} />
          <ShimmerBone width={56} height={16} radius={8} />
        </View>

        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} style={styles.pocketCard}>
            <ShimmerBone width={48} height={48} radius={14} />
            <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
              <ShimmerBone width="55%" height={16} radius={8} />
              <ShimmerBone width="40%" height={12} radius={6} />
              <ShimmerBone width="100%" height={8} radius={4} style={{ marginTop: 4 }} />
            </View>
          </SkeletonBlock>
        ))}
      </ScrollView>
    </Screen>
  );
}

export function HistoryScreenSkeleton() {
  const contentInsets = useScreenContentInsets(40);

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={[contentInsets, styles.content]} showsVerticalScrollIndicator={false}>
        <ShimmerBone width={72} height={16} radius={8} />
        <ShimmerBone width="40%" height={32} radius={10} style={{ marginTop: 18 }} />
        <ShimmerBone width="70%" height={14} radius={8} style={{ marginTop: 8 }} />

        <View style={styles.chipRow}>
          {[0, 1, 2].map((i) => (
            <ShimmerBone key={i} width={72} height={34} radius={18} />
          ))}
        </View>
        <View style={styles.chipRow}>
          {[0, 1].map((i) => (
            <ShimmerBone key={i} width={96} height={34} radius={18} />
          ))}
        </View>

        {[0, 1, 2, 3, 4].map((i) => (
          <Animated.View key={i} entering={FadeIn.delay(i * 40).duration(280)}>
            <SkeletonBlock style={styles.historyRow}>
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerBone width="35%" height={12} radius={6} />
                <ShimmerBone width="78%" height={16} radius={8} />
                <ShimmerBone width="50%" height={12} radius={6} />
              </View>
              <ShimmerBone width={88} height={22} radius={8} />
            </SkeletonBlock>
          </Animated.View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 0,
  },
  bone: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  block: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  hero: {
    padding: 20,
    marginBottom: 16,
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pocketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
});
