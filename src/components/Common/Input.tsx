import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Input({
  label,
  error,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <ThemedText style={Typography.caption} themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          Typography.body,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            borderColor: error ? theme.error : theme.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText style={Typography.small} themeColor="error">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.one },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
});
