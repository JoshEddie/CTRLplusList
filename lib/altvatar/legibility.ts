// What the drawing library emits is legible in its own right and not in this
// app's, so the SVG it returns is patched on the single path that also derives
// the art a profile stores. Every rule below matches literal markup, so it
// stops applying rather than misapplying when the library changes it — which
// makes this the file to re-read on every version bump.
//
// A face's features can go dark enough to vanish into a dark skin tone, losing
// its brows, eyes and mouth. None of the shipping styles exposes a feature
// colour to set instead, so the marks are lifted instead — as far as the skin
// behind them makes necessary and no further, which is a different distance
// for every tone and every opacity a mark is drawn at.

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

// Where a lifted mark is headed: the face's own colour with its light turned
// up. A neutral destination is what made corrected faces read wrong — black
// carries no hue of its own, so interpolating it toward any near-white ink
// runs the mark through grey, and grey is the one value a face has nowhere on
// it. Scaling the skin's channels raises its light while holding its hue, so
// a brow lands as a lighter shade of the face rather than as ash on it.
const LIFT_GAIN = 3;

const lightened = (skin: string): string =>
  channels(skin)
    .map((v) => Math.round(Math.min(1, v * LIFT_GAIN) * 255))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');

// What a mark has to clear against the skin behind it. Measured off the ramp
// rather than taken from a standard: every tone from Cocoa up already draws
// its features at 1.88 or better and reads as intended, and Ebony alone sits
// at 1.38, where a face loses them. A bar set high enough to catch the tones
// either side of that line drags them all toward white, which is what made
// corrected faces read as masks rather than as drawings.
const TARGET_CONTRAST = 1.8;

const STEPS = 50;

// The shortest step toward that lightened skin whose mark clears the target once composited
// over this skin at the opacity it is drawn with. Solved against the tone in
// hand rather than ramped toward one shared ink: how far a mark has to travel
// depends on what sits behind it, and a single destination picked to satisfy
// the mid-dark tones sends the dark ones to white.
//
// Zero is returned both for a tone whose features already carry themselves and
// for one no amount of lifting helps. The second is not a failure to correct:
// a mark lifted off a mid-brown face passes through the face's own value on
// the way up, so it fades before it ever separates, and stopping anywhere
// along that arc is worse than the black the library drew.
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

// The library emits one `<g id="<component>-<variant>-…">` per part it draws,
// which is what tells a feature from everything else sharing its ink. Only
// what a face wears on its own skin is corrected: sunglasses are inked like a
// brow and lifting them turns the lenses to cream.
const FACE_PART = /<g id="(?:eyebrows|eyes|mouth|nose)-[^"]*">[\s\S]*?<\/g>/g;

// A part that lays down its own near-white shape — a sclera under an iris,
// teeth inside a mouth — is read against that shape rather than against the
// face, so its marks are legible whatever the skin is and lifting them only
// erases them into their own backing. Near-white and opaque is the tell: a
// tinted lens or a tear sits over the skin, not under the mark.
const BACKING_POINT = 0.75;
const BACKING = /fill="(white|#[0-9A-Fa-f]{6})"(?![^>]*opacity)/g;

const isBacked = (part: string): boolean =>
  [...part.matchAll(BACKING)].some(
    ([, fill]) =>
      fill === 'white' || luminance(fill.slice(1).toLowerCase()) > BACKING_POINT
  );

const onSkin = (svg: string, lift: (part: string) => string): string =>
  svg.replace(FACE_PART, (part) => (isBacked(part) ? part : lift(part)));

// avataaars inks brows, eyes and mouth as `black` at half opacity or more, and
// its modelling as the same black well under that. Lifting both would turn the
// face inside out, so opacity is what tells them apart.
const FEATURE_OPACITY = 0.5;

// personas and toon-head draw every lid and lip in fixed near-black literals —
// fixed, not derived, so they are the same whatever the skin is. They carry the
// library's own uppercase, which no colour this app sets can collide with:
// every hex reaching a style is lowercased at the boundary.
const FIXED_FEATURE_INK: Record<string, string[]> = {
  personas: ['#1B0640'],
  'toon-head': ['#3F2626', '#4B2422'],
};

// How far under the point where a face stops carrying a white wash this skin
// sits. Its own ramp rather than the lift's: the wash is a question about the
// face, not about any one mark on it. Curved because luminance is linear-light
// and crushes the dark end, and eased to nothing at the point rather than
// stepped there, so stepping down the swatch row never jumps.
const WASH_POINT = 0.12;
const WASH_FALLOFF = 3;

// personas washes the whole face in a white overlay. At full strength that
// reads as modelling on a light face and as ash on a dark one — the face stops
// matching the ears and neck under it. Scaled back rather than removed: the
// overlay is also what keeps the nose and ears from going flat.
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
