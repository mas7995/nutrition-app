import { DailyTargets } from '@/types/diet';
import { FoodLog } from '@/types/log';
import { BudgetFit } from '@/types/verdict';
import {
  CoachInput,
  buildCoachBriefing,
  expectedProteinFraction,
} from './coach';

// ── Fixtures ─────────────────────────────────────────────────────
let logSeq = 0;

function makeLog(overrides: Partial<FoodLog> = {}): FoodLog {
  logSeq += 1;
  return {
    id: `log-${logSeq}`,
    user_id: 'u1',
    barcode: null,
    name: 'Test food',
    meal: 'lunch',
    nutrients: { calories: 300, protein_g: 25, carbs_g: 20, fat_g: 10 },
    servings: 1,
    verdict: 'green',
    reasons: [],
    logged_at: '2026-07-17T12:00:00.000Z',
    ...overrides,
  };
}

const targets: DailyTargets = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 70,
};

function budget(partial: Partial<BudgetFit> = {}): BudgetFit {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, ...partial };
}

function makeInput(overrides: Partial<CoachInput> = {}): CoachInput {
  const logs = overrides.logs ?? [makeLog(), makeLog()];
  const consumed =
    overrides.consumed ?? budget({ calories: 800, protein_g: 60, carbs_g: 70, fat_g: 25 });
  const remaining =
    overrides.remaining ??
    budget({
      calories: targets.calories - consumed.calories,
      protein_g: targets.protein_g - consumed.protein_g,
      carbs_g: targets.carbs_g - consumed.carbs_g,
      fat_g: targets.fat_g - consumed.fat_g,
    });
  return {
    displayName: 'Sierra',
    hour: 12,
    targets,
    rules: { avoid_ingredients: [], avoid_allergens: [], diet_tags: ['custom'] },
    strictness: 'balanced',
    ...overrides,
    consumed,
    remaining,
    logs,
  };
}

// ── Greeting ─────────────────────────────────────────────────────
describe('greeting', () => {
  const cases: [number, string][] = [
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [21, 'Good evening'],
    [22, 'Still up'],
    [2, 'Still up'],
  ];
  it.each(cases)('hour %i → "%s"', (hour, expected) => {
    const b = buildCoachBriefing(makeInput({ hour }));
    expect(b.greeting).toBe(`${expected}, Sierra`);
  });

  it('omits the name when displayName is null', () => {
    const b = buildCoachBriefing(makeInput({ displayName: null, hour: 9 }));
    expect(b.greeting).toBe('Good morning');
  });
});

// ── Empty day ────────────────────────────────────────────────────
describe('empty day', () => {
  it('invites the first scan with one info message', () => {
    const b = buildCoachBriefing(makeInput({ logs: [] }));
    expect(b.headline).toContain('2,000 kcal planned');
    expect(b.messages).toHaveLength(1);
    expect(b.messages[0]?.tone).toBe('info');
  });
});

// ── Calories over ────────────────────────────────────────────────
describe('calories over budget', () => {
  it('emits a warning with the overage', () => {
    const b = buildCoachBriefing(
      makeInput({
        consumed: budget({ calories: 2300, protein_g: 120, carbs_g: 200, fat_g: 90 }),
        remaining: budget({ calories: -300, protein_g: 30, carbs_g: 0, fat_g: -20 }),
      }),
    );
    const warn = b.messages.find((m) => m.title === 'Over on calories');
    expect(warn?.tone).toBe('warning');
    expect(warn?.body).toContain('300');
  });
});

// ── Protein pacing ───────────────────────────────────────────────
describe('protein pacing', () => {
  it('expectedProteinFraction interpolates between anchors', () => {
    expect(expectedProteinFraction(5)).toBe(0);
    expect(expectedProteinFraction(11)).toBeCloseTo(0.33);
    expect(expectedProteinFraction(14)).toBeCloseTo(0.495, 2);
    expect(expectedProteinFraction(17)).toBeCloseTo(0.66);
    expect(expectedProteinFraction(23)).toBe(1);
  });

  it('nudges when protein is >20 points behind pace', () => {
    // At 17h expected 0.66; consumed 30/150 = 0.2 → lagging.
    const b = buildCoachBriefing(
      makeInput({
        hour: 17,
        consumed: budget({ calories: 900, protein_g: 30, carbs_g: 100, fat_g: 30 }),
        remaining: budget({ calories: 1100, protein_g: 120, carbs_g: 100, fat_g: 40 }),
      }),
    );
    const nudge = b.messages.find((m) => m.title === 'Protein is lagging');
    expect(nudge?.tone).toBe('nudge');
    expect(nudge?.body).toContain('30g of 150g');
  });

  it('does not nudge when within 20 points of pace', () => {
    // At 12h expected ≈0.385; consumed 60/150 = 0.4 → fine.
    const b = buildCoachBriefing(
      makeInput({
        hour: 12,
        consumed: budget({ calories: 800, protein_g: 60, carbs_g: 70, fat_g: 25 }),
        remaining: budget({ calories: 1200, protein_g: 90, carbs_g: 130, fat_g: 45 }),
      }),
    );
    expect(b.messages.find((m) => m.title === 'Protein is lagging')).toBeUndefined();
  });
});

