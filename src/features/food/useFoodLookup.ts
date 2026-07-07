import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { NormalizedFood } from '@/types/food';

export interface FoodLookupResult {
  found: boolean;
  food?: NormalizedFood;
  cached?: boolean;
  /** True when external sources failed but a stale cache entry was returned. */
  stale?: boolean;
  barcode: string;
}

/** Invoke the lookup-food Edge Function for a single barcode. */
export async function lookupFood(barcode: string): Promise<FoodLookupResult> {
  const { data, error } = await supabase.functions.invoke('lookup-food', {
    body: { barcode },
  });
  if (error) throw error;
  const res = data as Omit<FoodLookupResult, 'barcode'>;
  return { barcode, ...res };
}

export function foodKey(barcode: string | undefined) {
  return ['food', barcode] as const;
}

/**
 * Look up a barcode. Enabled only once a barcode is present (e.g. after a
 * scan). React Query then caches the result for the session, so re-scanning
 * the same code is instant and never re-hits the function.
 */
export function useFood(barcode: string | undefined, enabled = true) {
  return useQuery({
    queryKey: foodKey(barcode),
    queryFn: () => lookupFood(barcode as string),
    enabled: Boolean(barcode) && enabled,
    staleTime: 1000 * 60 * 60, // 1h — product data is stable within a session
    retry: 1,
  });
}
