import React from 'react';
import { ScrollView, StatusBar, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
}

/** Consistent page frame: safe-area, themed background, optional scroll. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  contentStyle,
}: ScreenProps) {
  const { colors, spacing, scheme } = useTheme();

  const padding: ViewStyle = padded
    ? { paddingHorizontal: spacing.xl, paddingTop: spacing.lg }
    : {};

  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            { paddingBottom: spacing.xxxl, flexGrow: 1 },
            padding,
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
