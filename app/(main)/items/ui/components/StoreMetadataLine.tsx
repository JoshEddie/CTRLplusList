'use client';

import { ItemDisplay } from '@/lib/types';
import { useLayoutEffect, useRef, useState } from 'react';
import '../styles/store-links.css';
import { formatStorePrice, sortedValidStores } from './utils';

const MAX_NAMED_STORES = 2;

export default function StoreMetadataLine({ item }: { item: ItemDisplay }) {
  const stores = sortedValidStores(item.stores);
  const maxNamed = Math.min(MAX_NAMED_STORES, stores.length);
  const [named, setNamed] = useState(maxNamed);
  const spanRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<(() => void) | null>(null);
  const storesKey = stores.map((s) => s.name).join('|');

  // The store list can change in place (item-form live preview); restart the
  // fit from the maximum for the new list.
  const [prevKey, setPrevKey] = useState(storesKey);
  if (storesKey !== prevKey) {
    setPrevKey(storesKey);
    setNamed(maxNamed);
  }

  // Two-pass fit: render the most names allowed, then drop names one at a
  // time (growing the +N count) while the just-painted line overflows —
  // "Crate & Barrel · Williams Sonoma +1" becomes "Crate & Barrel +2".
  // Re-measures whenever the rendered text changes.
  useLayoutEffect(() => {
    const measure = () => {
      const el = spanRef.current;
      if (!el) return;
      if (el.scrollWidth > el.clientWidth) {
        setNamed((n) => (n > 1 ? n - 1 : n));
      }
    };
    measureRef.current = measure;
    measure();
  }, [named, storesKey]);

  // A resized container may fit more names (reset to the maximum and let the
  // fit pass shrink back down) or fewer (re-measure the current text).
  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setNamed(maxNamed);
      measureRef.current?.();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxNamed]);

  if (stores.length === 0) return null;
  const overflow = stores.length - named;
  return (
    <div className="item-price-row item-price-row--metadata">
      <span className="item-price">{formatStorePrice(stores[0].price)}</span>
      <span className="item-store-metadata">
        <span ref={spanRef} className="item-store-metadata-names">
          {stores
            .slice(0, named)
            .map((s) => ` · ${s.name}`)
            .join('')}
        </span>
        {overflow > 0 && (
          <span className="item-store-metadata-count">&nbsp;+{overflow}</span>
        )}
      </span>
    </div>
  );
}
