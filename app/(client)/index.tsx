import React from 'react';

import { Placeholder, Screen } from '@/components';

export default function Scan() {
  return (
    <Screen>
      <Placeholder
        icon="scan-outline"
        title="Scan a product"
        body="Point your camera at a barcode and get an instant green / amber / red verdict against your goals."
        phase="Arrives in Phase 5"
      />
    </Screen>
  );
}
