import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';

export function OverlayGuide() {
  const { t } = useTranslation();
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.frame} />
      <Text style={styles.hint}>{t('scan.instruction')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '78%',
    height: '58%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.lg,
  },
  hint: {
    ...Typography.body,
    color: '#FFFFFF',
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
});
