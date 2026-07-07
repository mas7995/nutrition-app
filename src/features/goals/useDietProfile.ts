import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { DietProfile, DietRules, DailyTargets, Strictness } from '@/types/diet';

interface DietProfileRow {
  user_id: string;
  targets: DailyTargets;
  rules: DietRules;
  strictness: Strictness;
}

export function dietProfileKey(userId: string | undefined) {
  return ['diet_profile', userId] as const;
}

async function fetchDietProfile(userId: string): Promise<DietProfile | null> {
  const { data, error } = await supabase
    .from('diet_profiles')
    .select('user_id, targets, rules, strictness')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const row = data as DietProfileRow;
  return {
    user_id: row.user_id,
    targets: row.targets,
    rules: row.rules,
    strictness: row.strictness,
  };
}

/** Read the signed-in client's diet profile. Returns null when not yet set. */
export function useDietProfile(userId: string | undefined, enabled = true) {
  return useQuery<DietProfile | null>({
    queryKey: dietProfileKey(userId),
    queryFn: () => fetchDietProfile(userId as string),
    enabled: Boolean(userId) && enabled,
  });
}

/** Upsert the signed-in client's diet profile. */
export function useSaveDietProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Omit<DietProfile, 'user_id'>) => {
      if (!userId) throw new Error('Not signed in.');
      const { data, error } = await supabase
        .from('diet_profiles')
        .upsert({
          user_id: userId,
          targets: profile.targets,
          rules: profile.rules,
          strictness: profile.strictness,
        })
        .select('user_id, targets, rules, strictness')
        .single();
      if (error) throw error;
      const row = data as DietProfileRow;
      return {
        user_id: row.user_id,
        targets: row.targets,
        rules: row.rules,
        strictness: row.strictness,
      } satisfies DietProfile;
    },
    onSuccess: (saved) => {
      qc.setQueryData(dietProfileKey(userId), saved);
    },
  });
}
