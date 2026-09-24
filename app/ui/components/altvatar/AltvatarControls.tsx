'use client';

import '@/app/ui/components/field/form-field.css';
import '@/app/ui/styles/altvatar.css';
import { styleOf } from '@/lib/altvatar/registry';
import { renderAltvatar } from '@/lib/altvatar/render';
import type { AxisOffer } from '@/lib/altvatar/resolve';
import { withoutOverlaysOver } from '@/lib/altvatar/resolve';
import type { AltvatarOptions } from '@/lib/altvatar/types';
import { useEffect, useState } from 'react';
import AxisHeading from './AxisHeading';
import ChipGrid from './ChipGrid';
import TileGrid from './TileGrid';
import type { TileArt } from './utils';

// Every option is shown as the face it produces rather than as its name, so
// choosing is looking rather than reading — which is the only way to choose
// between values whose names mean little on their own. The art is rendered in
// the browser, one pass per visible panel; grouping axes into tabs is what
// keeps that a few dozen renders rather than every option the style has.

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
