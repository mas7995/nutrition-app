import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { evaluateAlignment } from '@/engine/alignment';
import { useDietProfile } from '@/features/goals/useDietProfile';
import { useFood } from '@/features/food/useFoodLookup';
import {
  remainingBudget,
  useLogFood,
  useLogsForDay,
} from '@/features/log/useFoodLogs';
import { BarcodeScanner } from '@/features/scan/BarcodeScanner';
import { ManualEntryCard } from '@/features/scan/ManualEntryCard';
import { VerdictCard } from '@/features/scan/VerdictCard';
import { NormalizedFood } from '@/types/food';
import { Meal } from '@/types/log';
import { useTheme } from '@/theme/ThemeProvider';

export default function Scan() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: diet } = useDietProfile(userId, true);
  const { data: logs } = useLogsForDay(userId);
  const logFood = useLogFood(userId);

  const [barcode, setBarcode] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualFood, setManualFood] = useState<NormalizedFood | null>(null);
  const scannedRef = useRef(false);

  // Home's "Add manually" quick action deep-links here with ?manual=1.
  const { manual } = useLocalSearchParams<{ manual?: string }>();
  useEffect(() => {
    if (manual === '1') setManualMode(true);
  }, [manual]);

  const lookup = useFood(barcode ?? undefined, !manualFood);

  const sheetOpen = barcode !== null || manualMode || manualFood !== null;

  const activeFood: NormalizedFood | null =
    manualFood ?? (lookup.data?.found ? lookup.data.food ?? null : null);

  const remaining = useMemo(
    () => (diet ? remainingBudget(diet.targets, logs ?? []) : null),
    [diet, logs],
  );

  const result = useMemo(
    () =>
      activeFood && diet && remaining
        ? evaluateAlignment(activeFood, diet, remaining)
        : null,
    [activeFood, diet, remaining],
  );

  function reset() {
    setBarcode(null);
    setManualMode(false);
    setManualFood(null);
    scannedRef.current = false;
  }

  function handleScanned(data: string) {
    if (scannedRef.current || sheetOpen) return;
    scannedRef.current = true;
    setBarcode(data);
  }

  async function handleLog(meal: Meal, servings: number) {
    if (!activeFood || !result) return;
    await logFood.mutateAsync({
      barcode: activeFood.barcode || null,
      name: activeFood.name,
      meal,
      nutrients: activeFood.nutrients_per_serving,
      servings,
      verdict: result.verdict,
      reasons: result.reasons,
    });
    reset();
  }

  // ── Camera + scan overlay ──────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <BarcodeScanner
        active={!sheetOpen}
        onScanned={handleScanned}
        onUnavailable={() => setManualMode(true)}
      >
        {/* Overlay */}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + spacing.lg,
            left: spacing.xl,
            right: spacing.xl,
          }}
        >
          <Text variant="overline" style={{ color: '#FBFAF6', opacity: 0.8 }}>
            SCAN A BARCODE
          </Text>
          <Text variant="h2" style={{ color: '#FBFAF6' }}>
            Point at a product
          </Text>
        </View>

        {/* Scan frame */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 260,
              height: 170,
              borderRadius: radius.lg,
              borderWidth: 2,
              borderColor: 'rgba(251,250,246,0.9)',
            }}
          />
        </View>

        {/* Manual entry entry-point */}
        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: insets.bottom + spacing.lg, left: spacing.xl, right: spacing.xl }}>
          <Pressable
            onPress={() => setManualMode(true)}
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: 'rgba(0,0,0,0.55)',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radius.pill,
            }}
          >
            <Ionicons name="create-outline" size={18} color="#FBFAF6" />
            <Text variant="bodyStrong" style={{ color: '#FBFAF6' }}>
              No barcode? Enter manually
            </Text>
          </Pressable>
        </View>
      </BarcodeScanner>

      {/* Result / manual / loading sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={reset}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={reset} />
        <View style={{ maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
            {renderSheet()}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );

  function renderSheet() {
    // Manual entry form
    if (manualMode && !manualFood) {
      return (
        <View style={{ padding: spacing.xl }}>
          <ManualEntryCard
            barcode={barcode}
            onSubmit={(food) => {
              setManualFood(food);
              setManualMode(false);
            }}
            onCancel={reset}
          />
        </View>
      );
    }

    // Verdict
    if (activeFood && result) {
      return (
        <VerdictCard
          food={activeFood}
          result={result}
          logging={logFood.isPending}
          onLog={handleLog}
          onScanAgain={reset}
        />
      );
    }

    // Loading lookup
    if (lookup.isLoading) {
      return (
        <View style={{ padding: spacing.xxl, alignItems: 'center', gap: spacing.md }}>
          <ActivityIndicator color={colors.accent} />
          <Text variant="body" color="textSecondary">
            Looking up {barcode}…
          </Text>
        </View>
      );
    }

    // Error
    if (lookup.isError) {
      return (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text variant="h3">Lookup failed</Text>
          <Text variant="body" color="textSecondary">
            Couldn't reach the food service. Check your connection and try again.
          </Text>
          <Button label="Try again" onPress={() => lookup.refetch()} />
          <Button label="Enter manually" variant="secondary" onPress={() => setManualMode(true)} />
          <Button label="Scan again" variant="ghost" onPress={reset} />
        </View>
      );
    }

    // Not found
    if (lookup.data && !lookup.data.found) {
      return (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Ionicons name="help-circle-outline" size={36} color={colors.textTertiary} />
          <Text variant="h2">Not in our sources</Text>
          <Text variant="body" color="textSecondary">
            Barcode {barcode} wasn't found in Nutritionix or Open Food Facts. You
            can add it by hand.
          </Text>
          <Button label="Enter manually" onPress={() => setManualMode(true)} />
          <Button label="Scan again" variant="ghost" onPress={reset} />
        </View>
      );
    }

    return (
      <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
}
