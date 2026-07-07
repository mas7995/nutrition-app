import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

export interface ChipInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Tappable quick-add suggestions that aren't already selected. */
  suggestions?: string[];
}

/** Add/remove a list of short strings (avoided ingredients, allergens). */
export function ChipInput({
  values,
  onChange,
  placeholder = 'Add…',
  suggestions = [],
}: ChipInputProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v)) {
      setDraft('');
      return;
    }
    onChange([...values, v]);
    setDraft('');
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const openSuggestions = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <View style={{ gap: spacing.sm }}>
      {values.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {values.map((v) => (
            <Pressable
              key={v}
              onPress={() => remove(v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.accentSoft,
                borderRadius: radius.pill,
                paddingLeft: spacing.md,
                paddingRight: spacing.sm,
                paddingVertical: spacing.xs + 1,
              }}
            >
              <Text variant="caption" color="accent">
                {v}
              </Text>
              <Ionicons name="close-circle" size={15} color={colors.accent} />
            </Pressable>
          ))}
        </View>
      )}

      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => add(draft)}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        returnKeyType="done"
        style={{
          height: 48,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: typography.body.fontSize,
        }}
      />

      {openSuggestions.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {openSuggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => add(s)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.surfaceSunken,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 1,
              }}
            >
              <Ionicons name="add" size={14} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary">
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
