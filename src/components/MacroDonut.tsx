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

/** Fraction of the circumference left as a gap between segments. */
const SEGMENT_GAP = 0.02;

export interface MacroDonutProps {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Diameter, default 180. */
  size?: number;
  /** Arc thickness, default 22. */
  strokeWidth?: number;
  /** Small overline above the center value, e.g. "DAILY TARGET". */
  centerTitle?: string;
  /** Center value; defaults to the computed kcal. */
  centerValue?: string;
  /** Caption under the center value, default "kcal". */
  centerCaption?: string;
}

interface Segment {
  key: 'protein' | 'carbs' | 'fat';
  /** Fraction of the ring [0..1] this segment occupies (gap already removed). */
  length: number;
  /** Fraction of the ring where this segment starts. */
  start: number;
  color: string;
}

/**
 * An animated donut ("pie") of a macro split, proportional to each macro's
 * calorie contribution (protein/carbs 4 kcal/g, fat 9 kcal/g). Segment colors
 * match the MacroRings convention: protein green, carbs amber, fat red.
 * Segment lengths spring to their targets on mount and on change.
 */
export function MacroDonut({
  protein_g,
  carbs_g,
  fat_g,
  size = 180,
  strokeWidth = 22,
  centerTitle,
  centerValue,
  centerCaption = 'kcal',
}: MacroDonutProps) {
  const { colors } = useTheme();

  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const pKcal = safe(protein_g) * 4;
  const cKcal = safe(carbs_g) * 4;
  const fKcal = safe(fat_g) * 9;
  const total = pKcal + cKcal + fKcal;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Fractions of the ring, with a small gap carved out of each visible
  // segment so the donut reads as refined and segmented.
  const fractions =
    total > 0
      ? [pKcal / total, cKcal / total, fKcal / total]
      : [0, 0, 0];
  const colorsBySeg = [colors.green, colors.amber, colors.red];
  const keys: Segment['key'][] = ['protein', 'carbs', 'fat'];

  const segments: Segment[] = [];
  let cursor = 0;
  for (let i = 0; i < 3; i++) {
    const frac = fractions[i] ?? 0;
    const visible = frac > SEGMENT_GAP * 2 ? frac - SEGMENT_GAP : frac > 0 ? frac * 0.6 : 0;
    segments.push({
      key: keys[i] as Segment['key'],
      length: visible,
      start: cursor + SEGMENT_GAP / 2,
      color: colorsBySeg[i] ?? colors.text,
    });
    cursor += frac;
  }

  // One spring-animated length per segment (fixed count — hook-safe).
  const len0 = useSharedValue(0);
  const len1 = useSharedValue(0);
  const len2 = useSharedValue(0);
  const lens = [len0, len1, len2];

  useEffect(() => {
    len0.value = withSpring(segments[0]?.length ?? 0, motion.springSoft);
    len1.value = withSpring(segments[1]?.length ?? 0, motion.springSoft);
    len2.value = withSpring(segments[2]?.length ?? 0, motion.springSoft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments[0]?.length, segments[1]?.length, segments[2]?.length]);

  const props0 = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - len0.value),
  }));
  const props1 = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - len1.value),
  }));
  const props2 = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - len2.value),
  }));
  const animatedProps = [props0, props1, props2];

  const kcalLabel =
    centerValue ?? (total > 0 ? Math.round(total).toLocaleString() : '—');

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceSunken}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments.map((seg, i) => {
          if (seg.length <= 0) return null;
          // Rotate each segment to its start position (12 o'clock origin);
          // the animated dashoffset then reveals its length.
          const rotation = seg.start * 360 - 90;
          return (
            <AnimatedCircle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={circumference}
              animatedProps={animatedProps[i]}
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            />
          );
        })}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {centerTitle && (
          <Text variant="overline" color="textTertiary">
            {centerTitle.toUpperCase()}
          </Text>
        )}
        <Text variant="numberLg">{kcalLabel}</Text>
        <Text variant="overline" color="textTertiary">
          {centerCaption.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}
