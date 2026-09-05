'use client';

import { Button } from '@/app/ui/components/button';
import { useProfileSwitch } from '@/app/ui/components/ProfileSwitchProvider';
import { useState } from 'react';

// Floating and dismissible rather than an interstitial, which would block on
// every visit while the viewer browses as another profile (2026-09-01 mockup).
// It reports what the viewer may act as, not what they may see, so it renders
// for any membership and independently of the resolved tier. Dismissing
// collapses it to a chip that restores the card — the offer is never lost, only
// tucked away for this visit.
export default function SwitchProfileOffer({
  profileId,
  profileName,
}: {
  profileId: string;
  profileName: string;
}) {
  const switchProfile = useProfileSwitch();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <button
        type="button"
        className="switch-offer-chip"
        onClick={() => setDismissed(false)}
      >
        🛠 Managing ▴
      </button>
    );
  }

  return (
    <div className="switch-offer-card" role="status">
      <div className="switch-offer-head">
        <span className="switch-offer-title">🛠 Managing as {profileName}</span>
        <button
          type="button"
          className="switch-offer-dismiss"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          ✕
        </button>
      </div>
      <Button variant="primary" onClick={() => switchProfile(profileId)}>
        Switch to {profileName}
      </Button>
    </div>
  );
}
