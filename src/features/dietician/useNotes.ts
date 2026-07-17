import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { Note } from '@/types/dietician';

const NOTE_COLS = 'id, author_id, client_id, food_log_id, body, created_at';

export function notesKey(clientId: string | undefined) {
  return ['notes', clientId] as const;
}

/** All notes for a client (profile-level and item-level), newest last. */
export function useNotes(clientId: string | undefined) {
  return useQuery<Note[]>({
    queryKey: notesKey(clientId),
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select(NOTE_COLS)
        .eq('client_id', clientId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });
}

export function useAddNote(clientId: string | undefined, authorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; foodLogId?: string | null }) => {
      if (!clientId || !authorId) throw new Error('Missing client or author.');
      const { data, error } = await supabase
        .from('notes')
        .insert({
          author_id: authorId,
          client_id: clientId,
          food_log_id: input.foodLogId ?? null,
          body: input.body.trim(),
        })
        .select(NOTE_COLS)
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKey(clientId) }),
  });
}
