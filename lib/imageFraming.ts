import type { CSSProperties } from 'react';

export const IMAGE_FITS = ['cover', 'contain'] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];

/** How one image sits in a card: focal point as percentages of its width and height, and whether it fills the card or fits whole inside it. */
export type ImageFraming = { focal_x: number; focal_y: number; fit: ImageFit };

// Centre + cover is how every card rendered before framing existed, so it is
// also the column default.
export const DEFAULT_FRAMING: ImageFraming = {
  focal_x: 50,
  focal_y: 50,
  fit: 'cover',
};

/** Framing keyed by image URL, so each image in a pool keeps its own. */
export type FramingByUrl = Record<string, ImageFraming>;

export function framingOf({ focal_x, focal_y, fit }: ImageFraming) {
  return { focal_x, focal_y, fit };
}

export function framingByUrl(
  rows: (ImageFraming & { url: string })[]
): FramingByUrl {
  return Object.fromEntries(rows.map((row) => [row.url, framingOf(row)]));
}

export function framingFor(framing: FramingByUrl, url: string): ImageFraming {
  return framing[url] ?? DEFAULT_FRAMING;
}

export function framingStyle(
  framing: ImageFraming | null | undefined
): CSSProperties | undefined {
  if (!framing) return undefined;
  // A fitted image is shown whole, so there is no crop for a focal point to steer.
  return framing.fit === 'contain'
    ? { objectFit: 'contain' }
    : {
        objectFit: 'cover',
        objectPosition: `${framing.focal_x}% ${framing.focal_y}%`,
      };
}
