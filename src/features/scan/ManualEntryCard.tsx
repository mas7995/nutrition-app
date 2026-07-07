import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Stepper, Text, TextField } from '@/components';
import { NormalizedFood } from '@/types/food';
import { useTheme } from '@/theme/ThemeProvider';

export interface ManualEntryCardProps {
  barcode: string | null;
  onSubmit: (food: NormalizedFood) => void;
  onCancel: () => void;
}

/**
 * Graceful not-found path: enter a food by hand. Only the values the user
 * actually knows are captured — unknown fields stay undefined so the engine
 * can honestly disclose gaps rather than assume zero.
 */
export function ManualEntryCard({ barcode, onSubmit, onCancel }: ManualEntryCardProps) {
  const { spacing } = useTheme();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

  function submit() {
    const food: NormalizedFood = {
      barcode: barcode ?? '',
      source: 'manual',
      name: name.trim() || 'Manual entry',
      brand: null,
      image_url: null,
      serving: { qty: 1, unit: 'serving', weight_g: null },
      nutrients_per_serving: {
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      },
      ingredients_text: null,
      allergens: [],
      data_complete: true,
    };
    onSubmit(food);
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text variant="overline" color="textTertiary">
          MANUAL ENTRY
        </Text>
        <Text variant="h2">Add it by hand</Text>
        <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
          We couldn't find this barcode. Enter what you know — per serving.
        </Text>
      </View>

      <TextField
        label="Product name"
        placeholder="e.g. Homemade granola"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <Card>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
          PER SERVING
        </Text>
        <Stepper label="Calories" value={calories} onChange={setCalories} unit="kcal" step={10} />
        <Stepper label="Protein" value={protein} onChange={setProtein} unit="g" step={1} />
        <Stepper label="Carbs" value={carbs} onChange={setCarbs} unit="g" step={1} />
        <Stepper label="Fat" value={fat} onChange={setFat} unit="g" step={1} />
      </Card>

      <Button label="Check it" fullWidth onPress={submit} disabled={calories === 0 && protein === 0} />
      <Button label="Cancel" variant="ghost" fullWidth onPress={onCancel} />
    </View>
  );
}
