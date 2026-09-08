'use client';

import { Tabs } from '@/app/ui/components/tabs';
import { getMessage } from '@/lib/i18n/utils';
import type { ReactNode } from 'react';
import NewItemButton from './NewItemButton';

export type EditModeTab = 'list' | 'add';

export const EDIT_MODE_TABS = {
  list: { tabId: 'edit-mode-tab-list', panelId: 'edit-mode-panel-list' },
  add: { tabId: 'edit-mode-tab-add', panelId: 'edit-mode-panel-add' },
} as const;

// A plain sticky strip. It never collapses: a band that grows back on an
// upward scroll slides every drop target under a drag toward the top.
export default function EditModeBand({
  title,
  tab,
  onTabChange,
  inListCount,
  onCreate,
  children,
}: {
  title: string;
  tab: EditModeTab;
  onTabChange: (tab: EditModeTab) => void;
  inListCount: number;
  onCreate: () => void;
  /** A third row under the tabs — the library's toolbar — that pins with them. */
  children?: ReactNode;
}) {
  return (
    <div className="edit-mode-band">
      <h1 className="edit-mode-band-title">{title}</h1>
      <div className="edit-mode-tabrow">
        <Tabs<EditModeTab>
          size="sm"
          className="edit-mode-tabs"
          aria-label={getMessage('edit_mode_tabs_label')}
          value={tab}
          onChange={onTabChange}
          items={[
            {
              label: getMessage('edit_mode_tab_in_list', {
                count: inListCount,
              }),
              value: 'list',
              id: EDIT_MODE_TABS.list.tabId,
              panelId: EDIT_MODE_TABS.list.panelId,
            },
            {
              label: getMessage('edit_mode_tab_add_items'),
              value: 'add',
              id: EDIT_MODE_TABS.add.tabId,
              panelId: EDIT_MODE_TABS.add.panelId,
            },
          ]}
        />
        <NewItemButton size="sm" onClick={onCreate} />
      </div>
      {children}
    </div>
  );
}
