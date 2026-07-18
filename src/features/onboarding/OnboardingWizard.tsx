import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import {
  Button,
  Card,
  MacroDonut,
  SegmentedControl,
  Stepper,
  Tag,
  Text,
} from '@/components';
import { selectionFeedback } from '@/lib/haptics';
import { DietProfile, Strictness } from '@/types/diet';
import { useTheme } from '@/theme/ThemeProvider';
import { ChipInput } from '@/features/goals/ChipInput';
import { PRESETS, PRESET_ORDER, PresetKey } from '@/features/goals/presets';
import { MacroSplitEditor } from './MacroSplitEditor';
import { MacroSplit, gramsFromSplit, splitFromTargets } from './split';

type Draft = Omit<DietProfile, 'user_id'>;

export interface OnboardingWizardProps {
  /** Existing plan → the wizard opens on the review step, prefilled. */
  initial?: Draft;
  saving: boolean;
  error?: string | null;
  onComplete: (draft: Draft) => void;
  onCancel?: () => void;
}

const STEPS = ['GOAL', 'CALORIES', 'MACROS', 'RULES', 'REVIEW'] as const;

/** Goal-voiced framing of the preset frameworks. */
const GOAL_COPY: Record<PresetKey, { title: string; line: string }> = {
  'high-protein': {
    title: 'Build & keep muscle',
    line: "Protein-forward days. I'll pace your intake so it doesn't all land at dinner.",
  },
  mediterranean: {
    title: 'Eat whole, feel steady',
    line: "Whole foods, healthy fats, fiber. I'll flag the ultra-processed stuff.",
  },
  keto: {
    title: 'Go low-carb',
    line: "Tight carb and sugar ceilings. I'll hold the line with you.",
  },
  'low-sugar': {
    title: 'Cut the sugar',
    line: "Added sugar gets a hard look on every scan — without going full keto.",
  },
  whole30: {
    title: 'Reset for 30 days',
    line: 'Whole foods only. Strict by design — I\'ll tell you exactly what breaks it.',
  },
  custom: {
    title: 'Start from scratch',
    line: 'A blank slate. You set every number and rule yourself.',
  },
};

function presetChips(key: PresetKey): string[] {
  const seed = PRESETS[key].seed;
  const chips: string[] = [`${seed.targets.protein_g}g protein`];
  if (seed.rules.max_added_sugar_per_serving_g !== undefined) {
    chips.push(`≤${seed.rules.max_added_sugar_per_serving_g.value}g added sugar`);
  }
  if (seed.rules.max_nova_group !== undefined) {
    chips.push(`NOVA ≤ ${seed.rules.max_nova_group}`);
  }
  if (key === 'keto') chips.push(`${seed.targets.carbs_g}g carbs`);
  return chips.slice(0, 3);
}

const CALORIE_CHIPS = [1600, 1800, 2000, 2200, 2500, 2800];

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