// ── Red items ────────────────────────────────────────────────────
describe('red items', () => {
  it('warns and names an off-plan item', () => {
    const b = buildCoachBriefing(
      makeInput({ logs: [makeLog({ verdict: 'red', name: 'Soda' }), makeLog()] }),
    );
    const warn = b.messages.find((m) => m.title.includes('off-plan'));
    expect(warn?.tone).toBe('warning');
    expect(warn?.body).toContain('Soda');
  });
});

// ── Praise ───────────────────────────────────────────────────────
describe('praise', () => {
  it('praises an all-green day of 2+ items', () => {
    const b = buildCoachBriefing(makeInput({ logs: [makeLog(), makeLog()] }));
    expect(b.messages.find((m) => m.tone === 'praise')?.title).toBe('All green so far');
  });

  it('withholds praise when over on calories', () => {
    const b = buildCoachBriefing(
      makeInput({
        logs: [makeLog(), makeLog()],
        consumed: budget({ calories: 2400, protein_g: 150, carbs_g: 200, fat_g: 80 }),
        remaining: budget({ calories: -400, protein_g: 0, carbs_g: 0, fat_g: -10 }),
      }),
    );
    expect(b.messages.find((m) => m.tone === 'praise')).toBeUndefined();
  });
});

// ── Optional daily targets ───────────────────────────────────────
describe('sodium / added sugar targets', () => {
  const sodiumTargets: DailyTargets = { ...targets, sodium_mg: 2000 };

  it('flags approaching sodium at 80%+', () => {
    const logs = [
      makeLog({ nutrients: { calories: 400, protein_g: 30, carbs_g: 30, fat_g: 15, sodium_mg: 900 } }),
      makeLog({ nutrients: { calories: 400, protein_g: 30, carbs_g: 30, fat_g: 15, sodium_mg: 800 } }),
    ];
    const b = buildCoachBriefing(makeInput({ targets: sodiumTargets, logs }));
    const msg = b.messages.find((m) => m.title.includes('sodium'));
    expect(msg?.tone).toBe('info');
    expect(msg?.body).toContain('1,700');
  });

  it('honors servings when summing', () => {
    const logs = [
      makeLog({
        servings: 2,
        nutrients: { calories: 400, protein_g: 30, carbs_g: 30, fat_g: 15, sodium_mg: 850 },
      }),
    ];
    const b = buildCoachBriefing(makeInput({ targets: sodiumTargets, logs }));
    expect(b.messages.find((m) => m.title.includes('sodium'))?.body).toContain('1,700');
  });

  it('skips the message entirely when no log reports sodium', () => {
    const b = buildCoachBriefing(makeInput({ targets: sodiumTargets }));
    expect(b.messages.find((m) => m.title.includes('sodium'))).toBeUndefined();
  });
});

// ── Cap and ordering ─────────────────────────────────────────────
describe('message cap and priority', () => {
  it('caps at 3 messages, worst-first', () => {
    // Force: over-calories warning, red warning, protein nudge, sodium info.
    const logs = [
      makeLog({
        verdict: 'red',
        name: 'Candy',
        nutrients: { calories: 500, protein_g: 5, carbs_g: 80, fat_g: 20, sodium_mg: 1900 },
      }),
      makeLog({ nutrients: { calories: 400, protein_g: 10, carbs_g: 40, fat_g: 15, sodium_mg: 100 } }),
    ];
    const b = buildCoachBriefing(
      makeInput({
        hour: 18,
        targets: { ...targets, sodium_mg: 2000 },
        logs,
        consumed: budget({ calories: 2300, protein_g: 15, carbs_g: 120, fat_g: 35 }),
        remaining: budget({ calories: -300, protein_g: 135, carbs_g: 80, fat_g: 35 }),
      }),
    );
    expect(b.messages).toHaveLength(3);
    expect(b.messages.map((m) => m.tone)).toEqual(['warning', 'warning', 'nudge']);
  });
});

// ── Headline ─────────────────────────────────────────────────────
describe('headline', () => {
  it('says on track for a clean day', () => {
    const b = buildCoachBriefing(makeInput());
    expect(b.headline).toContain("you're on track");
    expect(b.headline).toContain('1,200 kcal left');
  });

  it('shifts to evening framing when something is off after 17h', () => {
    const b = buildCoachBriefing(
      makeInput({
        hour: 19,
        logs: [makeLog({ verdict: 'red', name: 'Chips' })],
      }),
    );
    expect(b.headline).toContain('land the evening');
  });
});
