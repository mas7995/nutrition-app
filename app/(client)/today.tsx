import React from 'react';

import { Placeholder, Screen } from '@/components';

export default function Today() {
  return (
    <Screen>
      <Placeholder
        icon="ellipse-outline"
        title="Today"
        body="Your macro rings, remaining budget, and everything you've logged today will live here."
        phase="Arrives in Phase 6"
      />
    </Screen>
  );
}
