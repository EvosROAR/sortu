import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import {
  buildSnapWebViewHtml,
  parseSnapWebViewMessage,
  SnapPayResult,
} from '@/application/MidtransPaymentService';
import { getMidtransClientKey } from '@/infrastructure/midtrans/midtransConfig';
import { colors, fonts } from '@/lib/format';

type Props = {
  visible: boolean;
  snapToken: string | null;
  orderId: string;
  onResult: (result: SnapPayResult) => void;
  onDismiss: () => void;
};

export function MidtransSnapModal({
  visible,
  snapToken,
  orderId,
  onResult,
  onDismiss,
}: Props) {
  if (!visible || !snapToken) return null;

  const html = buildSnapWebViewHtml(snapToken, getMidtransClientKey());

  const onMessage = (event: WebViewMessageEvent) => {
    const result = parseSnapWebViewMessage(event.nativeEvent.data, orderId);
    onResult(result);
    if (result.status !== 'close') {
      onDismiss();
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Bayar via Midtrans (sandbox)</Text>
          <Pressable onPress={onDismiss} style={styles.closeBtn}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>
        <WebView
          source={{ html }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  webview: { flex: 1, backgroundColor: colors.bg },
});