export function OnboardingWizard({
  initial,
  saving,
  error,
  onComplete,
  onCancel,
}: OnboardingWizardProps) {
  const { colors, radius, spacing } = useTheme();

  const [step, setStep] = useState(initial ? 4 : 0);
  const [draft, setDraft] = useState<Draft | null>(
    initial ? (JSON.parse(JSON.stringify(initial)) as Draft) : null,
  );
  const [split, setSplit] = useState<MacroSplit>(
    initial ? splitFromTargets(initial.targets) : splitFromTargets(PRESETS.custom.seed.targets),
  );
  const [chosenPreset, setChosenPreset] = useState<PresetKey | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function choosePreset(key: PresetKey) {
    selectionFeedback();
    const seed = JSON.parse(JSON.stringify(PRESETS[key].seed)) as Draft;
    setDraft(seed);
    setSplit(splitFromTargets(seed.targets));
    setChosenPreset(key);
    setStep(1);
  }

  function finish() {
    if (!draft) return;
    onComplete({
      ...draft,
      targets: {
        ...draft.targets,
        ...gramsFromSplit(draft.targets.calories, split),
      },
    });
  }

  // ── Shared chrome ────────────────────────────────────────────
  const progress = (
    <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
      <Text variant="overline" color="textTertiary">
        STEP {step + 1} OF {STEPS.length}
      </Text>
      <View
        style={{
          height: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceSunken,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${((step + 1) / STEPS.length) * 100}%`,
            height: '100%',
            backgroundColor: colors.accent,
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );

  const nav = (continueLabel = 'Continue', onContinue?: () => void, disabled = false) => (
    <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
      <Button
        label={continueLabel}
        fullWidth
        disabled={disabled}
        loading={saving && step === 4}
        onPress={onContinue ?? (() => setStep(step + 1))}
      />
      {step > 0 && (
        <Button label="Back" variant="ghost" fullWidth onPress={() => setStep(step - 1)} />
      )}
      {step === 4 && onCancel && (
        <Button label="Cancel" variant="ghost" fullWidth onPress={onCancel} />
      )}
    </View>
  );

  // ── Step 1: goal ─────────────────────────────────────────────
  if (step === 0 || !draft) {
    return (
      <View>
        {progress}
        <Text variant="h1">What are we{'\n'}working toward?</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
          Pick a direction and I'll draft the plan — targets, rules, the lot.
          You'll fine-tune everything next.
        </Text>
        <View style={{ gap: spacing.md }}>
          {PRESET_ORDER.map((key) => {
            const copy = GOAL_COPY[key];
            return (
              <Card key={key} onPress={() => choosePreset(key)}>
                <Text variant="h3">{copy.title}</Text>
                <Text variant="caption" color="textSecondary" style={{ marginTop: 2, marginBottom: spacing.sm }}>
                  {copy.line}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {presetChips(key).map((chip) => (
                    <Tag key={chip} label={chip} tone="neutral" />
                  ))}
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    );
  }

  const t = draft.targets;
  const r = draft.rules;
  const setTargets = (patch: Partial<Draft['targets']>) =>
    setDraft({ ...draft, targets: { ...draft.targets, ...patch } });
  const setRules = (patch: Partial<Draft['rules']>) =>
    setDraft({ ...draft, rules: { ...draft.rules, ...patch } });

  // ── Step 2: calories ─────────────────────────────────────────
  if (step === 1) {
    return (
      <View>
        {progress}
        <Text variant="h1">Your daily{'\n'}budget</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          I'll judge every scan against this budget — you can change it anytime.
        </Text>

        <Card>
          <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <Text variant="display" style={{ fontVariant: ['tabular-nums'] }}>
              {t.calories.toLocaleString()}
            </Text>
            <Text variant="overline" color="textTertiary">
              KCAL / DAY
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.lg }}>
            {CALORIE_CHIPS.map((kcal) => {
              const selected = t.calories === kcal;
              return (
                <Pressable
                  key={kcal}
                  onPress={() => {
                    selectionFeedback();
                    setTargets({ calories: kcal });
                  }}
                  style={{
                    backgroundColor: selected ? colors.accentSoft : colors.surfaceSunken,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 1,
                  }}
                >
                  <Text variant="caption" color={selected ? 'accent' : 'textSecondary'}>
                    {kcal.toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Stepper
            label="Fine-tune"
            value={t.calories}
            onChange={(n) => setTargets({ calories: n })}
            unit="kcal"
            step={50}
            min={800}
            max={6000}
          />
        </Card>
        {nav()}
      </View>
    );
  }

  // ── Step 3: macro split (the pie-chart moment) ───────────────
  if (step === 2) {
    return (
      <View>
        {progress}
        <Text variant="h1">Split your fuel</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          Drag the balance between protein, carbs, and fat. Grams update live.
        </Text>
        <Card>
          <MacroSplitEditor calories={t.calories} split={split} onChange={setSplit} />
        </Card>
        {nav()}
      </View>
    );
  }

  // ── Step 4: rules ────────────────────────────────────────────
  if (step === 3) {
    return (
      <View>
        {progress}
        <Text variant="h1">Your lines{'\n'}in the sand</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          Anything here turns a scan red on sight. Leave them empty if you have
          no hard lines.
        </Text>

        <Card style={{ marginBottom: spacing.md }}>
          <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
            INGREDIENTS I AVOID
          </Text>
          <ChipInput
            values={r.avoid_ingredients}
            onChange={(v) => setRules({ avoid_ingredients: v })}
            placeholder="e.g. soybean oil, corn syrup"
          />

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

          <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
            ALLERGENS
          </Text>
          <ChipInput
            values={r.avoid_allergens}
            onChange={(v) => setRules({ avoid_allergens: v })}
            placeholder="Add an allergen"
            suggestions={['milk', 'eggs', 'peanuts', 'tree nuts', 'soybeans', 'wheat', 'gluten', 'fish', 'shellfish', 'sesame']}
          />
        </Card>

        {/* Advanced (collapsed by default) */}
        <Card>
          <Pressable
            onPress={() => setAdvancedOpen(!advancedOpen)}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              Advanced limits
            </Text>
            <Ionicons
              name={advancedOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>

          {advancedOpen && (
            <View style={{ marginTop: spacing.md }}>
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

              <Divider />

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

              <Divider />

              <OptionalNumber
                label="Min protein / serving"
                enabled={r.min_protein_per_serving_g !== undefined}
                value={r.min_protein_per_serving_g ?? 10}
                unit="g"
                step={1}
                onToggle={(on) =>
                  setRules({ min_protein_per_serving_g: on ? (r.min_protein_per_serving_g ?? 10) : undefined })
                }
                onChange={(n) => setRules({ min_protein_per_serving_g: n })}
              />

              <Divider />

              <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
                MAX PROCESSING (NOVA)
              </Text>
              <SegmentedControl<NovaOption>
                options={NOVA_OPTIONS}
                value={r.max_nova_group ? (String(r.max_nova_group) as NovaOption) : 'off'}
                onChange={(v) =>
                  setRules({ max_nova_group: v === 'off' ? undefined : Number(v) })
                }
              />

              <Divider />

              <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
                STRICTNESS
              </Text>
              <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.sm }}>
                How hard soft limits push toward red versus amber.
              </Text>
              <SegmentedControl
                options={STRICTNESS_OPTIONS}
                value={draft.strictness}
                onChange={(v) => setDraft({ ...draft, strictness: v })}
              />

              <Divider />

              <OptionalNumber
                label="Daily fiber target"
                enabled={t.fiber_g !== undefined}
                value={t.fiber_g ?? 30}
                unit="g"
                step={1}
                onToggle={(on) => setTargets({ fiber_g: on ? (t.fiber_g ?? 30) : undefined })}
                onChange={(n) => setTargets({ fiber_g: n })}
              />
              <OptionalNumber
                label="Daily sodium target"
                enabled={t.sodium_mg !== undefined}
                value={t.sodium_mg ?? 2000}
                unit="mg"
                step={50}
                onToggle={(on) => setTargets({ sodium_mg: on ? (t.sodium_mg ?? 2000) : undefined })}
                onChange={(n) => setTargets({ sodium_mg: n })}
              />
              <OptionalNumber
                label="Daily added sugar target"
                enabled={t.added_sugar_g !== undefined}
                value={t.added_sugar_g ?? 25}
                unit="g"
                step={1}
                onToggle={(on) => setTargets({ added_sugar_g: on ? (t.added_sugar_g ?? 25) : undefined })}
                onChange={(n) => setTargets({ added_sugar_g: n })}
              />
            </View>
          )}
        </Card>
        {nav()}
      </View>
    );
  }

  // ── Step 5: review ───────────────────────────────────────────
  const grams = gramsFromSplit(t.calories, split);
  const ruleBits: string[] = [];
  if (r.avoid_ingredients.length > 0) {
    ruleBits.push(`avoiding ${r.avoid_ingredients.length} ingredient${r.avoid_ingredients.length === 1 ? '' : 's'}`);
  }
  if (r.avoid_allergens.length > 0) {
    ruleBits.push(`${r.avoid_allergens.length} allergen${r.avoid_allergens.length === 1 ? '' : 's'}`);
  }
  if (r.max_nova_group !== undefined) ruleBits.push(`NOVA ≤ ${r.max_nova_group}`);
  if (r.max_added_sugar_per_serving_g !== undefined) {
    ruleBits.push(`≤${r.max_added_sugar_per_serving_g.value}g added sugar/serving`);
  }
  ruleBits.push(`${draft.strictness} strictness`);

  const editLink = (label: string, toStep: number) => (
    <Pressable onPress={() => setStep(toStep)} hitSlop={8}>
      <Text variant="caption" color="accent">
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View>
      {progress}
      <Text variant="h1">Your plan</Text>
      <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
        Here's what I'll hold you to. Every scan gets judged against this.
      </Text>

      <Card variant="elevated" style={{ marginBottom: spacing.md }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <MacroDonut
            protein_g={grams.protein_g}
            carbs_g={grams.carbs_g}
            fat_g={grams.fat_g}
            size={200}
            centerTitle="Daily target"
            centerValue={t.calories.toLocaleString()}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
          {[
            { label: 'kcal', value: t.calories.toLocaleString() },
            { label: 'protein', value: `${grams.protein_g}g` },
            { label: 'carbs', value: `${grams.carbs_g}g` },
            { label: 'fat', value: `${grams.fat_g}g` },
          ].map((m) => (
            <View key={m.label} style={{ alignItems: 'center' }}>
              <Text variant="numberMd">{m.value}</Text>
              <Text variant="overline" color="textTertiary">
                {m.label.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {r.diet_tags.map((tag) => (
            <Tag key={tag} label={tag} tone="accent" />
          ))}
          {chosenPreset && <Tag label={GOAL_COPY[chosenPreset].title} tone="neutral" />}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
          {editLink('Edit budget', 1)}
          {editLink('Edit macros', 2)}
          {editLink('Edit rules', 3)}
        </View>
      </Card>

      <Card variant="sunken" style={{ marginBottom: spacing.md }}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
          THE RULES
        </Text>
        <Text variant="body" color="textSecondary">
          {ruleBits.length > 0
            ? ruleBits.join(' · ').replace(/^./, (c) => c.toUpperCase())
            : 'No hard rules — I\'ll just track your budget.'}
        </Text>
      </Card>

      {error && (
        <Text variant="caption" color="red" style={{ marginBottom: spacing.sm }}>
          {error}
        </Text>
      )}

      {nav(initial ? 'Save changes' : 'Lock it in', finish)}

      <Text variant="caption" color="textTertiary" align="center" style={{ marginTop: spacing.lg }}>
        Not medical advice — this is your plan, and you can change it anytime.
      </Text>
    </View>
  );
}

// ── Local controls (modeled on GoalsEditor's, kept private there) ──

function Divider() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
  );
}

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
