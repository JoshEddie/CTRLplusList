'use client';

import AccentPicker from '@/app/ui/components/altvatar/AccentPicker';
import AltvatarControls from '@/app/ui/components/altvatar/AltvatarControls';
import AltvatarMark from '@/app/ui/components/altvatar/AltvatarMark';
import AltvatarPreview from '@/app/ui/components/altvatar/AltvatarPreview';
import ThingPicker from '@/app/ui/components/altvatar/ThingPicker';
import { Button, CloseButton } from '@/app/ui/components/button';
import { useIsClient } from '@/app/ui/hooks/useIsClient';
import '@/app/ui/styles/altvatar.css';
import { accentVars, randomAccentName } from '@/lib/accent';
import {
  ALTVATAR_STYLES,
  DEFAULT_STYLE,
  PERSON_STYLE_IDS,
  kindOf,
  styleOf,
} from '@/lib/altvatar/registry';
import { offersOf, resolveSelections } from '@/lib/altvatar/resolve';
import { shuffleAltvatar, shuffleStyle } from '@/lib/altvatar/shuffle';
import type {
  AltvatarKind,
  AltvatarOptions,
  AxisTab,
} from '@/lib/altvatar/types';
import { AXIS_TABS, TAB_ORDER } from '@/lib/altvatar/vocabulary';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuShuffle } from 'react-icons/lu';

export type AltvatarDraft = {
  style: string;
  options: AltvatarOptions;
  accent: string;
};

