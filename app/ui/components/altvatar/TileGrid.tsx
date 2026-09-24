'use client';

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import type { AxisOffer } from '@/lib/altvatar/resolve';
import { LuCheck } from 'react-icons/lu';
import { labelOfAxis, type TileArt } from './utils';

export default function TileGrid({
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
