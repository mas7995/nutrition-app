import { DailyTargets, DietRules, Strictness } from '@/types/diet';
import { FoodLog } from '@/types/log';
import { BudgetFit } from '@/types/verdict';

/**
 * The coach engine. Pure, deterministic, no side effects — like the alignment
 * engine, but pointed at the day instead of a single food. Given the client's
 * targets, what they've eaten, and the local hour, it produces a greeting, a
 * one-line day status, and up to three guidance messages with real numbers.
 */

export type CoachTone = 'praise' | 'nudge' | 'warning' | 'info';

export interface CoachMessage {
  tone: CoachTone;
  /** Short bold lead, e.g. "Protein is lagging". */
  title: string;
  /** One or two sentences with real numbers. */
  body: string;
}

export interface CoachInput {
  displayName: string | null;
  /** Local hour 0–23. */
  hour: number;
  targets: DailyTargets;
  consumed: BudgetFit;
  remaining: BudgetFit;
  /** Today's logs, newest first. */
  logs: FoodLog[];
  rules: DietRules;
  strictness: Strictness;
}

export interface CoachBriefing {
  /** e.g. "Good morning, Sierra". */
  greeting: string;
  /** One-line day status, e.g. "1,240 kcal left — you're on track." */
  headline: string;
  /** Worst-first, max 3. */
  messages: CoachMessage[];
}

const MAX_MESSAGES = 3;

const TONE_RANK: Record<CoachTone, number> = {
  warning: 0,
  nudge: 1,
  praise: 2,
  info: 3,
};

function greetingFor(hour: number, displayName: string | null): string {
  const base =
    hour >= 5 && hour <= 11
      ? 'Good morning'
      : hour >= 12 && hour <= 16
        ? 'Good afternoon'
        : hour >= 17 && hour <= 21
          ? 'Good evening'
          : 'Still up';
  return displayName ? `${base}, ${displayName}` : base;
}

/**
 * Expected fraction of daily protein consumed by a given hour. Anchors:
 * (5h, 0) → (11h, 0.33) → (17h, 0.66) → (21h, 1.0), linear in between.
 */
export function expectedProteinFraction(hour: number): number {
  const anchors: [number, number][] = [
    [5, 0],
    [11, 0.33],
    [17, 0.66],
    [21, 1],
  ];
  const first = anchors[0] as [number, number];
  const last = anchors[anchors.length - 1] as [number, number];
  if (hour <= first[0]) return first[1];
  if (hour >= last[0]) return last[1];
  for (let i = 1; i < anchors.length; i++) {
    const [h1, f1] = anchors[i] as [number, number];
    const [h0, f0] = anchors[i - 1] as [number, number];
    if (hour <= h1) {
      return f0 + ((hour - h0) / (h1 - h0)) * (f1 - f0);
    }
  }
  return last[1];
}

function mealsRemaining(hour: number): number {
  if (hour < 11) return 3;
  if (hour < 15) return 2;
  return 1;
}

/** Sum a per-serving nutrient across logs, honoring servings. Returns null
 * when NO log reports the field — missing data is disclosed, never invented. */
function sumLoggedNutrient(
  logs: FoodLog[],
  pick: (n: FoodLog['nutrients']) => number | undefined,
): number | null {
  let any = false;
  let total = 0;
  for (const log of logs) {
    const v = pick(log.nutrients);
    if (v !== undefined) {
      any = true;
      total += v * (log.servings || 1);
    }
  }
  return any ? total : null;
}

export function buildCoachBriefing(input: CoachInput): CoachBriefing {
  const { displayName, hour, targets, consumed, remaining, logs } = input;
  const greeting = greetingFor(hour, displayName);
  const round = Math.round;

  // ── Empty day: one calm invitation, nothing else ───────────────
  if (logs.length === 0) {
    return {
      greeting,
      headline: `${round(targets.calories).toLocaleString()} kcal planned — scan your first item when you're ready.`,
      messages: [
        {
          tone: 'info',
          title: 'Your coach is watching the numbers',
          body:
            'Log what you eat and I’ll pace your protein, watch your limits, ' +
            'and tell you how each choice lands against your plan.',
        },
      ],
    };
  }

  const messages: CoachMessage[] = [];

  // ── Calories over budget ───────────────────────────────────────
  const overCalories = remaining.calories < 0;
  if (overCalories) {
    messages.push({
      tone: 'warning',
      title: 'Over on calories',
      body: `You're ${round(Math.abs(remaining.calories)).toLocaleString()} kcal past today's ${round(
        targets.calories,
      ).toLocaleString()} budget. Keep the rest of the day light.`,
    });
  }

  // ── Red items today ────────────────────────────────────────────
  const reds = logs.filter((l) => l.verdict === 'red');
  if (reds.length > 0) {
    const first = reds[reds.length - 1];
    messages.push({
      tone: 'warning',
      title: `${reds.length} off-plan item${reds.length === 1 ? '' : 's'} today`,
      body: `"${first?.name ?? 'An item'}" went against your rules. One slip doesn't sink the day — the next choice matters more.`,
    });
  }

  // ── Protein pacing ─────────────────────────────────────────────
  let proteinLagging = false;
  if (targets.protein_g > 0) {
    const expected = expectedProteinFraction(hour);
    const actual = consumed.protein_g / targets.protein_g;
    if (actual < expected - 0.2) {
      proteinLagging = true;
      const nextMeal = Math.max(
        0,
        round(Math.max(0, remaining.protein_g) / mealsRemaining(hour)),
      );
      messages.push({
        tone: 'nudge',
        title: 'Protein is lagging',
        body: `You're at ${round(consumed.protein_g)}g of ${round(targets.protein_g)}g. Aim for ~${nextMeal}g at your next meal to stay on pace.`,
      });
    }
  }

  // ── All green praise ───────────────────────────────────────────
  const allGreen = logs.length >= 2 && logs.every((l) => l.verdict === 'green');
  if (allGreen && !overCalories) {
    messages.push({
      tone: 'praise',
      title: 'All green so far',
      body: `${logs.length} for ${logs.length} aligned with your plan today. This is exactly how good days are built.`,
    });
  }

  // ── Approaching optional daily targets (sodium / added sugar) ──
  if (targets.sodium_mg !== undefined) {
    const sodium = sumLoggedNutrient(logs, (n) => n.sodium_mg);
    if (sodium !== null && sodium >= 0.8 * targets.sodium_mg) {
      messages.push({
        tone: 'info',
        title: 'Approaching your sodium target',
        body: `${round(sodium).toLocaleString()}mg of ${round(targets.sodium_mg).toLocaleString()}mg today — favor low-sodium picks from here.`,
      });
    }
  }
  if (targets.added_sugar_g !== undefined) {
    const sugar = sumLoggedNutrient(logs, (n) => n.added_sugar_g);
    if (sugar !== null && sugar >= 0.8 * targets.added_sugar_g) {
      messages.push({
        tone: 'info',
        title: 'Approaching your added sugar target',
        body: `${round(sugar)}g of ${round(targets.added_sugar_g)}g today — favor unsweetened picks from here.`,
      });
    }
  }

  // ── Headline ───────────────────────────────────────────────────
  const clean = !overCalories && reds.length === 0 && !proteinLagging;
  const status = clean
    ? "— you're on track."
    : hour >= 17
      ? "— let's land the evening well."
      : '— steady as you go.';
  const headline = `${round(remaining.calories).toLocaleString()} kcal left ${status}`;

  // Worst-first, capped. Sort is stable within a tone.
  messages.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);

  return { greeting, headline, messages: messages.slice(0, MAX_MESSAGES) };
}
