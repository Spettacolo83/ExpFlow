import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fab } from '@/components/Common/Fab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Typography } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation();

  function openAddExpense() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('scan.chooseScan'), t('scan.chooseManual'), t('common.cancel')],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) router.push('/scan');
          if (index === 1) router.push('/expense-form');
        }
      );
    } else {
      // Android: go straight to scanning; manual entry is reachable from there.
      router.push('/scan');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedText style={Typography.display}>{t('common.appName')}</ThemedText>
        <ThemedText style={Typography.body} themeColor="textSecondary">
          {t('home.dashboardComingSoon')}
        </ThemedText>
        <View style={styles.spacer} />
      </SafeAreaView>
      <Fab onPress={openAddExpense} accessibilityLabel={t('home.addExpense')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.two },
  spacer: { flex: 1 },
});
