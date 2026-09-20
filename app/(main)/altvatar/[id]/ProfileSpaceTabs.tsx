'use client';

import { useState } from 'react';
import { Tabs } from '@/app/ui/components/tabs';

// Panels arrive rendered, and the strip only chooses which one shows: both are
// server components, and passing them as props is what lets client tab state
// switch between them without either becoming a client tree.
export default function ProfileSpaceTabs({
  panels,
}: {
  panels: { id: string; label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(panels[0].id);

  return (
    <>
      <Tabs
        className="profile-space-tabs"
        aria-label="Profile space sections"
        items={panels.map((panel) => ({
          label: panel.label,
          value: panel.id,
          id: `profile-space-tab-${panel.id}`,
          panelId: `profile-space-panel-${panel.id}`,
        }))}
        value={active}
        onChange={setActive}
      />
      {panels.map((panel) => (
        <div
          key={panel.id}
          role="tabpanel"
          id={`profile-space-panel-${panel.id}`}
          aria-labelledby={`profile-space-tab-${panel.id}`}
          hidden={panel.id !== active}
        >
          {panel.content}
        </div>
      ))}
    </>
  );
}
