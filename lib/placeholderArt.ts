import { PLACEHOLDER_URI_PREFIX } from '@/lib/placeholderArt.shared';
import { createAvatar } from '@dicebear/core';
import * as shapes from '@dicebear/shapes';

export { PLACEHOLDER_URI_PREFIX };

// Server-only: DiceBear must never enter a client bundle — import this module
// only from server actions; client code classifies via placeholderArt.shared.
//
// Colors are baked into the generated SVG at generation time, so saved art is
// self-contained and never re-themed at render. These hex constants are
// brand-derived snapshots of global.css tokens and can drift from them by
// design — a rebrand updates the constants and regenerates affected art.
// The palette itself is seed-picked so the art varies in background and color
// scheme, not just shape layout.
export const PLACEHOLDER_PALETTES = [
  // Dark primary: --primary-color-dark bg; two purples (--primary-color-light,
  // --buy-link-bg) plus one blue tint borrowed from the secondary set.
  { background: '2a2060', shapes: ['cda2ff', 'bdd1ec', 'f0eeff'] },
  // Light: --buy-link-border bg; --primary-color-dark, --buy-link-text,
  // --buy-link-bg shapes — a dark, a mid, and a near-white so the tones read
  // apart (muted only — the vibrant primary/secondary overpower the card).
  { background: 'c4b8ff', shapes: ['2a2060', '7aa2da', 'f0eeff'] },
  // Dark secondary: --secondary-color-dark bg; two muted --secondary-color
  // tints (#2264c1 at ~40/90% toward white) plus one purple
  // (--buy-link-border) — the mirror of the dark-primary mix.
  { background: '05155d', shapes: ['7aa2da', 'c4b8ff', 'e9f0fa'] },
] as const;

// Deterministic string hash (FNV-1a + avalanche finalizer) — same seed must
// always land on the same palette so concurrent mints stay byte-identical.
// The finalizer matters: purely additive hashes (djb2) map the near-identical
// item-id seeds (`…-item-1` vs `…-item-4`) to the same value mod 3, pinning
// every minted placeholder to one palette.
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function generatePlaceholderArt(seed: string): string {
  const palette = PLACEHOLDER_PALETTES[hashSeed(seed) % PLACEHOLDER_PALETTES.length];
  const shapeColors = [...palette.shapes];
  const svg = createAvatar(shapes, {
    seed,
    backgroundColor: [palette.background],
    shape1Color: shapeColors,
    shape2Color: shapeColors,
    shape3Color: shapeColors,
  }).toString();
  return `${PLACEHOLDER_URI_PREFIX}${Buffer.from(svg).toString('base64')}`;
}
