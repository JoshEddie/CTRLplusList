'use client';

import ItemsToolbar from '@/app/(main)/items/ui/components/itemsToolbar/ItemsToolbar';
import {
  hasAnyPrice,
  storeOptionsOf,
} from '@/app/(main)/items/ui/components/itemsToolbar/utils';
import { ItemDisplay } from '@/lib/types';
import { useMemo } from 'react';

// Rendered directly rather than through the hero-slot portal: that portal
// resolves its target once and never clears it, and the mode has no hero
// surface for it to land in.
export default function EditModeToolbar({ items }: { items: ItemDisplay[] }) {
  const storeOptions = useMemo(() => storeOptionsOf(items), [items]);
  const priced = useMemo(() => hasAnyPrice(items), [items]);
  return (
    <ItemsToolbar
      mode="edit"
      storeOptions={storeOptions}
      showStoreSort={storeOptions.length > 0}
      showPriceSort={priced}
      showPriceFilter={priced}
      showGridToggle={false}
    />
  );
}
