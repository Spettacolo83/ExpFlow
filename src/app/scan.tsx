import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OverlayGuide } from '@/components/Scan/OverlayGuide';
import { Button } from '@/components/Common/Button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { recognizeText } from '@/services/ocr';
import { parseReceipt } from '@/services/parser';
import i18n from '@/i18n';
import { Language } from '@/types';

export default function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);

  async function handleCapture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;
      const text = await recognizeText(photo.uri);
      const locale = (i18n.language as Language) ?? 'en';
      const parsed = parseReceipt(text, locale);
      router.replace({
        pathname: '/expense-form',
        params: {
          amount: parsed.amount != null ? String(parsed.amount) : '',
          date: parsed.date,
          merchant: parsed.merchant ?? '',
          photoUri: photo.uri,
          rawOcrText: text,
        },
      });
    } finally {
      setBusy(false);
    }
  }

  if (!permission) {
    return <View style={styles.black} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Text style={[Typography.heading, styles.permTitle]}>{t('permissions.cameraTitle')}</Text>
        <Text style={[Typography.body, styles.permBody]}>{t('permissions.cameraMessage')}</Text>
        <Button
          label={permission.canAskAgain ? t('permissions.grant') : t('permissions.openSettings')}
          onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <OverlayGuide />
      {busy ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={[Typography.body, styles.loaderText]}>{t('scan.analyzing')}</Text>
        </View>
      ) : (
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('scan.capture')}
            onPress={handleCapture}
            style={styles.shutter}
          />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000000' },
  permission: {
    flex: 1,
    backgroundColor: '#000000',
    padding: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  permTitle: { color: '#FFFFFF' },
  permBody: { color: 'rgba(255,255,255,0.8)' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: Spacing.five },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  loader: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  loaderText: { color: '#FFFFFF' },
});