// The customizer writes nothing. Confirming returns the draft to the surface
// that opened it, and *when* that lands is the host's own call: a host editing
// a profile that exists saves on confirm, because the control reads as a
// commit and a viewer who leaves the page expects a decision to have stuck; a
// host still building the profile has no row to write to and carries the draft
// to its own submit. Cancelling returns the host's prior values untouched,
// which is why the draft is held here rather than lifted on every keystroke.
//
// Its own shell rather than `FormShell`: the header is an accent gradient
// carrying the mark, and the panel is a tab set rather than a form body.
export default function AltvatarCustomizer({
  value,
  onConfirm,
  onCancel,
}: {
  value: AltvatarDraft;
  onConfirm: (draft: AltvatarDraft) => void;
  onCancel: () => void;
}) {
  const mounted = useIsClient();
  const [draft, setDraft] = useState(value);
  const [tab, setTab] = useState<AxisTab>('Basics');
  const panelRef = useRef<HTMLDivElement>(null);
  const style = styleOf(draft.style);
  const kind = kindOf(draft.style);
  // Which person style to return to after a visit to the thing kind, so
  // toggling kinds is reversible rather than resetting to the default.
  const personStyle = useRef(kind === 'person' ? style.id : DEFAULT_STYLE);
  const offers = offersOf(style, draft.options.selections);

  // A tab with nothing in it is not offered: each person style has whatever
  // its mapping table names. The thing kind's pair is fixed — its icon is a
  // search surface, not an offered axis.
  const tabs: AxisTab[] =
    kind === 'thing'
      ? ['Basics', 'Icon']
      : TAB_ORDER.filter(
          (t) => t === 'Basics' || offers.some((o) => AXIS_TABS[o.axis] === t)
        );
  const shown = offers.filter((o) => AXIS_TABS[o.axis] === tab);

  // One scrolling panel serves every tab, so without this a viewer who scrolled
  // to the end of Hair arrives partway down Face. Also fires on a style change,
  // which swaps the axes under the current tab.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [tab, draft.style]);

  const selectStyle = (id: string) => {
    const next = styleOf(id);
    if (kindOf(next.id) === 'person') personStyle.current = next.id;
    setDraft((d) => ({
      ...d,
      style: next.id,
      // Resolution overwrites rather than shadows: a control showing one value
      // while the draft holds another is a lie the customizer would have to
      // keep telling.
      options: {
        ...d.options,
        selections: resolveSelections(next, d.options.selections),
      },
    }));
    // Back to Basics rather than leaving `tab` on a panel the new style may not
    // have: this is what keeps every tab in `tabs` reachable and current.
    setTab('Basics');
  };

  // Kind is one level above style: switching it swaps the whole surface, and
  // nothing stored is touched — a person's selections wait under a thing's
  // picture exactly as they wait under any style that cannot draw them.
  const selectKind = (next: AltvatarKind) => {
    if (next === kind) return;
    selectStyle(next === 'thing' ? 'openmoji' : personStyle.current);
  };

  // Re-rolls the style, every curated axis of it, the seed that governs the
  // rest, and the accent. The accent is rolled here rather than inside
  // `shuffleAltvatar` because it is a profile preference rather than an
  // Altvatar option — the customizer is what holds both halves of the identity
  // together. Back to Basics for the same reason selecting a style by hand is:
  // a tab renders only where the selected style has axes in it, so a roll into
  // a style without them would leave the panel empty.
  const shuffle = () => {
    const rolled = shuffleStyle();
    setDraft((d) => ({
      ...d,
      style: rolled.id,
      options: shuffleAltvatar(rolled),
      accent: randomAccentName(),
    }));
    setTab('Basics');
  };

  const setAxis = (axis: string, axisValue: string) =>
    setDraft((d) => ({
      ...d,
      options: {
        ...d.options,
        selections: { ...d.options.selections, [axis]: axisValue },
      },
    }));

  if (!mounted) return null;

  // Portaled to document.body so the fixed scrim escapes the stacking context
  // of whichever host opened it — an AltvatarField inside a `.form-shell`
  // (z-index: 1) would otherwise trap the customizer below the fixed nav.
  return createPortal(
    <div className="modal-overlay-scrim altvatar-scrim">
      <div
        className="altvatar-shell"
        role="dialog"
        aria-label="Customise your Altvatar"
        style={accentVars(draft.accent)}
      >
        <div className="altvatar-hd">
          <AltvatarMark />
          <CloseButton onClick={onCancel} className="close-button--in-flow" />
        </div>

        {/* One level above everything else in the shell: the two kinds are
            different surfaces, not two option groups, so the switch sits at
            the door rather than among the controls. */}
        <div
          className="altvatar-kind-switch"
          role="radiogroup"
          aria-label="Kind"
        >
          {(['person', 'thing'] as const).map((k) => (
            <Button
              key={k}
              role="radio"
              variant={k === kind ? 'primary' : 'ghost'}
              aria-checked={k === kind}
              pressed={k === kind}
              onClick={() => selectKind(k)}
            >
              {k === 'person' ? 'Person' : 'Thing'}
            </Button>
          ))}
        </div>

        <div className="altvatar-lede">
          <AltvatarPreview
            styleId={draft.style}
            options={draft.options}
            accent={draft.accent}
          />
          <div className="altvatar-lede-text">
            <span className="altvatar-lede-title">Your Altvatar</span>
            <span className="altvatar-lede-hint">
              Updates live as you pick options below.
            </span>
            {/* A thing is chosen, never rolled — shuffle is a person-kind
                affordance, and the roll never crosses the kind boundary. */}
            {kind === 'person' && (
              <Button variant="secondary" onClick={shuffle}>
                <LuShuffle aria-hidden /> Surprise me
              </Button>
            )}
          </div>
        </div>

        <div
          className="altvatar-tabs"
          role="tablist"
          aria-label="Option groups"
        >
          {tabs.map((t) => (
            <Button
              key={t}
              role="tab"
              size="sm"
              variant={t === tab ? 'primary' : 'ghost'}
              aria-selected={t === tab}
              pressed={t === tab}
              onClick={() => setTab(t)}
            >
              {t}
            </Button>
          ))}
        </div>

        {/* Two surfaces, not one surface with branches: the person kind gets
            the curated control stack across its tabs, the thing kind gets
            Basics for the accent and a search-led Icon tab. */}
        <div className="altvatar-panel" ref={panelRef}>
          {kind === 'thing' ? (
            <>
              {tab === 'Basics' && (
                <AccentPicker
                  value={draft.accent}
                  onChange={(accent) => setDraft((d) => ({ ...d, accent }))}
                />
              )}
              {tab === 'Icon' && (
                <ThingPicker
                  current={draft.options.selections.glyph}
                  accent={draft.accent}
                  onPick={(code) => setAxis('glyph', code)}
                />
              )}
            </>
          ) : (
            <>
              {tab === 'Basics' && (
                <>
                  <div className="altvatar-axis">
                    <div className="altvatar-axis-hd">
                      <h2 className="altvatar-axis-title">Avatar style</h2>
                    </div>
                    <div
                      className="altvatar-style-picker"
                      role="radiogroup"
                      aria-label="Avatar style"
                    >
                      {PERSON_STYLE_IDS.map((id) => (
                        <Button
                          key={id}
                          role="radio"
                          size="sm"
                          variant={id === draft.style ? 'primary' : 'ghost'}
                          aria-checked={id === draft.style}
                          pressed={id === draft.style}
                          onClick={() => selectStyle(id)}
                        >
                          {ALTVATAR_STYLES[id].label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <AccentPicker
                    value={draft.accent}
                    onChange={(accent) => setDraft((d) => ({ ...d, accent }))}
                  />
                </>
              )}

              <AltvatarControls
                styleId={draft.style}
                options={draft.options}
                offers={shown}
                accent={draft.accent}
                onChange={setAxis}
              />
            </>
          )}
        </div>

        <div className="altvatar-ft">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onConfirm(draft)}>
            Use this Altvatar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
