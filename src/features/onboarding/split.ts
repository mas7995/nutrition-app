import { DailyTargets } from '@/types/diet';

/**
 * Macro split math for the onboarding wizard. A split is integer percentages
 * of daily CALORIES (not grams) that always sum to exactly 100.
 */

export interface MacroSplit {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export const MIN_PCT = 5;
export const MAX_PCT = 80;

const KEYS: (keyof MacroSplit)[] = ['proteinPct', 'carbsPct', 'fatPct'];

export const BALANCED_SPLIT: MacroSplit = { proteinPct: 30, carbsPct: 40, fatPct: 30 };

/**
 * Set one macro's percentage and redistribute the difference across the other
 * two proportionally to their current values. Result is integers summing to
 * exactly 100, each within [MIN_PCT, MAX_PCT-ish bounds].
 */
export function rebalanceSplit(
  split: MacroSplit,
  key: keyof MacroSplit,
  next: number,
): MacroSplit {
  const clamped = Math.max(MIN_PCT, Math.min(MAX_PCT, Math.round(next)));
  const others = KEYS.filter((k) => k !== key) as [keyof MacroSplit, keyof MacroSplit];
  const [k1, k2] = others;
  const remainder = 100 - clamped;
  const otherTotal = split[k1] + split[k2];

  let v1 =
    otherTotal <= 0
      ? Math.round(remainder / 2)
      : Math.round((split[k1] / otherTotal) * remainder);
  // Keep both remaining macros at or above the floor.
  v1 = Math.max(MIN_PCT, Math.min(remainder - MIN_PCT, v1));
  const v2 = remainder - v1;

  return { ...split, [key]: clamped, [k1]: v1, [k2]: v2 };
}

/** Derive a split from gram targets (4 kcal/g protein & carbs, 9 kcal/g fat). */
export function splitFromTargets(targets: DailyTargets): MacroSplit {
  const pK = Math.max(0, targets.protein_g) * 4;
  const cK = Math.max(0, targets.carbs_g) * 4;
  const fK = Math.max(0, targets.fat_g) * 9;
  const total = pK + cK + fK;
  if (total <= 0) return { ...BALANCED_SPLIT };

  let p = Math.round((pK / total) * 100);
  let c = Math.round((cK / total) * 100);
  p = Math.max(MIN_PCT, Math.min(MAX_PCT, p));
  c = Math.max(MIN_PCT, Math.min(MAX_PCT, c));
  let f = 100 - p - c;

  // Repair out-of-bounds fat by pulling from / giving to the larger macro.
  if (f < MIN_PCT) {
    const deficit = MIN_PCT - f;
    if (p >= c) p -= deficit;
    else c -= deficit;
    f = MIN_PCT;
  } else if (f > MAX_PCT) {
    const excess = f - MAX_PCT;
    if (p >= c) p += excess;
    else c += excess;
    f = MAX_PCT;
  }
  return { proteinPct: p, carbsPct: c, fatPct: f };
}

/** Convert a calorie budget + split into rounded gram targets. */
export function gramsFromSplit(
  calories: number,
  split: MacroSplit,
): { protein_g: number; carbs_g: number; fat_g: number } {
  return {
    protein_g: Math.round((calories * split.proteinPct) / 100 / 4),
    carbs_g: Math.round((calories * split.carbsPct) / 100 / 4),
    fat_g: Math.round((calories * split.fatPct) / 100 / 9),
  };
}
