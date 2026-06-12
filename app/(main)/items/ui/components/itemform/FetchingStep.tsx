'use client';

import { Button } from '@/app/ui/components/button';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { useEffect, useState } from 'react';
import './prefill.css';

const CYCLE_MS = 2500;

export const FETCHING_MESSAGES = [
  'Fetching item details…',
  'Looking up the price…',
  'Finding product images…',
  'Checking store info…',
  'Hang tight, almost there…',
];

export function FetchingStep({
  url,
  onChangeUrl,
  onCancel,
}: {
  url: string;
  onChangeUrl: () => void;
  onCancel: () => void;
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFaded(true);
      setTimeout(() => {
        setMessageIndex((i) => (i + 1) % FETCHING_MESSAGES.length);
        setFaded(false);
      }, 200);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="prefill-fetching-step">
      <LoadingIndicator size="rail" />
      {/* Cycling text stays outside the indicator's live region — decorative reassurance, not an announcement stream. */}
      <p
        className={`prefill-cycling-msg${faded ? ' prefill-cycling-msg-faded' : ''}`}
        aria-hidden="true"
      >
        {FETCHING_MESSAGES[messageIndex]}
      </p>
      <p className="prefill-moment">This may take a moment.</p>
      <div className="prefill-url-strip">
        <span className="prefill-url-text">{url}</span>
        <Button variant="link" onClick={onChangeUrl}>
          change
        </Button>
      </div>
      <div className="form-shell-ft">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
