import {
  BALANCED_SPLIT,
  MacroSplit,
  gramsFromSplit,
  rebalanceSplit,
  splitFromTargets,
} from './split';

const sum = (s: MacroSplit) => s.proteinPct + s.carbsPct + s.fatPct;

describe('rebalanceSplit', () => {
  it('always sums to exactly 100', () => {
    let s: MacroSplit = { ...BALANCED_SPLIT };
    for (const next of [45, 5, 80, 33, 7]) {
      s = rebalanceSplit(s, 'proteinPct', next);
      expect(sum(s)).toBe(100);
      s = rebalanceSplit(s, 'fatPct', next);
      expect(sum(s)).toBe(100);
    }
  });

  it('clamps the edited macro to [5, 80]', () => {
    expect(rebalanceSplit(BALANCED_SPLIT, 'proteinPct', 200).proteinPct).toBe(80);
    expect(rebalanceSplit(BALANCED_SPLIT, 'proteinPct', -10).proteinPct).toBe(5);
  });

  it('redistributes proportionally to the other two macros', () => {
    // carbs:fat currently 40:30 → raising protein to 50 leaves 50 split ≈ 29:21.
    const s = rebalanceSplit(BALANCED_SPLIT, 'proteinPct', 50);
    expect(s.proteinPct).toBe(50);
    expect(s.carbsPct).toBe(29);
    expect(s.fatPct).toBe(21);
  });

  it('keeps the untouched macros at or above the 5% floor', () => {
    const skewed: MacroSplit = { proteinPct: 80, carbsPct: 15, fatPct: 5 };
    const s = rebalanceSplit(skewed, 'proteinPct', 80);
    expect(s.carbsPct).toBeGreaterThanOrEqual(5);
    expect(s.fatPct).toBeGreaterThanOrEqual(5);
    expect(sum(s)).toBe(100);
  });
});

describe('splitFromTargets', () => {
  it('round-trips a typical plan', () => {
    // 150p/200c/70f ≈ 2030 kcal → 30/39/31.
    const s = splitFromTargets({ calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 70 });
    expect(sum(s)).toBe(100);
    expect(s.proteinPct).toBeGreaterThanOrEqual(28);
    expect(s.proteinPct).toBeLessThanOrEqual(32);
  });

  it('handles keto-shaped targets', () => {
    const s = splitFromTargets({ calories: 2000, protein_g: 120, carbs_g: 30, fat_g: 155 });
    expect(sum(s)).toBe(100);
    expect(s.fatPct).toBeGreaterThan(s.carbsPct);
  });

  it('falls back to balanced on degenerate input', () => {
    expect(splitFromTargets({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })).toEqual(
      BALANCED_SPLIT,
    );
  });
});

describe('gramsFromSplit', () => {
  it('computes grams with 4/4/9 kcal per gram', () => {
    const g = gramsFromSplit(2000, { proteinPct: 30, carbsPct: 40, fatPct: 30 });
    expect(g).toEqual({ protein_g: 150, carbs_g: 200, fat_g: 67 });
  });
});
