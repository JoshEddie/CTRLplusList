// Features can go dark enough to vanish into a dark skin tone, and no shipping
// style exposes a feature colour to set instead, so the emitted SVG is patched.
// Every rule below matches literal markup, so it stops applying rather than
// misapplying when the library changes it — re-read this file on version bumps.

import { relativeLuminance } from '@/lib/color';

const channels = (hex: string): number[] =>
  [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const luminance = (hex: string): number => relativeLuminance(channels(hex));

const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

// Also composites: a mark drawn at `alpha` over skin is the same interpolation
// as a mark mixed `alpha` of the way from the skin toward its own colour.
function mix(from: string, to: string, amount: number): string {
  const target = channels(to);
  return channels(from)
    .map((v, i) => Math.round((v + (target[i] - v) * amount) * 255))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

// A lifted mark heads for the skin's own hue at higher light, not a neutral
// ink: interpolating toward near-white runs the mark through grey, and grey is
// a value a face carries nowhere.
const LIFT_GAIN = 3;

const lightened = (skin: string): string =>
  channels(skin)
    .map((v) => Math.round(Math.min(1, v * LIFT_GAIN) * 255))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');

// Measured off the skin ramp, not taken from a standard: Ebony sits at 1.38
// and loses its features, every tone from Cocoa up is already at 1.88. A
// higher bar drags the tones either side of that line toward white.
const TARGET_CONTRAST = 1.8;

const STEPS = 50;

// Zero means leave the mark alone, and covers two cases on purpose: a tone
// whose features already carry themselves, and one no lift helps — off a
// mid-brown face a mark passes through the face's own value on the way up, so
// stopping part-way is worse than the black the library drew.
function liftAmount(ink: string, alpha: number, skin: string): number {
  for (let step = 0; step <= STEPS; step++) {
    const amount = step / STEPS;
    if (
      contrast(mix(skin, mix(ink, lightened(skin), amount), alpha), skin) >=
      TARGET_CONTRAST
    )
      return amount;
  }
  return 0;
}

const MARK =
  /fill="(black|#[0-9A-Fa-f]{6})"(?: (?:fill-)?opacity="([\d.]+)")?/g;

function liftMarks(
  art: string,
  isFeature: (fill: string, alpha: number) => boolean,
  skin: string
): string {
  return art.replace(MARK, (whole, fill: string, opacity?: string) => {
    const alpha = opacity === undefined ? 1 : Number(opacity);
    if (!isFeature(fill, alpha)) return whole;
    const ink = fill === 'black' ? '000000' : fill.slice(1).toLowerCase();
    const amount = liftAmount(ink, alpha, skin);
    return amount === 0
      ? whole
      : whole.replace(
          `fill="${fill}"`,
          `fill="#${mix(ink, lightened(skin), amount)}"`
        );
  });
}

// The library's per-part `<g id>` is what tells a feature from everything else
// sharing its ink: sunglasses are inked like a brow, and lifting them turns
// the lenses to cream.
const FACE_PART = /<g id="(?:eyebrows|eyes|mouth|nose)-[^"]*">[\s\S]*?<\/g>/g;

// A part with its own near-white shape behind it — sclera, teeth — is legible
// whatever the skin is, and lifting only erases the mark into its own backing.
// Opaque is the tell: a tinted lens or a tear sits over the skin, not under it.
const BACKING_POINT = 0.75;
const BACKING = /fill="(white|#[0-9A-Fa-f]{6})"(?![^>]*opacity)/g;

const isBacked = (part: string): boolean =>
  [...part.matchAll(BACKING)].some(
    ([, fill]) =>
      fill === 'white' || luminance(fill.slice(1).toLowerCase()) > BACKING_POINT
  );

const onSkin = (svg: string, lift: (part: string) => string): string =>
  svg.replace(FACE_PART, (part) => (isBacked(part) ? part : lift(part)));

// avataaars inks features as `black` at half opacity or more and its modelling
// as the same black well under that; lifting both turns the face inside out.
const FEATURE_OPACITY = 0.5;

// Fixed near-black literals, the same whatever the skin is. Matched in the
// library's own uppercase, which no app-set colour can collide with — every hex
// reaching a style is lowercased at the boundary.
const FIXED_FEATURE_INK: Record<string, string[]> = {
  personas: ['#1B0640'],
  'toon-head': ['#3F2626', '#4B2422'],
};

// Its own ramp rather than the lift's: the wash is a question about the face,
// not about any one mark on it. Curved because luminance is linear-light and
// crushes the dark end, and eased to nothing so the swatch row never jumps.
const WASH_POINT = 0.12;
const WASH_FALLOFF = 3;

// personas' white overlay reads as modelling on a light face and as ash on a
// dark one. Scaled back rather than removed: it is also what keeps the nose and
// ears from going flat.
function calmPersonas(svg: string, skin: string): string {
  const wash = Math.max(0, 1 - (luminance(skin) / WASH_POINT) ** WASH_FALLOFF);
  if (wash === 0) return svg;
  return svg.replace(/<[^>]*>/g, (tag) =>
    tag.includes('mix-blend-mode:overlay') && tag.includes('fill="white"')
      ? tag.replace(
          /opacity="\.(\d+)"/,
          (whole, digits: string) =>
            `opacity="${(Number(`0.${digits}`) * (1 - 0.75 * wash)).toFixed(3)}"`
        )
      : tag
  );
}

export function liftFeatures(
  svg: string,
  styleId: string,
  skin: string | undefined
): string {
  if (!skin) return svg;

  if (styleId === 'avataaars')
    return onSkin(svg, (part) =>
      liftMarks(
        part,
        (fill, alpha) => fill === 'black' && alpha >= FEATURE_OPACITY,
        skin
      )
    );

  const inks = FIXED_FEATURE_INK[styleId];
  if (!inks) return svg;
  const lifted = onSkin(svg, (part) =>
    liftMarks(part, (fill) => inks.includes(fill), skin)
  );
  return styleId === 'personas' ? calmPersonas(lifted, skin) : lifted;
}
