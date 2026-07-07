/**
 * The normalized food shape — the single source of truth for a looked-up
 * product, produced by the `lookup-food` Edge Function and cached in `foods`.
 *
 * Whatever source responded (Nutritionix or Open Food Facts) is normalized
 * into this exact shape so the rest of the app never has to branch on source.
 */

export type FoodSource = 'nutritionix' | 'off';

export type BarcodeFormat = 'ean13' | 'ean8' | 'upc_a' | 'upc_e';

export interface Serving {
  qty: number;
  unit: string;
  /** Weight of one serving in grams. Used to normalize per-100g data. */
  weight_g: number | null;
}

/**
 * Nutrients for a SINGLE serving. Optional fields are genuinely optional:
 * Open Food Facts products frequently omit them. `undefined` means "not
 * reported" — never coerce it to 0, that would fabricate data.
 */
export interface NutrientsPerServing {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sat_fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  added_sugar_g?: number;
  sodium_mg?: number;
}

export interface NormalizedFood {
  barcode: string;
  source: FoodSource;
  name: string;
  brand: string | null;
  image_url: string | null;
  serving: Serving;
  nutrients_per_serving: NutrientsPerServing;
  ingredients_text: string | null;
  allergens: string[];
  /** NOVA processing group, 1 (unprocessed) → 4 (ultra-processed). */
  nova_group?: number;
  /** Nutri-Score grade a–e (lowercased). */
  nutriscore?: string;
  /** false when one or more required fields were missing from the source. */
  data_complete: boolean;
}
