/* eslint-disable @next/next/no-img-element */
'use client';

import { getMessage } from '@/lib/i18n/utils';
import { framingStyle, type ImageFraming } from '@/lib/imageFraming';
import { useRef } from 'react';

const STEP = 5;
// Which way each key moves the photo, matching a drag in that direction.
const DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

type Size = { width: number; height: number };

const clampPercent = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

// With object-position at p%, the image sits (frame - rendered) × p from the
// frame's edge. Slack is that negative span; an axis the image fills exactly
// has none, and nothing to pan.
function slackOf(box: DOMRect, natural: Size): Size {
  const scale = Math.max(
    box.width / natural.width,
    box.height / natural.height
  );
  return {
    width: box.width - natural.width * scale,
    height: box.height - natural.height * scale,
  };
}

const pannable = (slack: number) => slack <= -1;

// Moving the photo `delta` px moves p by delta over the slack.
const panAlong = (focal: number, delta: number, slack: number) =>
  pannable(slack) ? clampPercent(focal + (delta / slack) * 100) : focal;

const nudgeAlong = (focal: number, direction: number, slack: number) =>
  pannable(slack) ? clampPercent(focal - direction * STEP) : focal;

export default function FocalPoint({
  url,
  framing,
  onChange,
  disabled,
}: {
  url: string;
  framing: ImageFraming;
  onChange: (framing: ImageFraming) => void;
  disabled?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    from: ImageFraming;
    natural: Size;
  } | null>(null);

  // An unloaded image has no size to pan against.
  const naturalSize = (): Size | null => {
    const img = imgRef.current;
    return img?.naturalWidth
      ? { width: img.naturalWidth, height: img.naturalHeight }
      : null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const natural = naturalSize();
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, from: framing, natural };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (!start) return;
    const slack = slackOf(
      e.currentTarget.getBoundingClientRect(),
      start.natural
    );
    onChange({
      ...start.from,
      focal_x: panAlong(start.from.focal_x, e.clientX - start.x, slack.width),
      focal_y: panAlong(start.from.focal_y, e.clientY - start.y, slack.height),
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const direction = DIRECTIONS[e.key];
    const natural = naturalSize();
    if (!direction || !natural) return;
    e.preventDefault();
    const slack = slackOf(e.currentTarget.getBoundingClientRect(), natural);
    onChange({
      ...framing,
      focal_x: nudgeAlong(framing.focal_x, direction[0], slack.width),
      focal_y: nudgeAlong(framing.focal_y, direction[1], slack.height),
    });
  };

  return (
    <>
      <img
        ref={imgRef}
        src={url}
        alt={getMessage('photo_selected_alt')}
        style={framingStyle(framing)}
      />
      <button
        type="button"
        className="deck-photo-focus"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label={getMessage('photo_focal_label', {
          x: framing.focal_x,
          y: framing.focal_y,
        })}
      />
    </>
  );
}
