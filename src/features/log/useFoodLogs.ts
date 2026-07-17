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

// ── Recent logs across days (for History) ────────────────────────

export function recentLogsKey(userId: string | undefined, days: number) {
  return ['food_logs', userId, 'recent', days] as const;
}

async function fetchLogsSince(userId: string, days: number): Promise<FoodLog[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const { data, error } = await supabase
    .from('food_logs')
    .select('id, user_id, barcode, name, meal, nutrients, servings, verdict, reasons, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FoodLog[];
}

export function useRecentLogs(userId: string | undefined, days = 14) {
  return useQuery<FoodLog[]>({
    queryKey: recentLogsKey(userId, days),
    queryFn: () => fetchLogsSince(userId as string, days),
    enabled: Boolean(userId),
  });
}

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface DayAdherence {
  green: number;
  amber: number;
  red: number;
  total: number;
}

export interface DayGroup {
  dayKey: string;
  logs: FoodLog[];
  adherence: DayAdherence;
}

/** Group logs by local day, newest first, with per-day verdict tallies. */
export function groupLogsByDay(logs: FoodLog[]): DayGroup[] {
  const map = new Map<string, FoodLog[]>();
  for (const log of logs) {
    const key = localDayKey(log.logged_at);
    const arr = map.get(key);
    if (arr) arr.push(log);
    else map.set(key, [log]);
  }
  return Array.from(map.entries())
    .map(([dayKey, dayLogs]) => {
      const adherence: DayAdherence = { green: 0, amber: 0, red: 0, total: dayLogs.length };
      for (const l of dayLogs) adherence[l.verdict] += 1;
      return { dayKey, logs: dayLogs, adherence };
    })
    .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
}

/** Human label for a local day key (YYYY-MM-DD): Today / Yesterday / date. */
export function dayLabel(dayKey: string): string {
  const today = localDayKey(new Date().toISOString());
  const yKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localDayKey(d.toISOString());
  })();
  if (dayKey === today) return 'Today';
  if (dayKey === yKey) return 'Yesterday';
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Delete a log entry and refresh log queries. */
export function useDeleteLog(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food_logs', userId] });
    },
  });
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
