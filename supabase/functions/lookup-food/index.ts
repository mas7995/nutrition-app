// lookup-food — resolve a barcode to a normalized food.
//
// Flow:
//   1. Serve from the `foods` cache if present and fresh.
//   2. Try Nutritionix (primary) — only if NUTRITIONIX_* secrets are set.
//   3. Fall back to Open Food Facts (no key; send a descriptive User-Agent).
//   4. Normalize, cache (service role), and return.
//
// API keys live ONLY in this function's env — they never ship in the app.
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CACHE_FRESH_DAYS = 90;
const OFF_USER_AGENT =
  'NutritionScanner/0.1 (personal goal-aligned nutrition app)';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Normalized shape (mirrors src/types/food.ts) ─────────────────
interface NormalizedFood {
  barcode: string;
  source: 'nutritionix' | 'off';
  name: string;
  brand: string | null;
  image_url: string | null;
  serving: { qty: number; unit: string; weight_g: number | null };
  nutrients_per_serving: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    sat_fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    added_sugar_g?: number;
    sodium_mg?: number;
  };
  ingredients_text: string | null;
  allergens: string[];
  nova_group?: number;
  nutriscore?: string;
  data_complete: boolean;
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) ? n : undefined;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Nutritionix (values are already per serving) ─────────────────
async function fromNutritionix(
  barcode: string,
  appId: string,
  appKey: string,
): Promise<NormalizedFood | null> {
  const res = await fetch(
    `https://trackapi.nutritionix.com/v2/search/item?upc=${encodeURIComponent(barcode)}`,
    { headers: { 'x-app-id': appId, 'x-app-key': appKey } },
  );
  if (!res.ok) return null; // 404 = miss; anything non-2xx falls through to OFF
  const data = await res.json().catch(() => null);
  const item = data?.foods?.[0];
  if (!item) return null;

  const calories = num(item.nf_calories);
  const protein = num(item.nf_protein);
  const carbs = num(item.nf_total_carbohydrate);
  const fat = num(item.nf_total_fat);

  return {
    barcode,
    source: 'nutritionix',
    name: item.food_name ?? item.nix_item_name ?? 'Unknown product',
    brand: item.brand_name ?? null,
    image_url: item.photo?.thumb ?? null,
    serving: {
      qty: num(item.serving_qty) ?? 1,
      unit: item.serving_unit ?? 'serving',
      weight_g: num(item.serving_weight_grams) ?? null,
    },
    nutrients_per_serving: {
      calories: calories ?? 0,
      protein_g: protein ?? 0,
      carbs_g: carbs ?? 0,
      fat_g: fat ?? 0,
      sat_fat_g: num(item.nf_saturated_fat),
      fiber_g: num(item.nf_dietary_fiber),
      sugar_g: num(item.nf_sugars),
      added_sugar_g: num(item.nf_added_sugars),
      sodium_mg: num(item.nf_sodium),
    },
    ingredients_text: item.nf_ingredient_statement ?? null,
    allergens: [],
    data_complete:
      calories !== undefined &&
      protein !== undefined &&
      carbs !== undefined &&
      fat !== undefined,
  };
}

// ── Open Food Facts (per-serving or per-100g; normalize to serving) ──
async function fromOpenFoodFacts(
  barcode: string,
): Promise<NormalizedFood | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    { headers: { 'User-Agent': OFF_USER_AGENT } },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || data.status === 0 || !data.product) return null; // status 0 = not found

  const p = data.product;
  const n = p.nutriments ?? {};
  const servingG = num(p.serving_quantity);

  // Prefer explicit per-serving; else scale per-100g by the serving weight.
  const perServing = (key: string): number | undefined => {
    const s = num(n[`${key}_serving`]);
    if (s !== undefined) return s;
    const h = num(n[`${key}_100g`]);
    if (h !== undefined && servingG) return (h / 100) * servingG;
    return undefined;
  };

  // Sodium (grams in OFF → mg). Fall back to salt/2.5 when sodium is absent.
  let sodiumG = perServing('sodium');
  if (sodiumG === undefined) {
    const salt = perServing('salt');
    if (salt !== undefined) sodiumG = salt / 2.5;
  }

  const calories = perServing('energy-kcal');
  const protein = perServing('proteins');
  const carbs = perServing('carbohydrates');
  const fat = perServing('fat');

  const allergens: string[] = Array.isArray(p.allergens_tags)
    ? p.allergens_tags.map((t: string) => t.replace(/^en:/, ''))
    : [];

  return {
    barcode,
    source: 'off',
    name: p.product_name || p.generic_name || 'Unknown product',
    brand: p.brands ?? null,
    image_url: p.image_url ?? p.image_front_url ?? null,
    serving: {
      qty: 1,
      unit: p.serving_size ? String(p.serving_size) : 'serving',
      weight_g: servingG ?? null,
    },
    nutrients_per_serving: {
      // OFF frequently omits macros — keep them honest (0 only when truly 0).
      calories: calories ?? 0,
      protein_g: protein ?? 0,
      carbs_g: carbs ?? 0,
      fat_g: fat ?? 0,
      sat_fat_g: perServing('saturated-fat'),
      fiber_g: perServing('fiber'),
      sugar_g: perServing('sugars'),
      added_sugar_g: perServing('added-sugars'),
      sodium_mg: sodiumG !== undefined ? sodiumG * 1000 : undefined,
    },
    ingredients_text: p.ingredients_text || null,
    allergens,
    nova_group: num(p.nova_group),
    nutriscore: p.nutriscore_grade ?? undefined,
    data_complete:
      calories !== undefined &&
      protein !== undefined &&
      carbs !== undefined &&
      fat !== undefined,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let barcode: string | undefined;
  try {
    barcode = (await req.json())?.barcode?.toString().trim();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (!barcode || !/^\d{6,14}$/.test(barcode)) {
    return json({ error: 'invalid_barcode' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Cache.
  const { data: cached } = await admin
    .from('foods')
    .select('food, fetched_at')
    .eq('barcode', barcode)
    .maybeSingle();

  if (cached) {
    const ageDays =
      (Date.now() - new Date(cached.fetched_at).getTime()) / 86_400_000;
    if (ageDays < CACHE_FRESH_DAYS) {
      return json({ found: true, food: cached.food, cached: true });
    }
  }

  // 2. Nutritionix (only if configured), then 3. Open Food Facts.
  let food: NormalizedFood | null = null;
  const nixId = Deno.env.get('NUTRITIONIX_APP_ID');
  const nixKey = Deno.env.get('NUTRITIONIX_APP_KEY');
  if (nixId && nixKey) {
    try {
      food = await fromNutritionix(barcode, nixId, nixKey);
    } catch (_e) {
      food = null;
    }
  }
  if (!food) {
    try {
      food = await fromOpenFoodFacts(barcode);
    } catch (_e) {
      food = null;
    }
  }

  if (!food) {
    // Serve stale cache rather than nothing, if we have it. Otherwise report a
    // clean miss (200 + found:false) so the client can offer manual entry —
    // not an error, just an unknown barcode.
    if (cached) {
      return json({ found: true, food: cached.food, cached: true, stale: true });
    }
    return json({ found: false, barcode });
  }

  // 4. Cache (upsert) and return.
  await admin
    .from('foods')
    .upsert({ barcode, source: food.source, food, fetched_at: new Date().toISOString() });

  return json({ found: true, food, cached: false });
});
