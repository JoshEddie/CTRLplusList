'use client';

import { useState } from 'react';

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
      <div className="profile-space-tabs" role="tablist">
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            id={`profile-space-tab-${panel.id}`}
            aria-selected={panel.id === active}
            aria-controls={`profile-space-panel-${panel.id}`}
            className={`profile-space-tab${panel.id === active ? ' is-active' : ''}`}
            onClick={() => setActive(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </div>
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
