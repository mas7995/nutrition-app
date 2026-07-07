import { DietProfile, Strictness } from '@/types/diet';
import { NormalizedFood } from '@/types/food';
import {
  AlignmentResult,
  BudgetFit,
  Reason,
  Severity,
  Verdict,
} from '@/types/verdict';

/**
 * The alignment engine. Pure, no side effects, no network.
 *
 * Given a normalized food, the client's diet profile, and the day's remaining
 * macro budget, decide whether the food fits — green / amber / red — and
 * explain every decision with real numbers.
 *
 * Rule order (as specified):
 *   1. Hard exclusions   -> red   (block)   — avoided ingredient/allergen, or a
 *                                             strict per-serving cap exceeded.
 *   2. Soft limits       -> amber (caution) — soft sugar/sodium/NOVA/protein or
 *                                             a serving that busts the budget.
 *   3. Otherwise         -> green.
 *
 * Missing data is never silently passed: when a rule can't be evaluated because
 * the source omitted a field, we emit an `ok` reason disclosing the gap.
 */
export function evaluateAlignment(
  food: NormalizedFood,
  profile: DietProfile,
  remaining: BudgetFit,
): AlignmentResult {
  const reasons: Reason[] = [];
  const add = (
    severity: Severity,
    metric: string,
    message: string,
    value?: number,
    limit?: number,
  ) => reasons.push({ severity, metric, message, value, limit });

  const rules = profile.rules;
  const n = food.nutrients_per_serving;
  const { budgetTolerance, softLimitsEscalate } = strictnessConfig(
    profile.strictness,
  );

  // ── 1a. Avoided ingredients (hard) ─────────────────────────────
  if (rules.avoid_ingredients.length > 0) {
    if (!food.ingredients_text) {
      add(
        'ok',
        'ingredients',
        "Ingredients aren't listed for this product, so your avoided " +
          "ingredients couldn't be checked",
      );
    } else {
      const text = food.ingredients_text.toLowerCase();
      for (const ing of rules.avoid_ingredients) {
        if (text.includes(ing.toLowerCase())) {
          add('block', `ingredient:${ing}`, `Contains "${ing}", which you avoid`);
        }
      }
    }
  }

  // ── 1b. Avoided allergens (hard) ───────────────────────────────
  if (rules.avoid_allergens.length > 0) {
    const hasAllergenInfo =
      food.allergens.length > 0 || Boolean(food.ingredients_text);
    if (!hasAllergenInfo) {
      add(
        'ok',
        'allergens',
        "Allergen info isn't reported for this product",
      );
    } else {
      const foodAllergens = food.allergens.map((a) => a.toLowerCase());
      const text = food.ingredients_text?.toLowerCase() ?? '';
      for (const al of rules.avoid_allergens) {
        const target = al.toLowerCase();
        const inTags = foodAllergens.some(
          (fa) => fa.includes(target) || target.includes(fa),
        );
        const inText = text.includes(target);
        if (inTags || inText) {
          add('block', `allergen:${al}`, `Contains ${al}, an allergen you avoid`);
        }
      }
    }
  }

  // ── 1c/2a. Added sugar per-serving limit ───────────────────────
  if (rules.max_added_sugar_per_serving_g) {
    const { value: limit, strict } = rules.max_added_sugar_per_serving_g;
    const sugar = n.added_sugar_g;
    if (sugar === undefined) {
      add('ok', 'added_sugar', 'Added sugar not reported for this product');
    } else if (sugar > limit) {
      const severity: Severity =
        strict || softLimitsEscalate ? 'block' : 'caution';
      add(
        severity,
        'added_sugar',
        `Added sugar ${round(sugar)}g exceeds your ${limit}g/serving limit`,
        sugar,
        limit,
      );
    }
  }

  // ── 1c/2b. Sodium per-serving limit ────────────────────────────
  if (rules.max_sodium_per_serving_mg) {
    const { value: limit, strict } = rules.max_sodium_per_serving_mg;
    const sodium = n.sodium_mg;
    if (sodium === undefined) {
      add('ok', 'sodium', 'Sodium not reported for this product');
    } else if (sodium > limit) {
      const severity: Severity =
        strict || softLimitsEscalate ? 'block' : 'caution';
      add(
        severity,
        'sodium',
        `Sodium ${round(sodium)}mg exceeds your ${limit}mg/serving limit`,
        sodium,
        limit,
      );
    }
  }

  // ── 2c. Minimum protein per serving (soft) ─────────────────────
  // Interpreted as low protein for the serving: a food that contributes little
  // protein toward a protein-focused goal earns a caution.
  if (rules.min_protein_per_serving_g !== undefined) {
    if (n.protein_g < rules.min_protein_per_serving_g) {
      add(
        'caution',
        'protein',
        `Protein ${round(n.protein_g)}g/serving is below your ${rules.min_protein_per_serving_g}g minimum`,
        n.protein_g,
        rules.min_protein_per_serving_g,
      );
    }
  }

  // ── 2d. Processing level / NOVA (soft) ─────────────────────────
  if (rules.max_nova_group !== undefined) {
    if (food.nova_group === undefined) {
      add('ok', 'nova', 'Processing level (NOVA) not reported for this product');
    } else if (food.nova_group > rules.max_nova_group) {
      const severity: Severity = softLimitsEscalate ? 'block' : 'caution';
      add(
        severity,
        'nova',
        `Ultra-processed: NOVA ${food.nova_group} is above your limit of ${rules.max_nova_group}`,
        food.nova_group,
        rules.max_nova_group,
      );
    }
  }

  // ── 2e. Budget fit (soft) ──────────────────────────────────────
  // Going over remaining calories/carbs/fat by more than tolerance × target is
  // a caution. Protein over target is never penalized (more is fine).
  const budgetChecks: {
    metric: 'calories' | 'carbs' | 'fat';
    value: number;
    rem: number;
    target: number;
    unit: string;
    label: string;
  }[] = [
    {
      metric: 'calories',
      value: n.calories,
      rem: remaining.calories,
      target: profile.targets.calories,
      unit: 'kcal',
      label: 'calories',
    },
    {
      metric: 'carbs',
      value: n.carbs_g,
      rem: remaining.carbs_g,
      target: profile.targets.carbs_g,
      unit: 'g',
      label: 'carbs',
    },
    {
      metric: 'fat',
      value: n.fat_g,
      rem: remaining.fat_g,
      target: profile.targets.fat_g,
      unit: 'g',
      label: 'fat',
    },
  ];

  for (const c of budgetChecks) {
    const overshoot = c.value - c.rem; // >0 means it busts the remaining budget
    const allowed = budgetTolerance * c.target;
    if (overshoot > allowed) {
      add(
        'caution',
        `budget:${c.metric}`,
        `Puts you ${round(overshoot)}${c.unit} over your remaining ${c.label} for today`,
        c.value,
        Math.max(0, c.rem),
      );
    }
  }

  // ── Budget fit output (remaining after this item) ──────────────
  const budgetFit: BudgetFit = {
    calories: remaining.calories - n.calories,
    protein_g: remaining.protein_g - n.protein_g,
    carbs_g: remaining.carbs_g - n.carbs_g,
    fat_g: remaining.fat_g - n.fat_g,
  };

  // ── Verdict ────────────────────────────────────────────────────
  const hasBlock = reasons.some((r) => r.severity === 'block');
  const hasCaution = reasons.some((r) => r.severity === 'caution');
  const verdict: Verdict = hasBlock ? 'red' : hasCaution ? 'amber' : 'green';

  // A green verdict still deserves an explanation. Lead with a positive note,
  // then any data-gap disclosures already collected.
  if (verdict === 'green') {
    const proteinNote =
      n.protein_g > 0 ? ` Adds ${round(n.protein_g)}g protein.` : '';
    reasons.unshift({
      severity: 'ok',
      metric: 'summary',
      message: `Fits your plan and today's remaining budget.${proteinNote}`,
    });
  }

  reasons.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return { verdict, reasons, budgetFit };
}

function strictnessConfig(strictness: Strictness): {
  budgetTolerance: number;
  softLimitsEscalate: boolean;
} {
  switch (strictness) {
    case 'lenient':
      return { budgetTolerance: 0.2, softLimitsEscalate: false };
    case 'strict':
      // Soft per-serving/NOVA breaches are treated as hard (red).
      return { budgetTolerance: 0.05, softLimitsEscalate: true };
    case 'balanced':
    default:
      return { budgetTolerance: 0.1, softLimitsEscalate: false };
  }
}

function severityRank(s: Severity): number {
  return s === 'block' ? 0 : s === 'caution' ? 1 : 2;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
