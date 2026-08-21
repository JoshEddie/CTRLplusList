/* v8 ignore file -- undocumented palette-inspection surface for the maintainer, not a product route: it renders the palette this repo already asserts in lib/__tests__/accent.test.ts, so testing its toggles would pin the inspector rather than anything a user can reach. Dies with the directory. */
'use client';

import AccentPreview from '@/app/(main)/profiles/ui/components/AccentPreview';
import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
import { useState } from 'react';

// ponytail: throwaway palette lab — delete with the directory. Inline styles on
// purpose so nothing lands in profiles.css that has to be cleaned up later.
const swatch = {
  display: 'block',
  width: 44,
  height: 44,
  borderRadius: '50%',
};

const block = {
  width: 44,
  height: 44,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 8,
  fontFamily: 'monospace',
};

export default function Page() {
  const [hidden, setHidden] = useState<string[]>([]);
  const toggle = (accent: string) =>
    setHidden((prev) =>
      prev.includes(accent)
        ? prev.filter((a) => a !== accent)
        : [...prev, accent]
    );

  return (
    <main className="container">
      {/* <details> is the whole dropdown: open/close, escape, click-outside on
          the summary all come from the platform. */}
      <details style={{ marginBottom: 16, width: 'fit-content' }}>
        <summary style={{ cursor: 'pointer' }}>
          Colours ({ACCENT_NAMES.length - hidden.length}/{ACCENT_NAMES.length})
        </summary>
        <div
          style={{
            position: 'absolute',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, auto)',
            gap: '2px 16px',
            padding: 12,
            background: 'var(--background-color)',
            border: '1px solid var(--card-border-color)',
            borderRadius: 8,
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {ACCENT_NAMES.map((accent) => (
            <label key={accent} style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!hidden.includes(accent)}
                onChange={() => toggle(accent)}
              />{' '}
              {accent}
            </label>
          ))}
          <button type="button" onClick={() => setHidden([])}>
            All
          </button>
          <button type="button" onClick={() => setHidden([...ACCENT_NAMES])}>
            None
          </button>
        </div>
      </details>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 20,
        }}
      >
        {Object.entries(ACCENT_PRESETS)
          .filter(([accent]) => !hidden.includes(accent))
          .map(([accent, preset]) => (
            <div key={accent} style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 0 }}>
                <AccentPreview name={accent} tagline="" accent={accent} />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    paddingLeft: 4,
                  }}
                >
                  <span
                    style={{
                      ...swatch,
                      backgroundImage: `linear-gradient(120deg, ${preset.light}, ${preset.dark})`,
                    }}
                  />
                  <span
                    style={{
                      ...swatch,
                      backgroundImage: `linear-gradient(120deg, ${preset.light}, ${preset.dark})`,
                      boxShadow: `0 0 0 3px var(--background-color), 0 0 0 5px ${preset.ink}`,
                    }}
                  />
                  <span style={{ fontSize: 14, textTransform: 'capitalize' }}>
                    {accent}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 4, alignContent: 'start' }}>
                <div
                  style={{ ...block, background: preset.light, color: '#000' }}
                >
                  {preset.light}
                </div>
                <div
                  style={{ ...block, background: preset.dark, color: '#fff' }}
                >
                  {preset.dark}
                </div>
                <div
                  style={{ ...block, background: preset.ink, color: '#fff' }}
                >
                  {preset.ink}
                </div>
              </div>
            </div>
          ))}
      </div>
    </main>
  );
}
