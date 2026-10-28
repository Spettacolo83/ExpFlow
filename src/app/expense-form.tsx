import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Common/Button';
import { CategoryPicker } from '@/components/Common/CategoryPicker';
import { Input } from '@/components/Common/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UNCATEGORIZED_ID } from '@/constants/categories';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { insertExpense } from '@/services/database';
import { persistReceiptPhoto } from '@/services/photos';
import { CurrencyCode } from '@/types';

export default function ExpenseFormScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    amount?: string;
    date?: string;
    merchant?: string;
    photoUri?: string;
    rawOcrText?: string;
  }>();

  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState(params.amount ?? '');
  const [date, setDate] = useState(params.date ?? today);
  const [merchant, setMerchant] = useState(params.merchant ?? '');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState(UNCATEGORIZED_ID);
  const [keepPhoto, setKeepPhoto] = useState(Boolean(params.photoUri));
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Came from the scanner but nothing usable was read → non-blocking hint.
  const showOcrNotice = params.rawOcrText !== undefined && !params.amount;

  async function handleSave() {
    const normalized = amount.replace(',', '.').trim();
    const value = parseFloat(normalized);
    if (!normalized) {
      setError(t('form.amountRequired'));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('form.amountInvalid'));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      let photoUri: string | null = null;
      if (keepPhoto && params.photoUri) {
        photoUri = await persistReceiptPhoto(params.photoUri);
      }
      await insertExpense({
        date,
        amount: value,
        currency: 'EUR' as CurrencyCode,
        merchant: merchant.trim() || null,
        category,
        notes: notes.trim() || null,
        photoUri,
        rawOcrText: params.rawOcrText || null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText style={Typography.heading}>{t('form.titleNew')}</ThemedText>

          {showOcrNotice ? (
            <ThemedText style={Typography.caption} themeColor="error">
              {t('form.ocrFailed')}
            </ThemedText>
          ) : null}

          <Input
            label={t('form.amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            placeholder="0,00"
            error={error}
          />
          <Input label={t('form.date')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Input label={t('form.merchant')} value={merchant} onChangeText={setMerchant} />

          <View style={styles.field}>
            <ThemedText style={Typography.caption} themeColor="textSecondary">
              {t('form.category')}
            </ThemedText>
            <CategoryPicker value={category} onChange={setCategory} />
          </View>

          <Input
            label={t('form.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ height: 88, textAlignVertical: 'top', paddingTop: Spacing.two }}
          />

          {params.photoUri ? (
            <View style={styles.switchRow}>
              <ThemedText style={Typography.body}>{t('form.keepPhoto')}</ThemedText>
              <Switch
                value={keepPhoto}
                onValueChange={setKeepPhoto}
                trackColor={{ true: theme.primary }}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button label={t('common.save')} onPress={handleSave} loading={saving} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  field: { gap: Spacing.one },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: { padding: Spacing.four },
});
