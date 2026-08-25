/* eslint-disable @next/next/no-img-element */
'use client';

import {
  fallbackItemPlaceholder,
  mintItemPlaceholder,
} from '@/lib/data/item.placeholder.actions';
import { useEffect, useRef, useState } from 'react';

const ItemPhoto: React.FC<{ itemId: string; name: string; url: string }> = ({
  itemId,
  name,
  url,
}) => {
  const [mintedUrl, setMintedUrl] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  // StrictMode re-runs effects; the guard keeps the mint to one call per mount.
  const minted = useRef(false);
  const failed = useRef(false);

  useEffect(() => {
    if (url || !itemId || minted.current) return;
    minted.current = true;
    mintItemPlaceholder(itemId).then((result) => {
      if (result.success && result.url) setMintedUrl(result.url);
    });
  }, [url, itemId]);

  // Dead saved URL (rotted CDN link, hotlink block): swap in render-only
  // fallback art. The saved URL is never overwritten — the next page load
  // retries it. Minted art is a data URI and cannot fail to load.
  const handleError = () => {
    if (failed.current || !url || !itemId) return;
    failed.current = true;
    fallbackItemPlaceholder(itemId).then((result) => {
      if (result.success && result.url) setFallbackUrl(result.url);
    });
  };

  const displayUrl = fallbackUrl || url || mintedUrl;
  return (
    <div className="item-image-container">
      {displayUrl && (
        <img
          className="item-image"
          src={displayUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={handleError}
        />
      )}
    </div>
  );
};

export default ItemPhoto;
