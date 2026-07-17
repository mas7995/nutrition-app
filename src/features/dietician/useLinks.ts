import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/profile';
import {
  AdherenceGlance,
  DieticianLink,
  LinkedClient,
  LinkedDietician,
} from '@/types/dietician';

const PROFILE_COLS = 'id, role, display_name, created_at';

// ── Client side: invite code + linked dieticians ────────────────

/** Generate (or regenerate) this client's invite code. */
export function useCreateInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_invite_code');
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invite_code'] }),
  });
}

/** The client's current invite code, if one exists. */
export function useMyInviteCode(userId: string | undefined) {
  return useQuery({
    queryKey: ['invite_code', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('code, expires_at')
        .eq('client_id', userId as string)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return (data as { code: string; expires_at: string } | null) ?? null;
    },
  });
}

/** Dieticians linked to this client. */
export function useMyDieticians(clientId: string | undefined) {
  return useQuery<LinkedDietician[]>({
    queryKey: ['my_dieticians', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from('dietician_links')
        .select('*')
        .eq('client_id', clientId as string)
        .eq('status', 'active');
      if (error) throw error;
      const rows = (links ?? []) as DieticianLink[];
      if (rows.length === 0) return [];
      const ids = rows.map((l) => l.dietician_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select(PROFILE_COLS)
        .in('id', ids);
      const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]) ?? []);
      return rows.map((link) => ({ link, profile: byId.get(link.dietician_id) ?? null }));
    },
  });
}

/** Revoke a link (client-side). Sets status to 'revoked' so access is cut. */
export function useRevokeLink(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('dietician_links')
        .update({ status: 'revoked' })
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my_dieticians', clientId] }),
  });
}

// ── Dietician side: redeem code + linked clients ────────────────

/** Redeem a client's invite code to create a link. */
export function useRedeemCode(dieticianId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('redeem_invite_code', {
        p_code: code.trim().toUpperCase(),
      });
      if (error) throw error;
      return data as string; // client_id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients', dieticianId] }),
  });
}

function sinceDaysISO(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString();
}

/** Clients linked to this dietician, each with a quick adherence glance. */
export function useClients(dieticianId: string | undefined) {
  return useQuery<LinkedClient[]>({
    queryKey: ['clients', dieticianId],
    enabled: Boolean(dieticianId),
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from('dietician_links')
        .select('*')
        .eq('dietician_id', dieticianId as string)
        .eq('status', 'active');
      if (error) throw error;
      const rows = (links ?? []) as DieticianLink[];
      if (rows.length === 0) return [];
      const ids = rows.map((l) => l.client_id);

      const [{ data: profiles }, { data: logs }] = await Promise.all([
        supabase.from('profiles').select(PROFILE_COLS).in('id', ids),
        supabase
          .from('food_logs')
          .select('user_id, verdict')
          .in('user_id', ids)
          .gte('logged_at', sinceDaysISO(14)),
      ]);

      const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]) ?? []);
      const adherence = new Map<string, AdherenceGlance>();
      for (const id of ids) adherence.set(id, { green: 0, amber: 0, red: 0, total: 0 });
      for (const l of (logs ?? []) as { user_id: string; verdict: 'green' | 'amber' | 'red' }[]) {
        const a = adherence.get(l.user_id);
        if (a) {
          a[l.verdict] += 1;
          a.total += 1;
        }
      }

      return rows.map((link) => ({
        link,
        profile: byId.get(link.client_id) ?? null,
        adherence: adherence.get(link.client_id) ?? { green: 0, amber: 0, red: 0, total: 0 },
      }));
    },
  });
}
