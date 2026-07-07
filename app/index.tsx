import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Screen, Text } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Entry resolver. The auth guard in _layout redirects away from here as soon
 * as it knows where the user belongs; until then we show a calm splash.
 */
export default function Index() {
  const { colors, spacing } = useTheme();
  return (
    <Screen>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg,
        }}
      >
        <Text variant="display" align="center">
          Aligned
        </Text>
        <ActivityIndicator color={colors.accent} />
      </View>
    </Screen>
  );
}
