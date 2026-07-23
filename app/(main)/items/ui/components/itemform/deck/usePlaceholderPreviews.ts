'use client';

import { previewPlaceholders } from '@/lib/data/item.placeholder.actions';
import { isPlaceholderUri } from '@/lib/placeholderArt.shared';
import { useEffect, useRef, useState } from 'react';
import type { ItemActions } from './useItemActions';
import type { ItemViewModel } from './viewModel';

// Transient placeholder thumbs for the photo editor: tops the strip up to
// max(1, 4 − realPhotos) generated-art options. A placeholder the user already
// selected survives remounts as the first thumb (it lives in the view-model);
// the rest are fresh random seeds each mount and are never persisted.
// `preselectFirst` is the deck photo card's zero-real-photo behavior only —
// the FocusEditor edit path must never silently select art the user didn't pick.
export function usePlaceholderPreviews(
  item: ItemViewModel,
  actions: ItemActions,
  preselectFirst = false
) {
  const [placeholders, setPlaceholders] = useState<string[]>(
    item.placeholder ? [item.placeholder] : []
  );
  // One fetch per mount, StrictMode-proof.
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    const realCount = item.photos.filter(
      (url) => !isPlaceholderUri(url)
    ).length;
    const needed = Math.max(1, 4 - realCount) - (item.placeholder ? 1 : 0);
    if (needed < 1) return;
    previewPlaceholders(needed).then((res) => {
      if (res.success && res.urls) {
        const fresh = res.urls;
        setPlaceholders((prev) => [...prev, ...fresh]);
        // A zero-photo strip is placeholders-only: pre-select the first so the
        // stage never renders an empty frame.
        if (
          preselectFirst &&
          item.photos.length === 0 &&
          !item.placeholder &&
          fresh[0]
        ) {
          actions.selectPlaceholder(fresh[0]);
        }
      }
    });
  }, [item.photos, item.placeholder, actions, preselectFirst]);

  const reroll = () => {
    const selected = item.placeholder;
    if (!selected) return;
    previewPlaceholders(1).then((res) => {
      const fresh = res.urls?.[0];
      if (!fresh) return;
      setPlaceholders((prev) =>
        prev.map((url) => (url === selected ? fresh : url))
      );
      actions.selectPlaceholder(fresh);
    });
  };

  return { placeholders, reroll };
}
