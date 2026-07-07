import { DietProfile, DietTag } from '@/types/diet';

/** A selectable starting framework. Seeds targets + rules; the user then
 * fine-tunes. "custom" is a blank-ish slate. */
export type PresetKey =
  | 'high-protein'
  | 'mediterranean'
  | 'keto'
  | 'low-sugar'
  | 'whole30'
  | 'custom';

export interface Preset {
  key: PresetKey;
  label: string;
  tagline: string;
  /** Everything except user_id — the seed applied on selection. */
  seed: Omit<DietProfile, 'user_id'>;
}

const tags = (...t: DietTag[]) => t;

export const PRESETS: Record<PresetKey, Preset> = {
  'high-protein': {
    key: 'high-protein',
    label: 'High protein',
    tagline: 'Protein-forward days to hold muscle while you lean out.',
    seed: {
      targets: { calories: 2100, protein_g: 165, carbs_g: 190, fat_g: 65, fiber_g: 30 },
      rules: {
        avoid_ingredients: [],
        avoid_allergens: [],
        min_protein_per_serving_g: 10,
        diet_tags: tags('high-protein'),
      },
      strictness: 'balanced',
    },
  },
  mediterranean: {
    key: 'mediterranean',
    label: 'Mediterranean',
    tagline: 'Whole foods, healthy fats, plenty of fiber. Calm and sustainable.',
    seed: {
      targets: {
        calories: 2100,
        protein_g: 100,
        carbs_g: 235,
        fat_g: 78,
        fiber_g: 32,
        sodium_mg: 2000,
      },
      rules: {
        avoid_ingredients: [],
        avoid_allergens: [],
        max_nova_group: 3,
        diet_tags: tags('mediterranean'),
      },
      strictness: 'balanced',
    },
  },
  keto: {
    key: 'keto',
    label: 'Keto',
    tagline: 'Very low carb, high fat. Tight sugar and carb ceilings.',
    seed: {
      targets: {
        calories: 2000,
        protein_g: 120,
        carbs_g: 30,
        fat_g: 155,
        added_sugar_g: 5,
      },
      rules: {
        avoid_ingredients: [],
        avoid_allergens: [],
        max_added_sugar_per_serving_g: { value: 5, strict: false },
        diet_tags: tags('keto', 'low-sugar'),
      },
      strictness: 'strict',
    },
  },
  'low-sugar': {
    key: 'low-sugar',
    label: 'Low sugar',
    tagline: 'Keep added sugar in check without going full keto.',
    seed: {
      targets: {
        calories: 2000,
        protein_g: 130,
        carbs_g: 185,
        fat_g: 70,
        added_sugar_g: 24,
      },
      rules: {
        avoid_ingredients: [],
        avoid_allergens: [],
        max_added_sugar_per_serving_g: { value: 8, strict: false },
        diet_tags: tags('low-sugar'),
      },
      strictness: 'balanced',
    },
  },
  whole30: {
    key: 'whole30',
    label: 'Whole30',
    tagline: 'Whole foods only — no added sugar, grains, dairy, or legumes.',
    seed: {
      targets: { calories: 2000, protein_g: 140, carbs_g: 150, fat_g: 90, fiber_g: 30 },
      rules: {
        avoid_ingredients: [
          'sugar',
          'cane sugar',
          'corn syrup',
          'soy',
          'soybean oil',
          'wheat',
          'milk',
          'carrageenan',
          'sulfites',
          'msg',
        ],
        avoid_allergens: ['gluten', 'milk', 'soybeans'],
        max_added_sugar_per_serving_g: { value: 0, strict: true },
        max_nova_group: 2,
        diet_tags: tags('whole30'),
      },
      strictness: 'strict',
    },
  },
  custom: {
    key: 'custom',
    label: 'Custom',
    tagline: 'Start from a clean slate and set every target and rule yourself.',
    seed: {
      targets: { calories: 2000, protein_g: 120, carbs_g: 200, fat_g: 70 },
      rules: {
        avoid_ingredients: [],
        avoid_allergens: [],
        diet_tags: tags('custom'),
      },
      strictness: 'balanced',
    },
  },
};

export const PRESET_ORDER: PresetKey[] = [
  'high-protein',
  'mediterranean',
  'keto',
  'low-sugar',
  'whole30',
  'custom',
];
