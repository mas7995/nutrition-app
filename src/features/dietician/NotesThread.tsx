import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Text, TextField } from '@/components';
import { Note } from '@/types/dietician';
import { useTheme } from '@/theme/ThemeProvider';
import { useAddNote, useNotes } from './useNotes';

export interface NotesThreadProps {
  clientId: string;
  currentUserId: string;
  /** Label for messages the current user did NOT write. */
  otherLabel: string;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotesThread({ clientId, currentUserId, otherLabel }: NotesThreadProps) {
  const { colors, spacing, radius } = useTheme();
  const { data: notes, isLoading } = useNotes(clientId);
  const add = useAddNote(clientId, currentUserId);
  const [draft, setDraft] = useState('');

  function send() {
    const body = draft.trim();
    if (!body) return;
    add.mutate({ body });
    setDraft('');
  }

  return (
    <Card>
      <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.md }}>
        NOTES
      </Text>

      {isLoading ? (
        <Text variant="caption" color="textTertiary">
          Loading…
        </Text>
      ) : (notes ?? []).length === 0 ? (
        <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.md }}>
          No notes yet. Leave one below — the other person sees it live.
        </Text>
      ) : (
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          {(notes as Note[]).map((n) => {
            const mine = n.author_id === currentUserId;
            return (
              <View
                key={n.id}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: mine ? colors.accentSoft : colors.surfaceSunken,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text variant="overline" color={mine ? 'accent' : 'textTertiary'}>
                  {mine ? 'YOU' : otherLabel.toUpperCase()}
                </Text>
                <Text variant="body" color="textSecondary">
                  {n.body}
                </Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  {timeLabel(n.created_at)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <TextField
            placeholder="Write a note…"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
          />
        </View>
        <Button label="Send" onPress={send} loading={add.isPending} disabled={!draft.trim()} />
      </View>
    </Card>
  );
}
