/* eslint-disable @next/next/no-img-element */
'use client';

import { mintItemPlaceholder } from '@/lib/data/item.placeholder.actions';
import { useEffect, useRef, useState } from 'react';

const ItemPhoto: React.FC<{ itemId: string; name: string; url: string }> = ({
  itemId,
  name,
  url,
}) => {
  const [mintedUrl, setMintedUrl] = useState('');
  // StrictMode re-runs effects; the guard keeps the mint to one call per mount.
  const minted = useRef(false);

  useEffect(() => {
    if (url || !itemId || minted.current) return;
    minted.current = true;
    mintItemPlaceholder(itemId).then((result) => {
      if (result.success && result.url) setMintedUrl(result.url);
    });
  }, [url, itemId]);

  const displayUrl = url || mintedUrl;
  return (
    <div className="item-image-container">
      {displayUrl && (
        <img
          className="item-image"
          src={displayUrl}
          alt={name}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};

export default ItemPhoto;
