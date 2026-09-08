'use client';

import { createContext, useContext } from 'react';

/** The owner's working surface: the list itself, or their whole item library. */
export type OwnerTab = 'list' | 'library';

export const OWNER_PANEL_ID = 'list-owner-panel';

/** The tab elements the shared panel names as its label. */
export const OWNER_TAB_IDS = {
  list: 'list-owner-tab-list',
  library: 'list-owner-tab-library',
} as const;

/** What a surface rendered inside the panels can ask the band to do. */
type OwnerTabsApi = {
  showLibrary: () => void;
  createItem: () => void;
};

export const OwnerTabsContext = createContext<OwnerTabsApi | null>(null);

// Throws rather than degrading to no-ops: every consumer is a panel the band
// itself renders, so a missing provider is a wiring mistake, and a button that
// silently does nothing is the worse way to find out.
export function useOwnerTabs(): OwnerTabsApi {
  const api = useContext(OwnerTabsContext);
  if (!api) throw new Error('useOwnerTabs must be used inside the owner band');
  return api;
}
