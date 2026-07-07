import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { DailyTargets } from '@/types/diet';
import { FoodLog, NewFoodLog } from '@/types/log';
import { BudgetFit } from '@/types/verdict';

/** Local-day [start, end) as ISO strings. */
export function dayRange(date = new Date()): { startISO: string; endISO: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function todayLogsKey(userId: string | undefined, dayKey: string) {
  return ['food_logs', userId, dayKey] as const;
}

async function fetchLogsForDay(userId: string, date: Date): Promise<FoodLog[]> {
  const { startISO, endISO } = dayRange(date);
  const { data, error } = await supabase
    .from('food_logs')
    .select('id, user_id, barcode, name, meal, nutrients, servings, verdict, reasons, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startISO)
    .lt('logged_at', endISO)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FoodLog[];
}

/** Logs for a given local day (defaults to today). */
export function useLogsForDay(userId: string | undefined, date = new Date()) {
  const dayKey = dayRange(date).startISO.slice(0, 10);
  return useQuery<FoodLog[]>({
    queryKey: todayLogsKey(userId, dayKey),
    queryFn: () => fetchLogsForDay(userId as string, date),
    enabled: Boolean(userId),
  });
}

/** Sum the day's consumed macros (accounting for servings). */
export function consumedTotals(logs: FoodLog[]): BudgetFit {
  return logs.reduce<BudgetFit>(
    (acc, l) => {
      const s = l.servings || 1;
      acc.calories += (l.nutrients.calories ?? 0) * s;
      acc.protein_g += (l.nutrients.protein_g ?? 0) * s;
      acc.carbs_g += (l.nutrients.carbs_g ?? 0) * s;
      acc.fat_g += (l.nutrients.fat_g ?? 0) * s;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

/** Remaining budget = targets − consumed. */
export function remainingBudget(
  targets: DailyTargets,
  logs: FoodLog[],
): BudgetFit {
  const c = consumedTotals(logs);
  return {
    calories: targets.calories - c.calories,
    protein_g: targets.protein_g - c.protein_g,
    carbs_g: targets.carbs_g - c.carbs_g,
    fat_g: targets.fat_g - c.fat_g,
  };
}

/** Insert a log entry and refresh today's logs. */
export function useLogFood(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: NewFoodLog) => {
      if (!userId) throw new Error('Not signed in.');
      const { data, error } = await supabase
        .from('food_logs')
        .insert({ user_id: userId, ...entry })
        .select('id, user_id, barcode, name, meal, nutrients, servings, verdict, reasons, logged_at')
        .single();
      if (error) throw error;
      return data as FoodLog;
    },
    onSuccess: () => {
      // Invalidate any day-scoped log queries for this user.
      qc.invalidateQueries({ queryKey: ['food_logs', userId] });
    },
  });
}
