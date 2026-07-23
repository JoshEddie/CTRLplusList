'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { useState } from 'react';
import { PiStarFourFill } from 'react-icons/pi';
import { DeckScreen } from './deck/DeckShell';
import './prefill.css';
import { isValidProductUrl } from '@/lib/storeValidity';

export function UrlEntryStep({
  initialUrl,
  initialError,
  onFetch,
  onLinkless,
}: {
  initialUrl?: string;
  initialError?: string;
  onFetch: (url: string) => void;
  onLinkless: () => void;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [error, setError] = useState(initialError ?? '');

  const handleFetch = () => {
    const trimmed = url.trim();
    if (!isValidProductUrl(trimmed)) {
      setError('Please enter a valid product link (http or https)');
      return;
    }
    onFetch(trimmed);
  };

  return (
    <DeckScreen
      title="Start with a link"
      subtitle="Paste a product link, we'll pull the details, then walk you through anything that still needs attention."
      foot={
        <div className="prefill-url-actions">
          <Button variant="primary" onClick={handleFetch} width="full">
            <PiStarFourFill />
            Fetch Details
          </Button>
          <Button variant="ghost" width="full" onClick={onLinkless}>
            No link? Cash, gift cards & more
          </Button>
        </div>
      }
    >
      <TextField
        label="Product link"
        type="url"
        value={url}
        error={error}
        placeholder="https://www.amazon.com/..."
        autoFocus
        onChange={(e) => {
          setUrl(e.target.value);
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleFetch();
          }
        }}
      />
    </DeckScreen>
  );
}
