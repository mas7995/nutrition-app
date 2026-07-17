import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Thin, web-safe wrappers around expo-haptics. No-ops on web. */

const enabled = Platform.OS !== 'web';

export function tapFeedback() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectionFeedback() {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

export function verdictFeedback(verdict: 'green' | 'amber' | 'red') {
  if (!enabled) return;
  const type =
    verdict === 'green'
      ? Haptics.NotificationFeedbackType.Success
      : verdict === 'amber'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error;
  Haptics.notificationAsync(type).catch(() => {});
}
