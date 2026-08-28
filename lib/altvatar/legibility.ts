// What the drawing library emits is legible in its own right and not in this
// app's, so the SVG it returns is patched on the single path that also derives
// the art a profile stores. Every rule below matches literal markup, so it
// stops applying rather than misapplying when the library changes it — which
// makes this the file to re-read on every version bump.
//
// A face's features can go dark enough to vanish into a dark skin tone, losing
// its brows, eyes and mouth. None of the shipping styles exposes a feature
// colour to set instead, so the marks are lifted instead. Two kinds of style,
// so two rules. Each targets what that style actually emits, and each fades out
// as the skin lightens rather than switching at a threshold, so stepping down
// the swatch row never jumps.

import { relativeLuminance } from '@/lib/color';

const channels = (hex: string): number[] =>
  [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const luminance = (hex: string): number => relativeLuminance(channels(hex));

function mix(from: string, to: string, amount: number): string {
  const target = channels(to);
  return channels(from)
    .map((v, i) => Math.round((v + (target[i] - v) * amount) * 255))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

// Where a face stops carrying its own features. Nothing above it is touched,
// and the correction grows the further under it the skin sits.
const DARK_POINT = 0.12;

// Luminance is linear-light, so it crushes the dark end: two tones that read as
// equally dark sit at a fraction of each other's value, and a correction linear
// in luminance under-lifts everything but the very darkest. Curved instead, so
// the lift is near-full across the dark band and still eases to nothing at the
// dark point rather than stepping there.
const FALLOFF = 3;

// Warm rather than white: a paper-coloured mark on a dark face reads as drawn,
// where a pure white one reads as a hole.
const LIFTED_INK = 'f7ece4';

// avataaars inks brows, eyes and mouth as `black` at .5 opacity or more, and
// its modelling as the same black at a fifth of that. Lifting both would turn
// the face inside out, so opacity is what tells them apart.
function liftAvataaars(svg: string, strength: number): string {
  return svg.replace(
    /fill="black" fill-opacity="\.(\d+)"/g,
    (whole, digits: string) =>
      Number(`0.${digits}`) >= 0.5
        ? `fill="#${mix('000000', LIFTED_INK, strength)}" fill-opacity=".${digits}"`
        : whole
  );
}

// personas and toon-head draw every lid and lip in fixed near-black literals —
// fixed, not derived, so they are the same whatever the skin is. They carry the
// library's own uppercase, which no colour this app sets can collide with:
// every hex reaching a style is lowercased at the boundary.
const FIXED_FEATURE_INK: Record<string, string[]> = {
  personas: ['#1B0640'],
  'toon-head': ['#3F2626', '#4B2422'],
};

function liftFixedInk(svg: string, inks: string[], strength: number): string {
  return inks.reduce(
    (out, ink) =>
      out.replaceAll(ink, `#${mix(ink.slice(1), LIFTED_INK, strength)}`),
    svg
  );
}

// personas also washes the whole face in a white overlay. At full strength that
// reads as modelling on a light face and as ash on a dark one — the face stops
// matching the ears and neck under it. Scaled back rather than removed: the
// overlay is also what keeps the nose and ears from going flat.
function calmPersonas(svg: string, strength: number): string {
  return svg.replace(/<[^>]*>/g, (tag) =>
    tag.includes('mix-blend-mode:overlay') && tag.includes('fill="white"')
      ? tag.replace(
          /opacity="\.(\d+)"/,
          (whole, digits: string) =>
            `opacity="${(Number(`0.${digits}`) * (1 - 0.75 * strength)).toFixed(3)}"`
        )
      : tag
  );
}

export function liftFeatures(
  svg: string,
  styleId: string,
  skin: string | undefined
): string {
  const strength = skin
    ? Math.max(0, 1 - (luminance(skin) / DARK_POINT) ** FALLOFF)
    : 0;
  if (strength === 0) return svg;

  if (styleId === 'avataaars') return liftAvataaars(svg, strength);
  const inks = FIXED_FEATURE_INK[styleId];
  if (!inks) return svg;
  const lifted = liftFixedInk(svg, inks, strength);
  return styleId === 'personas' ? calmPersonas(lifted, strength) : lifted;
}

// A glyph style is painted by the disc through a CSS mask, which reads the
// art's alpha and nothing else. The library stacks two copies of the glyph — a
// blended one, which contributes nothing over the transparent background this
// app asks for, and one at four-tenths opacity. Left alone the mask would
// carry that four-tenths through and paint the accent's ink at a fraction of
// itself, so the surviving copy is restored to full alpha.
export function flattenGlyph(svg: string): string {
  return svg.replace(' opacity=".4"', '');
}
