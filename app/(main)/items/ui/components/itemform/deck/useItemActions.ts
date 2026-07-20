'use client';

import { MAX_IMAGE_CANDIDATES } from '@/lib/imageCandidates';
import { isPlaceholderUri } from '@/lib/placeholderArt.shared';
import type { OptionType } from '@/lib/types';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import { setStoreField, type ItemViewModel } from './viewModel';

type SetItem = Dispatch<SetStateAction<ItemViewModel>>;

// The single mutation surface for the view-model, shared by the deck cards,
// Preview, Focus editors, and the Lists sheet — so no two surfaces hand-roll
// divergent update logic.
export function useItemActions(setItem: SetItem) {
  return useMemo(
    () => ({
      setName: (name: string) => setItem((p) => ({ ...p, name })),
      setDescription: (description: string) =>
        setItem((p) => ({ ...p, description })),
      selectPhoto: (photoIndex: number) =>
        setItem((p) => ({ ...p, photoIndex, placeholder: null })),
      selectPlaceholder: (placeholder: string) =>
        setItem((p) => ({ ...p, placeholder })),
      addPhoto: (url: string) =>
        setItem((p) =>
          // The cap counts real candidates only — a saved placeholder riding
          // the pool is exempt, mirroring server validation.
          p.photos.filter((photo) => !isPlaceholderUri(photo)).length >=
          MAX_IMAGE_CANDIDATES
            ? p
            : {
                ...p,
                photos: [...p.photos, url],
                photoIndex: p.photos.length,
                placeholder: null,
              }
        ),
      setStore: (field: 'name' | 'link' | 'price', value: string) =>
        setItem((p) => ({
          ...p,
          store: setStoreField(p.store, field, value),
        })),
      setLists: (lists: OptionType[]) => setItem((p) => ({ ...p, lists })),
      setQty: (qty: number | null) => setItem((p) => ({ ...p, qty })),
    }),
    [setItem]
  );
}

export type ItemActions = ReturnType<typeof useItemActions>;
