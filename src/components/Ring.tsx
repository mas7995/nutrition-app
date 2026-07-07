import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { motion } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingProps {
  /** 0–1 (values > 1 are clamped for the arc but surfaced via `over`). */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Ring color; defaults to the brand accent. */
  color?: string;
  trackColor?: string;
  label?: string;
  /** Center value, e.g. "82g". */
  value?: string;
}

/**
 * A thin animated progress ring. Fills with spring physics on mount and on
 * progress change. Restrained — no bounce past the target.
 */
export function Ring({
  progress,
  size = 84,
  strokeWidth = 8,
  color,
  trackColor,
  label,
  value,
}: RingProps) {
  const { colors } = useTheme();
  const ringColor = color ?? colors.accent;
  const track = trackColor ?? colors.surfaceSunken;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const clamped = Math.max(0, Math.min(1, progress));
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withSpring(clamped, motion.springSoft);
  }, [clamped, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Start the arc at 12 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {(value || label) && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          {value && (
            <Text variant="numberMd" color="text">
              {value}
            </Text>
          )}
          {label && (
            <Text variant="overline" color="textTertiary">
              {label.toUpperCase()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
