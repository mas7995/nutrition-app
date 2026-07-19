import type { ReactNode } from 'react';

export interface BarcodeScannerProps {
  /** When false, the live view keeps running but scans are ignored. */
  active: boolean;
  /** Called with the decoded barcode string. */
  onScanned: (data: string) => void;
  /** Called when the camera can't be used (denied/unsupported) so the caller
   * can fall back to manual entry. */
  onUnavailable?: (message: string) => void;
  /** Overlay UI (header, scan frame, manual-entry button). */
  children?: ReactNode;
}
