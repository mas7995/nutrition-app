import { DietProfile, DietRules } from '@/types/diet';
import { NormalizedFood, NutrientsPerServing } from '@/types/food';
import { BudgetFit } from '@/types/verdict';
import { evaluateAlignment } from './alignment';

// ── Fixtures ─────────────────────────────────────────────────────
function makeFood(
  nutrients: Partial<NutrientsPerServing> = {},
  overrides: Partial<NormalizedFood> = {},
): NormalizedFood {
  return {
    barcode: '0000000000000',
    source: 'off',
    name: 'Test Food',
    brand: null,
    image_url: null,
    serving: { qty: 1, unit: 'serving', weight_g: 100 },
    nutrients_per_serving: {
      calories: 150,
      protein_g: 12,
      carbs_g: 10,
      fat_g: 6,
      ...nutrients,
    },
    ingredients_text: 'Water, oats, salt',
    allergens: [],
    data_complete: true,
    ...overrides,
  };
}

function makeProfile(
  rules: Partial<DietRules> = {},
  overrides: Partial<DietProfile> = {},
): DietProfile {
  return {
    user_id: 'u1',
    targets: { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 70 },
    rules: {
      avoid_ingredients: [],
      avoid_allergens: [],
      diet_tags: ['custom'],
      ...rules,
    },
    strictness: 'balanced',
    ...overrides,
  };
}

/** A generous remaining budget so budget rules don't fire unless intended. */
const roomy: BudgetFit = {
  calories: 1500,
  protein_g: 120,
  carbs_g: 150,
  fat_g: 55,
};

// ── Green ────────────────────────────────────────────────────────
describe('green — fits the plan', () => {
  it('returns green with at least one reason when nothing fires', () => {
    const result = evaluateAlignment(makeFood(), makeProfile(), roomy);
    expect(result.verdict).toBe('green');
    // A verdict with no reasons is a bug.
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]?.metric).toBe('summary');
  });

  it('reports remaining budget after the item', () => {
    const result = evaluateAlignment(
      makeFood({ calories: 200, protein_g: 20, carbs_g: 15, fat_g: 8 }),
      makeProfile(),
      roomy,
    );
    expect(result.budgetFit).toEqual({
      calories: 1300,
      protein_g: 100,
      carbs_g: 135,
      fat_g: 47,
    });
  });
});

// ── Red: hard exclusions ─────────────────────────────────────────
describe('red — hard exclusions', () => {
  it('flags an avoided ingredient (case-insensitive substring)', () => {
    const food = makeFood({}, { ingredients_text: 'Water, Soybean Oil, Salt' });
    const profile = makeProfile({ avoid_ingredients: ['soybean oil'] });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('red');
    expect(result.reasons[0]?.severity).toBe('block');
    expect(result.reasons[0]?.metric).toBe('ingredient:soybean oil');
  });

  it('flags an avoided allergen present in the allergen tags', () => {
    const food = makeFood({}, { allergens: ['milk', 'soybeans'] });
    const profile = makeProfile({ avoid_allergens: ['milk'] });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('red');
    expect(result.reasons.some((r) => r.metric === 'allergen:milk')).toBe(true);
  });

  it('treats a STRICT per-serving cap breach as red', () => {
    const food = makeFood({ added_sugar_g: 18 });
    const profile = makeProfile({
      max_added_sugar_per_serving_g: { value: 10, strict: true },
    });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('red');
    const r = result.reasons.find((x) => x.metric === 'added_sugar');
    expect(r?.severity).toBe('block');
    expect(r?.value).toBe(18);
    expect(r?.limit).toBe(10);
  });
});

