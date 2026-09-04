'use client';

import {
  HERO_SLOT_READY_EVENT,
  HERO_TOOLBAR_SLOT_ID,
} from '@/app/(main)/lists/ui/components/ListHeroSurface';
import type { ItemDisplay, SpoilerTier } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { displayPrice } from '../itemFilters';
import ItemsToolbar from './ItemsToolbar';
import type { BrowserMode } from './types';

// Where the toolbar mounts and what its facets are offered over. Shared by the
// browser and the reorder layout: both render the same toolbar above the same
// item set, and only the region below it differs.
export default function ToolbarSlot({
  items,
  mode,
  tier,
  baseline,
  showGridToggle,
}: {
  items: ItemDisplay[];
  mode: BrowserMode;
  tier?: SpoilerTier;
  baseline?: SpoilerTier;
  showGridToggle?: boolean;
}) {
  // On the list page the toolbar portals into the hero chrome's slot so it
  // rides the hero's shape changes in natural flow; anywhere without a slot
  // (the items library) it renders inline. The slot's section hydrates
  // independently, so re-check when the chrome announces itself.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => setSlot(document.getElementById(HERO_TOOLBAR_SLOT_ID));
    find();
    window.addEventListener(HERO_SLOT_READY_EVENT, find);
    return () => window.removeEventListener(HERO_SLOT_READY_EVENT, find);
  }, []);

  const storeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.store?.name) names.add(item.store.name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hasAnyPrice = useMemo(
    () => items.some((item) => Number.isFinite(displayPrice(item))),
    [items]
  );

  const toolbar = (
    <ItemsToolbar
      mode={mode}
      storeOptions={storeOptions}
      showStoreSort={storeOptions.length > 0}
      showPriceSort={hasAnyPrice}
      showPriceFilter={hasAnyPrice}
      tier={tier}
      baseline={baseline}
      showGridToggle={showGridToggle}
    />
  );

  return slot ? createPortal(toolbar, slot) : toolbar;
}
