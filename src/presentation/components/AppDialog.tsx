import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { colors, fonts } from '@/lib/format';
import { useDialogStore } from '@/lib/confirm';

export function AppDialog() {
  const visible = useDialogStore((s) => s.visible);
  const title = useDialogStore((s) => s.title);
  const message = useDialogStore((s) => s.message);
  const buttons = useDialogStore((s) => s.buttons);
  const hide = useDialogStore((s) => s.hide);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hide}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={styles.backdrop} />

        {visible ? (
          <Animated.View
            entering={ZoomIn.springify().damping(18).stiffness(220)}
            exiting={ZoomOut.duration(120)}
            style={styles.card}
          >
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <View style={styles.actions}>
              {buttons.map((btn, index) => {
                const isDanger = btn.role === 'danger';
                const isConfirm = btn.role === 'confirm';
                const isCancel =
                  btn.role === 'cancel' ||
                  (!btn.role && index === 0 && buttons.length > 1);

                return (
                  <Pressable
                    key={`${btn.label}-${index}`}
                    onPress={() => {
                      const action = btn.onPress;
                      hide();
                      setTimeout(() => action?.(), 10);
                    }}
                    style={({ pressed }) => [
                      styles.btn,
                      isConfirm && styles.btnConfirm,
                      isDanger && styles.btnDanger,
                      isCancel && styles.btnCancel,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isConfirm && styles.btnTextConfirm,
                        isDanger && styles.btnTextDanger,
                        isCancel && styles.btnTextCancel,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 22,
    borderRadius: 20,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    zIndex: 2,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.3,
  },
  message: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.body,
  },
  actions: {
    marginTop: 22,
    flexDirection: 'column',
    gap: 8,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnConfirm: {
    backgroundColor: colors.accent,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
  },
  btnTextCancel: {
    color: colors.textMuted,
  },
  btnTextConfirm: {
    color: '#062016',
  },
  btnTextDanger: {
    color: '#2A0A05',
  },
});
