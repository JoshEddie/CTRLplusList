'use client';

import { HERO_BAND_SLOT_ID } from '@/app/(main)/lists/ui/components/ListHeroSurface';
import { useHeroSlot } from '@/app/(main)/lists/ui/components/useHeroSlot';
import { Tabs } from '@/app/ui/components/tabs';
import { getMessage } from '@/lib/i18n/utils';
import { createPortal } from 'react-dom';
import AddItemMenu from './AddItemMenu';
import { OWNER_PANEL_ID, OWNER_TAB_IDS, type OwnerTab } from './ownerTabs';

// The owner's band rides inside the hero chrome, above the toolbar slot, so it
// pins with the hero rather than against it. It never collapses: the chrome
// only clips its own layer, and everything appended after that layer stays.
export default function ListOwnerBand({
  tab,
  onTabChange,
  inListCount,
  onCreate,
  onChooseExisting,
}: {
  tab: OwnerTab;
  onTabChange: (tab: OwnerTab) => void;
  inListCount: number;
  onCreate: () => void;
  onChooseExisting: () => void;
}) {
  const slot = useHeroSlot(HERO_BAND_SLOT_ID);

  const band = (
    <div className="list-owner-band">
      <Tabs<OwnerTab>
        size="sm"
        className="list-owner-tabs"
        aria-label={getMessage('owner_tabs_label')}
        value={tab}
        onChange={onTabChange}
        items={[
          {
            label: getMessage('owner_tab_in_list', { count: inListCount }),
            value: 'list',
            id: OWNER_TAB_IDS.list,
            panelId: OWNER_PANEL_ID,
          },
          {
            label: getMessage('owner_tab_all_items'),
            value: 'library',
            id: OWNER_TAB_IDS.library,
            panelId: OWNER_PANEL_ID,
          },
        ]}
      />
      <AddItemMenu onCreate={onCreate} onChooseExisting={onChooseExisting} />
    </div>
  );

  return slot ? createPortal(band, slot) : band;
}