// ── Amber: soft limits ───────────────────────────────────────────
describe('amber — soft limits', () => {
  it('flags a non-strict added-sugar breach as caution', () => {
    const food = makeFood({ added_sugar_g: 14 });
    const profile = makeProfile({
      max_added_sugar_per_serving_g: { value: 10, strict: false },
    });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('amber');
    expect(
      result.reasons.find((r) => r.metric === 'added_sugar')?.severity,
    ).toBe('caution');
  });

  it('flags NOVA above the max as caution', () => {
    const food = makeFood({}, { nova_group: 4 });
    const profile = makeProfile({ max_nova_group: 2 });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('amber');
    expect(result.reasons.some((r) => r.metric === 'nova')).toBe(true);
  });

  it('flags low protein per serving when a minimum is set', () => {
    const food = makeFood({ protein_g: 3 });
    const profile = makeProfile({ min_protein_per_serving_g: 10 });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('amber');
    expect(result.reasons.some((r) => r.metric === 'protein')).toBe(true);
  });

  it('flags a serving that busts the remaining budget beyond tolerance', () => {
    // remaining calories 100, item 400 -> 300 over > 10% of 2000 (=200).
    const tight: BudgetFit = { calories: 100, protein_g: 50, carbs_g: 100, fat_g: 40 };
    const food = makeFood({ calories: 400 });
    const result = evaluateAlignment(food, makeProfile(), tight);
    expect(result.verdict).toBe('amber');
    expect(result.reasons.some((r) => r.metric === 'budget:calories')).toBe(true);
  });

  it('does NOT flag a small overshoot within tolerance', () => {
    // remaining 100, item 250 -> 150 over < 200 tolerance.
    const tight: BudgetFit = { calories: 100, protein_g: 50, carbs_g: 100, fat_g: 40 };
    const food = makeFood({ calories: 250 });
    const result = evaluateAlignment(food, makeProfile(), tight);
    expect(result.reasons.some((r) => r.metric === 'budget:calories')).toBe(false);
  });
});

// ── Missing data ─────────────────────────────────────────────────
describe('missing data — disclose, never silently pass', () => {
  it('emits an ok reason when a sugar limit exists but sugar is unreported', () => {
    const food = makeFood({ added_sugar_g: undefined });
    const profile = makeProfile({
      max_added_sugar_per_serving_g: { value: 10, strict: true },
    });
    const result = evaluateAlignment(food, profile, roomy);
    // Not red (couldn't evaluate) but the gap is disclosed.
    expect(result.verdict).toBe('green');
    const r = result.reasons.find((x) => x.metric === 'added_sugar');
    expect(r?.severity).toBe('ok');
    expect(r?.message).toMatch(/not reported/i);
  });

  it('discloses when ingredients are missing but ingredients are avoided', () => {
    const food = makeFood({}, { ingredients_text: null });
    const profile = makeProfile({ avoid_ingredients: ['soybean oil'] });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.reasons.some((r) => r.metric === 'ingredients' && r.severity === 'ok')).toBe(true);
  });

  it('discloses when NOVA is unreported but a NOVA limit is set', () => {
    const food = makeFood({}, { nova_group: undefined });
    const profile = makeProfile({ max_nova_group: 2 });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.reasons.some((r) => r.metric === 'nova' && r.severity === 'ok')).toBe(true);
  });
});

// ── Strictness ───────────────────────────────────────────────────
describe('strictness', () => {
  it('escalates a soft breach to red under strict mode', () => {
    const food = makeFood({ added_sugar_g: 14 });
    const profile = makeProfile(
      { max_added_sugar_per_serving_g: { value: 10, strict: false } },
      { strictness: 'strict' },
    );
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('red');
  });

  it('keeps the same breach as amber under balanced mode', () => {
    const food = makeFood({ added_sugar_g: 14 });
    const profile = makeProfile({
      max_added_sugar_per_serving_g: { value: 10, strict: false },
    });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('amber');
  });
});

// ── Ordering & precedence ────────────────────────────────────────
describe('reason ordering', () => {
  it('sorts reasons worst-first (block before caution before ok)', () => {
    const food = makeFood(
      { added_sugar_g: 30, protein_g: 1 },
      { ingredients_text: 'Water, Soybean Oil', nova_group: 4 },
    );
    const profile = makeProfile({
      avoid_ingredients: ['soybean oil'],
      max_added_sugar_per_serving_g: { value: 10, strict: false },
      min_protein_per_serving_g: 10,
      max_nova_group: 2,
    });
    const result = evaluateAlignment(food, profile, roomy);
    expect(result.verdict).toBe('red');
    const ranks = result.reasons.map((r) =>
      r.severity === 'block' ? 0 : r.severity === 'caution' ? 1 : 2,
    );
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });
});
