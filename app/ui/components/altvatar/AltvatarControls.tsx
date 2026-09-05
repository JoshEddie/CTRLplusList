'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import '@/app/ui/components/field/form-field.css';
import '@/app/ui/styles/altvatar.css';
import { styleOf } from '@/lib/altvatar/registry';
import { renderAltvatar } from '@/lib/altvatar/render';
import type { AxisOffer } from '@/lib/altvatar/resolve';
import { withoutOverlaysOver } from '@/lib/altvatar/resolve';
import type { AltvatarOptions, CanonicalAxis } from '@/lib/altvatar/types';
import { COLOR_AXES, ENUM_AXES } from '@/lib/altvatar/vocabulary';
import { useEffect, useState } from 'react';
import { LuCheck } from 'react-icons/lu';

// Every option is shown as the face it produces rather than as its name, so
// choosing is looking rather than reading — which is the only way to choose
// between values whose names mean little on their own. The art is rendered in
// the browser, one pass per visible panel; grouping axes into tabs is what
// keeps that a few dozen renders rather than every option the style has.

type TileArt = Record<string, string>;

function useOptionArt(
  styleId: string,
  options: AltvatarOptions,
  offers: AxisOffer[]
): TileArt {
  const [art, setArt] = useState<TileArt>({});
  // Serialised rather than compared by reference: the offers and selections are
  // rebuilt on every render, so an identity check would re-run this forever.
  const key = JSON.stringify([
    styleId,
    options,
    offers.map((o) => (o.kind === 'enum' ? o.values.map((v) => v.value) : [])),
  ]);

  useEffect(() => {
    let live = true;
    const next: TileArt = {};
    Promise.all(
      offers.flatMap((offer) =>
        offer.kind !== 'enum'
          ? []
          : offer.values.map(async (v) => {
              next[`${offer.axis}:${v.value}`] = await renderAltvatar(styleId, {
                ...options,
                // Drawn without whatever overlay covers this axis, so a tile
                // grid under a hat shows the hair it offers rather than the
                // same hat over and over.
                selections: withoutOverlaysOver(
                  styleOf(styleId),
                  offer.axis,
                  { ...options.selections, [offer.axis]: v.value }
                ),
              });
            })
      )
    ).then(() => {
      if (live) setArt(next);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the serialised form of every dependency; listing them as well would re-run on each new object identity.
  }, [key]);

  return art;
}

function labelOfAxis(axis: CanonicalAxis): string {
  return Object.hasOwn(COLOR_AXES, axis)
    ? COLOR_AXES[axis as keyof typeof COLOR_AXES].label
    : ENUM_AXES[axis as keyof typeof ENUM_AXES].label;
}

function AxisHeading({ axis, value }: { axis: CanonicalAxis; value: string }) {
  return (
    <div className="altvatar-axis-hd">
      <h2 className="altvatar-axis-title">{labelOfAxis(axis)}</h2>
      <span className="altvatar-axis-value">{value}</span>
    </div>
  );
}

function TileGrid({
  offer,
  current,
  art,
  styleId,
  accent,
  onChange,
}: {
  offer: Extract<AxisOffer, { kind: 'enum' }>;
  current: string;
  art: TileArt;
  styleId: string;
  accent: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="altvatar-tiles"
      role="radiogroup"
      aria-label={labelOfAxis(offer.axis)}
    >
      {offer.values.map((v) => {
        const selected = v.value === current;
        const drawn = art[`${offer.axis}:${v.value}`];
        return (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`altvatar-tile${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(v.value)}
          >
            {/* The same disc every other surface fills, so a tile shows what
                the avatar will actually look like. */}
            <ProfileAvatar
              profile={{
                name: '',
                accent,
                art: drawn ?? null,
                avatarStyle: styleId,
              }}
            />
            <span className="altvatar-tile-label">{v.label}</span>
            {selected && (
              <span className="altvatar-tile-mark" aria-hidden>
                <LuCheck />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ChipGrid({
  offer,
  current,
  onChange,
}: {
  offer: Extract<AxisOffer, { kind: 'color' }>;
  current: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="altvatar-chips"
      role="radiogroup"
      aria-label={labelOfAxis(offer.axis)}
    >
      {offer.palette.map((v) => {
        const selected = v.value === current;
        return (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`altvatar-chip${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(v.value)}
          >
            <span
              className="altvatar-chip-fill"
              style={{ background: `#${v.value}` }}
            >
              {selected && (
                <span className="altvatar-chip-mark" aria-hidden>
                  <LuCheck />
                </span>
              )}
            </span>
            <span className="altvatar-chip-label">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AltvatarControls({
  styleId,
  options,
  offers,
  accent,
  onChange,
}: {
  styleId: string;
  options: AltvatarOptions;
  offers: AxisOffer[];
  accent: string | null;
  onChange: (axis: string, value: string) => void;
}) {
  const art = useOptionArt(styleId, options, offers);

  return (
    <>
      {offers.map((offer) => {
        const current = options.selections[offer.axis] ?? '';
        const chosen = (
          offer.kind === 'enum' ? offer.values : offer.palette
        ).find((v) => v.value === current);

        return (
          <div className="altvatar-axis" key={offer.axis}>
            <AxisHeading axis={offer.axis} value={chosen?.label ?? ''} />
            {offer.kind === 'enum' ? (
              <TileGrid
                offer={offer}
                current={current}
                art={art}
                styleId={styleId}
                accent={accent}
                onChange={(v) => onChange(offer.axis, v)}
              />
            ) : (
              <ChipGrid
                offer={offer}
                current={current}
                onChange={(v) => onChange(offer.axis, v)}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
