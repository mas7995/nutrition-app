/**
 * The goal payload a client defines for themselves — persisted in
 * `diet_profiles`. This is the "opinion" the alignment engine enforces.
 */

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Strictness = 'lenient' | 'balanced' | 'strict';

export type DietTag =
  | 'keto'
  | 'mediterranean'
  | 'whole30'
  | 'high-protein'
  | 'low-sugar'
  | 'custom';

export interface DailyTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  added_sugar_g?: number;
}

/**
 * A per-serving cap. `strict: true` promotes a breach from amber to red —
 * it becomes a hard exclusion rather than a soft limit.
 */
export interface PerServingLimit {
  value: number;
  strict: boolean;
}

export interface DietRules {
  /** Substring-matched (case-insensitive) against ingredient text. */
  avoid_ingredients: string[];
  avoid_allergens: string[];
  max_added_sugar_per_serving_g?: PerServingLimit;
  max_sodium_per_serving_mg?: PerServingLimit;
  min_protein_per_serving_g?: number;
  /** 1–4. A food with a NOVA group above this triggers a caution. */
  max_nova_group?: number;
  diet_tags: DietTag[];
}

export interface DietProfile {
  user_id: string;
  targets: DailyTargets;
  rules: DietRules;
  strictness: Strictness;
}
