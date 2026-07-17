import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

export interface RealtimeSub {
  table: string;
  /** PostgREST-style filter, e.g. `user_id=eq.<uuid>`. */
  filter?: string;
  /** Query keys to invalidate when a change arrives. */
  invalidate: readonly unknown[][];
}

/**
 * Subscribe to Postgres changes and invalidate React Query caches so linked
 * dietician/client views update live without a manual refresh. RLS still
 * applies — subscribers only receive rows they're allowed to read.
 */
export function useRealtime(
  channelName: string,
  subs: RealtimeSub[],
  enabled = true,
) {
  const qc = useQueryClient();
  // Stable dependency from the subscription shape.
  const depKey = JSON.stringify(
    subs.map((s) => [s.table, s.filter, s.invalidate]),
  );

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(channelName);
    for (const sub of subs) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: sub.table, filter: sub.filter },
        () => {
          for (const key of sub.invalidate) {
            qc.invalidateQueries({ queryKey: key });
          }
        },
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, depKey]);
}
