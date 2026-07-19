import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { BarcodeScannerProps } from './barcodeScanner.types';

/** Ignore the same code for this long after a read, so one scan = one lookup. */
const DEBOUNCE_MS = 2500;

/**
 * Web barcode scanner. Browsers have no built-in barcode decoder (and Safari
 * lacks the BarcodeDetector API), so we decode frames in JS with ZXing —
 * scanning EAN-13/8 and UPC-A/E straight from the video stream. Prefers the
 * rear camera on phones via facingMode: 'environment'.
 */
export function BarcodeScanner({
  active,
  onScanned,
  onUnavailable,
  children,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const lastRead = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    const reader = new BrowserMultiFormatReader(hints);

    let controls: IScannerControls | null = null;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current ?? undefined,
        (result) => {
          if (!result || !activeRef.current) return;
          const code = result.getText();
          const now = Date.now();
          if (lastRead.current.code === code && now - lastRead.current.at < DEBOUNCE_MS) {
            return;
          }
          lastRead.current = { code, at: now };
          onScanned(code);
        },
      )
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Camera unavailable in this browser';
        onUnavailable?.(message);
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {children}
    </View>
  );
}
