'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { useEffect, useMemo, useState } from 'react';
import { ImageCandidateGrid } from './ImageCandidateGrid';
import './image-search.css';

// Candidates whose natural dimensions fall below this (px, both axes) are
// dropped from the grid. Extractors routinely include tiny thumbnails — e.g.
// Amazon's `_AC_US40_` 40px variant — that are useless as the item image.
const MIN_IMAGE_PX = 200;

interface ImageUrlInputProps {
  value?: string | null;
  error: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  candidates?: string[];
}

export function ImageUrlInput({
  value,
  error,
  onChange,
  disabled,
  candidates,
}: ImageUrlInputProps) {
  const pool = useMemo(() => candidates ?? [], [candidates]);
  const [tooSmall, setTooSmall] = useState<Set<string>>(new Set());
  const [editingUrl, setEditingUrl] = useState(false);

  // We never fetch candidate bytes server-side (no SSRF surface), so natural
  // size is only knowable client-side: probe each, prune the undersized.
  useEffect(() => {
    if (pool.length < 2) return;
    let cancelled = false;
    Promise.all(
      pool.map(
        (url) =>
          new Promise<{ url: string; ok: boolean }>((resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({
                url,
                ok:
                  img.naturalWidth >= MIN_IMAGE_PX &&
                  img.naturalHeight >= MIN_IMAGE_PX,
              });
            img.onerror = () => resolve({ url, ok: false });
            img.src = url;
          })
      )
    ).then((results) => {
      if (cancelled) return;
      setTooSmall(new Set(results.filter((r) => !r.ok).map((r) => r.url)));
    });
    return () => {
      cancelled = true;
    };
  }, [pool]);

  // Keep the active image (what's set) and the extractor's main (pool[0])
  // always visible even if undersized — pruning the main would make a small
  // main image unreselectable the moment you pick another tile.
  const mainUrl = pool[0];
  const visible = pool.filter(
    (url) => url === value || url === mainUrl || !tooSmall.has(url)
  );

  const hasCandidates = visible.length >= 2;
  const active = value && visible.includes(value) ? value : null;

  // The grid is the primary selector. The URL field is the afterthought:
  // hidden behind a toggle when candidates exist, but forced visible when
  // there's nothing to pick or a (e.g. failed-load) error needs surfacing.
  const showUrlField = !hasCandidates || editingUrl || !!error;

  return (
    <div className="image-field">
      {hasCandidates && (
        <ImageCandidateGrid
          candidates={visible}
          activeUrl={active ?? undefined}
          onSelect={onChange}
          disabled={disabled}
        />
      )}

      {showUrlField ? (
        <TextField
          type="url"
          label="Image URL"
          error={error || undefined}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://example.com/image.jpg"
          autoComplete="off"
        />
      ) : (
        <Button
          variant="link"
          onClick={() => setEditingUrl(true)}
          disabled={disabled}
        >
          Edit image URL
        </Button>
      )}
    </div>
  );
}
