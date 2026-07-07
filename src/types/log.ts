import { Meal } from './diet';
import { NutrientsPerServing } from './food';
import { Reason, Verdict } from './verdict';

export type { Meal };

export interface FoodLog {
  id: string;
  user_id: string;
  barcode: string | null;
  name: string;
  meal: Meal;
  /** Snapshot of per-serving nutrients at log time. */
  nutrients: NutrientsPerServing;
  servings: number;
  /** Verdict + reasons computed at log time (history stays truthful). */
  verdict: Verdict;
  reasons: Reason[];
  logged_at: string;
}

/** Payload for creating a log entry. */
export interface NewFoodLog {
  barcode: string | null;
  name: string;
  meal: Meal;
  nutrients: NutrientsPerServing;
  servings: number;
  verdict: Verdict;
  reasons: Reason[];
}
