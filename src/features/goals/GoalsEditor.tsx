import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import {
  Button,
  Card,
  SegmentedControl,
  Stepper,
  Tag,
  Text,
} from '@/components';
import { DietProfile, Strictness } from '@/types/diet';
import { useTheme } from '@/theme/ThemeProvider';
import { ChipInput } from './ChipInput';
import { PRESETS, PRESET_ORDER, PresetKey } from './presets';

type Draft = Omit<DietProfile, 'user_id'>;

export interface GoalsEditorProps {
  /** Existing profile to edit; omit for first-time onboarding. */
  initial?: Draft;
  title: string;
  submitLabel: string;
  saving: boolean;
  error?: string | null;
  onSubmit: (draft: Draft) => void;
  onCancel?: () => void;
}

const ALLERGEN_SUGGESTIONS = [
  'milk',
  'eggs',
  'peanuts',
  'tree nuts',
  'soybeans',
  'wheat',
  'gluten',
  'fish',
  'shellfish',
  'sesame',
];

const STRICTNESS_OPTIONS: { value: Strictness; label: string }[] = [
  { value: 'lenient', label: 'Lenient' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'strict', label: 'Strict' },
];

type NovaOption = 'off' | '1' | '2' | '3' | '4';
const NOVA_OPTIONS: { value: NovaOption; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

export function GoalsEditor({
  initial,
  title,
  submitLabel,
  saving,
  error,
  onSubmit,
  onCancel,
}: GoalsEditorProps) {
  const { colors, spacing, radius } = useTheme();

  const [step, setStep] = useState<'preset' | 'tune'>(
    initial ? 'tune' : 'preset',
  );
  const [draft, setDraft] = useState<Draft | null>(initial ?? null);

  function choosePreset(key: PresetKey) {
    // Deep-clone the seed so edits don't mutate the shared preset object.
    setDraft(JSON.parse(JSON.stringify(PRESETS[key].seed)) as Draft);
    setStep('tune');
  }

  // ── Preset picker ────────────────────────────────────────────
  if (step === 'preset' || !draft) {
    return (
      <View style={{ gap: spacing.md }}>
        <View style={{ marginBottom: spacing.xs }}>
          <Text variant="overline" color="textTertiary">
            {title.toUpperCase()}
          </Text>
          <Text variant="h1">Choose a{'\n'}starting point</Text>
          <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm }}>
            Pick a framework to seed your targets and rules. You'll fine-tune
            everything next — nothing here is locked in.
          </Text>
        </View>

        {PRESET_ORDER.map((key) => {
          const preset = PRESETS[key];
          return (
            <Card key={key} onPress={() => choosePreset(key)} variant="flat">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{preset.label}</Text>
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                    {preset.tagline}
                  </Text>
                </View>
                <Text variant="numberMd" color="accent">
                  {preset.seed.targets.protein_g}
                  <Text variant="caption" color="textTertiary">
                    {' '}
                    P
                  </Text>
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    );
  }

  // ── Fine-tune ────────────────────────────────────────────────
  const t = draft.targets;
  const r = draft.rules;

  const setTargets = (patch: Partial<Draft['targets']>) =>
    setDraft({ ...draft, targets: { ...draft.targets, ...patch } });
  const setRules = (patch: Partial<Draft['rules']>) =>
    setDraft({ ...draft, rules: { ...draft.rules, ...patch } });

  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text variant="overline" color="textTertiary">
          {title.toUpperCase()}
        </Text>
        <Text variant="h1">Fine-tune{'\n'}your plan</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
        {r.diet_tags.map((tag) => (
          <Tag key={tag} label={tag} tone="accent" />
        ))}
        <Pressable onPress={() => setStep('preset')}>
          <Text variant="caption" color="accent">
            Change preset
          </Text>
        </Pressable>
      </View>

      {/* Daily targets */}
      <Card>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
          DAILY TARGETS
        </Text>
        <Stepper label="Calories" value={t.calories} onChange={(n) => setTargets({ calories: n })} unit="kcal" step={10} />
        <Stepper label="Protein" value={t.protein_g} onChange={(n) => setTargets({ protein_g: n })} unit="g" step={5} />
        <Stepper label="Carbs" value={t.carbs_g} onChange={(n) => setTargets({ carbs_g: n })} unit="g" step={5} />
        <Stepper label="Fat" value={t.fat_g} onChange={(n) => setTargets({ fat_g: n })} unit="g" step={5} />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

        <OptionalNumber
          label="Fiber target"
          enabled={t.fiber_g !== undefined}
          value={t.fiber_g ?? 30}
          unit="g"
          step={1}
          onToggle={(on) => setTargets({ fiber_g: on ? (t.fiber_g ?? 30) : undefined })}
          onChange={(n) => setTargets({ fiber_g: n })}
        />
        <OptionalNumber
          label="Sodium target"
          enabled={t.sodium_mg !== undefined}
          value={t.sodium_mg ?? 2000}
          unit="mg"
          step={50}
          onToggle={(on) => setTargets({ sodium_mg: on ? (t.sodium_mg ?? 2000) : undefined })}
          onChange={(n) => setTargets({ sodium_mg: n })}
        />
        <OptionalNumber
          label="Added sugar target"
          enabled={t.added_sugar_g !== undefined}
          value={t.added_sugar_g ?? 25}
          unit="g"
          step={1}
          onToggle={(on) => setTargets({ added_sugar_g: on ? (t.added_sugar_g ?? 25) : undefined })}
          onChange={(n) => setTargets({ added_sugar_g: n })}
        />
      </Card>

      {/* Avoided ingredients & allergens */}
      <Card>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
          AVOID — INGREDIENTS
        </Text>
        <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
          Any of these appearing in a product's ingredient list makes it red.
        </Text>
        <ChipInput
          values={r.avoid_ingredients}
          onChange={(v) => setRules({ avoid_ingredients: v })}
          placeholder="e.g. soybean oil, high fructose corn syrup"
        />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.md }}>
          AVOID — ALLERGENS
        </Text>
        <ChipInput
          values={r.avoid_allergens}
          onChange={(v) => setRules({ avoid_allergens: v })}
          placeholder="Add an allergen"
          suggestions={ALLERGEN_SUGGESTIONS}
        />
      </Card>

      {/* Per-serving limits */}
      <Card>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
          PER-SERVING LIMITS
        </Text>

        <OptionalNumber
          label="Max added sugar / serving"
          enabled={r.max_added_sugar_per_serving_g !== undefined}
          value={r.max_added_sugar_per_serving_g?.value ?? 10}
          unit="g"
          step={1}
          onToggle={(on) =>
            setRules({
              max_added_sugar_per_serving_g: on
                ? r.max_added_sugar_per_serving_g ?? { value: 10, strict: false }
                : undefined,
            })
          }
          onChange={(n) =>
            setRules({
              max_added_sugar_per_serving_g: {
                value: n,
                strict: r.max_added_sugar_per_serving_g?.strict ?? false,
              },
            })
          }
          accessory={
            <StrictToggle
              enabled={r.max_added_sugar_per_serving_g?.strict ?? false}
              onToggle={(strict) =>
                setRules({
                  max_added_sugar_per_serving_g: {
                    value: r.max_added_sugar_per_serving_g?.value ?? 10,
                    strict,
                  },
                })
              }
            />
          }
        />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

        <OptionalNumber
          label="Max sodium / serving"
          enabled={r.max_sodium_per_serving_mg !== undefined}
          value={r.max_sodium_per_serving_mg?.value ?? 500}
          unit="mg"
          step={50}
          onToggle={(on) =>
            setRules({
              max_sodium_per_serving_mg: on
                ? r.max_sodium_per_serving_mg ?? { value: 500, strict: false }
                : undefined,
            })
          }
          onChange={(n) =>
            setRules({
              max_sodium_per_serving_mg: {
                value: n,
                strict: r.max_sodium_per_serving_mg?.strict ?? false,
              },
            })
          }
          accessory={
            <StrictToggle
              enabled={r.max_sodium_per_serving_mg?.strict ?? false}
              onToggle={(strict) =>
                setRules({
                  max_sodium_per_serving_mg: {
                    value: r.max_sodium_per_serving_mg?.value ?? 500,
                    strict,
                  },
                })
              }
            />
          }
        />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />

        <OptionalNumber
          label="Min protein / serving"
          enabled={r.min_protein_per_serving_g !== undefined}
          value={r.min_protein_per_serving_g ?? 10}
          unit="g"
          step={1}
          onToggle={(on) => setRules({ min_protein_per_serving_g: on ? (r.min_protein_per_serving_g ?? 10) : undefined })}
          onChange={(n) => setRules({ min_protein_per_serving_g: n })}
        />
      </Card>

      {/* Processing + strictness */}
      <Card>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
          MAX PROCESSING (NOVA)
        </Text>
        <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
          Flag foods processed beyond this level. NOVA 1 is unprocessed, 4 is
          ultra-processed.
        </Text>
        <SegmentedControl<NovaOption>
          options={NOVA_OPTIONS}
          value={r.max_nova_group ? (String(r.max_nova_group) as NovaOption) : 'off'}
          onChange={(v) =>
            setRules({ max_nova_group: v === 'off' ? undefined : Number(v) })
          }
        />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
          STRICTNESS
        </Text>
        <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
          How hard soft limits push toward red versus amber.
        </Text>
        <SegmentedControl
          options={STRICTNESS_OPTIONS}
          value={draft.strictness}
          onChange={(v) => setDraft({ ...draft, strictness: v })}
        />
      </Card>

      {error && (
        <Text variant="caption" color="red">
          {error}
        </Text>
      )}

      <Button
        label={submitLabel}
        fullWidth
        loading={saving}
        onPress={() => onSubmit(draft)}
      />
      {onCancel && (
        <Button label="Cancel" variant="ghost" fullWidth onPress={onCancel} />
      )}
      <View style={{ height: spacing.xl }} />
    </View>
  );
}

/**
 * A toggle that reveals a Stepper when on — for optional targets/limits.
 * Top-level component (stable identity) so the Stepper's TextInput keeps
 * focus while typing.
 */
function OptionalNumber({
  label,
  enabled,
  value,
  unit,
  step,
  onToggle,
  onChange,
  accessory,
}: {
  label: string;
  enabled: boolean;
  value: number;
  unit: string;
  step: number;
  onToggle: (on: boolean) => void;
  onChange: (n: number) => void;
  accessory?: React.ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {label}
        </Text>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: colors.accent, false: colors.surfaceSunken }}
          thumbColor={colors.surface}
        />
      </View>
      {enabled && (
        <Stepper label="Limit" value={value} onChange={onChange} unit={unit} step={step} />
      )}
      {enabled && accessory}
    </View>
  );
}

function StrictToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (on: boolean) => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs }}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="textSecondary">
          Hard limit — breach is red, not amber
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ true: colors.red, false: colors.surfaceSunken }}
        thumbColor={colors.surface}
      />
    </View>
  );
}
