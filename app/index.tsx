import React from 'react';
import { View } from 'react-native';

import { Button, Card, DataRow, Ring, Screen, Tag, Text } from '@/components';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Phase 1 landing screen. A themed "system check" that renders every core
 * primitive so the design language can be verified on device before real
 * screens are built. Replaced by the auth gate in Phase 2.
 */
export default function Home() {
  const { spacing, colors } = useTheme();

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
        <Text variant="overline" color="textTertiary">
          NUTRITION SCANNER
        </Text>
        <Text variant="display">Aligned{'\n'}eating.</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm }}>
          Set your goals first. Then every scan is a judgment call against your
          plan — green, amber, or red, always with the reason why.
        </Text>
      </View>

      {/* Verdict language preview */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.md }}>
          THE VERDICT MOMENT
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Tag label="Aligned" tone="green" />
          <Tag label="Moderate" tone="amber" />
          <Tag label="Avoid" tone="red" />
        </View>
        <DataRow
          title="Greek Yogurt, plain"
          subtitle="Fits your day · +17g protein"
          value="90"
          valueSub="kcal"
          verdict="green"
        />
        <DataRow
          title="Granola bar"
          subtitle="Added sugar 14g over your 10g limit"
          value="190"
          valueSub="kcal"
          verdict="amber"
        />
        <DataRow
          title="Soda, 355ml"
          subtitle="Contains an avoided ingredient"
          value="140"
          valueSub="kcal"
          verdict="red"
          style={{}}
        />
      </Card>

      {/* Rings preview */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.lg }}>
          TODAY'S MACROS
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Ring progress={0.62} value="1240" label="kcal" color={colors.accent} />
          <Ring progress={0.8} value="96g" label="protein" color={colors.green} />
          <Ring progress={0.45} value="88g" label="carbs" color={colors.amber} />
          <Ring progress={0.3} value="41g" label="fat" color={colors.red} />
        </View>
      </Card>

      {/* Build status */}
      <Card variant="sunken" style={{ marginBottom: spacing.xl }}>
        <Text variant="h3" style={{ marginBottom: spacing.xs }}>
          Phase 1 · Scaffold
        </Text>
        <Text variant="caption" color="textSecondary">
          Expo Router, Supabase client, React Query, design tokens and the core
          primitives (Button, Card, Ring, Tag, DataRow) are wired up. This
          screen is rendered entirely from those primitives.
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <Tag
            label={isSupabaseConfigured ? 'Supabase connected' : 'Supabase not configured yet'}
            tone={isSupabaseConfigured ? 'green' : 'neutral'}
          />
        </View>
      </Card>

      <View style={{ gap: spacing.md }}>
        <Button label="Primary action" variant="primary" fullWidth />
        <Button label="Secondary action" variant="secondary" fullWidth />
        <Button label="Ghost action" variant="ghost" fullWidth />
      </View>

      <Text
        variant="caption"
        color="textTertiary"
        align="center"
        style={{ marginTop: spacing.xxl }}
      >
        Not medical advice. A personal tool used alongside your dietician.
      </Text>
    </Screen>
  );
}
