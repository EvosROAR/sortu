import { ReactNode, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, progressPct } from '@/lib/format';
import { formatAmountInput } from '@/lib/confirm';

const AnimPressable = Animated.createAnimatedComponent(Pressable);

const webNoOutline =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' } as object)
    : null;

export function useScreenContentInsets(extraBottom = 24): ViewStyle {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + 12,
    paddingHorizontal: 20,
    paddingBottom: insets.bottom + extraBottom,
  };
}

export function Screen({
  children,
  style,
  padded = true,
  scrollable = false,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /** Padding atas ikut scroll — tidak ada app bar kosong di luar ScrollView */
  scrollable?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, style]}>
      <LinearGradient
        colors={[colors.bgTop, colors.bgMid, colors.bg]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[
          styles.screenInner,
          padded &&
            !scrollable && {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: 20,
            },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** Scroll + keyboard avoidance — field input tidak tertutup keyboard. */
export function KeyboardScroll({
  children,
  contentContainerStyle,
  bottomPad = 32,
  ...rest
}: ScrollViewProps & { bottomPad?: number }) {
  const contentInsets = useScreenContentInsets(bottomPad);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[contentInsets, styles.keyboardContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  compact = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost' | 'soft';
  /** Teks lebih pendek / satu baris — cocok untuk tombol berdampingan */
  compact?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === 'danger'
      ? colors.danger
      : variant === 'ghost'
        ? 'transparent'
        : variant === 'soft'
          ? colors.surfaceAlt
          : colors.accent;
  const color =
    variant === 'primary'
      ? '#062016'
      : variant === 'danger'
        ? '#2A0A05'
        : colors.accentSoft;

  return (
    <AnimPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
      style={[
        styles.btn,
        compact && styles.btnCompact,
        anim,
        { backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        (variant === 'ghost' || variant === 'soft') && styles.btnGhost,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[
          styles.btnText,
          compact && styles.btnTextCompact,
          { color, fontFamily: fonts.bodyBold },
        ]}
      >
        {label}
      </Text>
    </AnimPressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, webNoOutline]}
        underlineColorAndroid="transparent"
        {...props}
      />
    </View>
  );
}

/** Input nominal: hanya angka, auto-format ribuan (10.000). */
export function MoneyField({
  label,
  value,
  onChangeText,
  placeholder = '0',
}: {
  label: string;
  value: string;
  onChangeText: (formatted: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.moneyWrap, focused && styles.moneyWrapFocused]}>
        <Text style={styles.moneyPrefix}>Rp</Text>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(formatAmountInput(text))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          inputMode="numeric"
          style={[styles.moneyInput, webNoOutline]}
          underlineColorAndroid="transparent"
        />
      </View>
    </View>
  );
}

export function ProgressBar({
  current,
  target,
  delay = 0,
}: {
  current: number;
  target: number;
  delay?: number;
}) {
  const pct = progressPct(current, target);
  const [trackW, setTrackW] = useState(0);
  const width = useSharedValue(0);
  const ready = target > 0 && current >= target;

  useEffect(() => {
    if (trackW <= 0) return;
    const targetW = (trackW * pct) / 100;
    const timer = setTimeout(() => {
      width.value = withTiming(targetW, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [pct, delay, trackW, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackW(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.barTrack} onLayout={onLayout}>
      <Animated.View
        style={[
          styles.barFill,
          fillStyle,
          ready && { backgroundColor: colors.warning },
        ]}
      />
    </View>
  );
}

export function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.backWrap}>
      <Text style={styles.back}>← Kembali</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    width: '100%',
  },
  screenInner: {
    flex: 1,
    zIndex: 1,
    width: '100%',
  },
  keyboardAvoid: {
    flex: 1,
  },
  keyboardContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  btn: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  btnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnText: {
    fontSize: 15,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  btnTextCompact: {
    fontSize: 14,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  moneyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 4,
    minHeight: 50,
  },
  moneyWrapFocused: {
    borderColor: colors.accent,
  },
  moneyPrefix: {
    color: colors.textMuted,
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    marginRight: 6,
  },
  moneyInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'web' ? 12 : 13,
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.body,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  barTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  backWrap: {
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  back: {
    color: colors.accentSoft,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
});
