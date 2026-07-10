import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { colors, fonts } from '@/lib/format';

type Props = {
  message?: string;
};

export function AppBootSplash({ message }: Props) {
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: 2800, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse, spin]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: pulse.value }],
    opacity: 0.35 + (pulse.value - 1) * 2,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + (pulse.value - 1) * 0.5 }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      </Animated.View>
      <Text style={styles.brand}>Sortu</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const LOGO = 88;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  center: {
    width: LOGO + 48,
    height: LOGO + 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: LOGO + 44,
    height: LOGO + 44,
    borderRadius: (LOGO + 44) / 2,
    borderWidth: 2,
    borderColor: colors.accent,
    borderTopColor: 'transparent',
    borderLeftColor: 'rgba(110, 240, 176, 0.35)',
  },
  logoWrap: {
    width: LOGO,
    height: LOGO,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  logo: {
    width: LOGO,
    height: LOGO,
  },
  brand: {
    marginTop: 20,
    fontSize: 28,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
