import React from 'react';

import { Placeholder, Screen } from '@/components';

export default function Clients() {
  return (
    <Screen>
      <Placeholder
        icon="people-outline"
        title="Your clients"
        body="Clients who link with your invite code will appear here, each with an adherence glance and their full plan."
        phase="Arrives in Phase 7"
      />
    </Screen>
  );
}
