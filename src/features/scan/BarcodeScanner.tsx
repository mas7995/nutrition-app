import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Text } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { BarcodeScannerProps } from './barcodeScanner.types';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/**
 * Native barcode scanner (iOS/Android via Expo Go / a build). Uses the OS
 * barcode decoder built into expo-camera. The web build resolves the sibling
 * BarcodeScanner.web.tsx instead.
 */
export function BarcodeScanner({
  active,
  onScanned,
  onUnavailable,
  children,
}: BarcodeScannerProps) {
  const { colors, spacing } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg,
          padding: spacing.xl,
          backgroundColor: colors.background,
        }}
      >
        <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
        <Text variant="h2" align="center">
          Camera access
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          We use the camera to scan barcodes and check them against your goals.
        </Text>
        <Button label="Allow camera" onPress={requestPermission} />
        {onUnavailable && (
          <Button
            label="Enter a food manually"
            variant="ghost"
            onPress={() => onUnavailable('Camera permission not granted')}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={active ? ({ data }) => onScanned(data) : undefined}
      />
      {children}
    </View>
  );
}
