'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { useState } from 'react';
import './prefill.css';
import { isValidProductUrl } from './utils';

export function UrlEntryStep({
  initialUrl,
  initialError,
  onFetch,
  onManual,
}: {
  initialUrl?: string;
  initialError?: string;
  onFetch: (url: string) => void;
  onManual: () => void;
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
    <div className="prefill-url-step">
      <p className="prefill-hint">Paste a product link to auto-fill details</p>
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
      <div className="prefill-url-actions">
        <Button variant="primary" onClick={handleFetch}>
          Fetch Details
        </Button>
        <Button variant="link" onClick={onManual}>
          Fill in details manually →
        </Button>
      </div>
    </div>
  );
}
