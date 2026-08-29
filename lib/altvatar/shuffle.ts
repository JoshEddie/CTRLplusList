import { ALTVATAR_STYLES, PERSON_STYLE_IDS } from '@/lib/altvatar/registry';
import { offersOf } from '@/lib/altvatar/resolve';
import type {
  AltvatarOptions,
  AltvatarStyle,
  AltvatarValue,
  CanonicalAxis,
  CanonicalValue,
} from '@/lib/altvatar/types';
import { NONE } from '@/lib/altvatar/types';

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

// Rarity within an axis: a value listed here is that many times as likely as one
// that is not, and anything unlisted weighs 1. For a rate rather than a
// relationship, use `TARGET_SHARES` — a weight here moves with the size of
// whatever share its axis lands in.
const ROLL_WEIGHTS: Partial<Record<CanonicalAxis, Record<string, number>>> = {
  glasses: { eyepatch: 0.03 },
  body: { small: 0.01 }
};

// Not naturalistic. Pastel Pink ships inside the naturals ramp but belongs here.
const DYES = ['3b6fd4', '2aa198', '3eac2c', '7b3fb5', 'e0459b', 'f59797'];

// Only `personas` maps these, so they cluster on one style unless held down.
const SHORN = ['bald', 'balding', 'buzzcut', 'fade'];

// Shaded lenses, which are a look rather than eyesight — unlike the clear
// frames they share an axis with.
const SHADED = ['kurt', 'sunglasses', 'wayfarers'];

// What share of faces a group of values should account for, written as the
// probability itself rather than as a weight. Solved against whatever the style
// actually offers, so a style carrying fewer options still lands on the share —
// a flat weight cannot, because it is only ever relative to the size of the
// pool it competes in, and that pool differs per style. A group a style does not
// offer does not apply, and the values outside the group keep their relative
// weights to each other.
const TARGET_SHARES: {
  axis: CanonicalAxis;
  values: readonly string[];
  share: number;
}[] = [
  { axis: 'hat', values: [NONE], share: 0.75 },
  // Religious headwear is not a costume option, so it sits near the share of
  // people who actually wear one rather than competing with the beanies. A
  // share and not a weight for exactly that reason: as a weight it moved with
  // the hat rate, so retuning hats silently retuned this too. Choosing either
  // from the control stays as easy as choosing any other hat.
  { axis: 'hat', values: ['hijab'], share: 0.05 },
  { axis: 'hat', values: ['turban'], share: 0.05 },
  { axis: 'facialHair', values: [NONE], share: 0.70 },
  { axis: 'glasses', values: [NONE], share: 0.60 },
  { axis: 'glasses', values: SHADED, share: 0.05 },
  { axis: 'hair', values: SHORN, share: 0.08 },
  { axis: 'hairColor', values: DYES, share: 0.05 },
  { axis: 'facialHairColor', values: DYES, share: 0.05 },
];

function weightsFor(
  axis: CanonicalAxis,
  values: readonly Pick<CanonicalValue, 'value'>[]
): Map<string, number> {
  const base = ROLL_WEIGHTS[axis] ?? {};
  const weights = new Map(values.map((v) => [v.value, base[v.value] ?? 1]));

  // Every group the style actually offers takes its share outright; whatever
  // share is left over is split across the ungrouped values in proportion to
  // the weights above. Solving the groups together rather than one after
  // another is what lets an axis carry more than one of them — a sequential
  // solve moves the total each time, so each group drifts the ones before it.
  const groups = TARGET_SHARES.filter((t) => t.axis === axis)
    .map((t) => ({ ...t, values: t.values.filter((v) => weights.has(v)) }))
    .filter((t) => t.values.length > 0);
  if (groups.length === 0) return weights;

  const grouped = new Set(groups.flatMap((g) => g.values));
  const ungrouped = [...weights.keys()].filter((v) => !grouped.has(v));
  const claimed = groups.reduce((sum, g) => sum + g.share, 0);

  let rest = 0;
  for (const v of ungrouped) rest += weights.get(v)!;
  for (const v of ungrouped) {
    weights.set(v, ((1 - claimed) * weights.get(v)!) / rest);
  }
  for (const group of groups) {
    let within = 0;
    for (const v of group.values) within += weights.get(v)!;
    for (const v of group.values) {
      weights.set(v, (group.share * weights.get(v)!) / within);
    }
  }
  return weights;
}

function pickWeighted(
  axis: CanonicalAxis,
  values: readonly Pick<CanonicalValue, 'value'>[]
): string {
  const weights = weightsFor(axis, values);
  const weightOf = (v: Pick<CanonicalValue, 'value'>) => weights.get(v.value)!;
  const total = values.reduce((sum, v) => sum + weightOf(v), 0);
  let roll = Math.random() * total;
  // Seeded with the last value, so a roll landing on the very top of the range
  // through floating-point rounding still resolves to something.
  let chosen = values[values.length - 1];
  for (const v of values) {
    roll -= weightOf(v);
    if (roll < 0) {
      chosen = v;
      break;
    }
  }
  return chosen.value;
}

// A roll never crosses the kind boundary: a thing answers a different
// question — a household or a trip, not a face — so landing on one is a
// category jump rather than a different face. Things are chosen, never rolled.
export function shuffleStyle(): AltvatarStyle {
  return ALTVATAR_STYLES[pick(PERSON_STYLE_IDS)];
}

// Every curated axis is re-rolled at once, along with the seed that governs the
// axes nobody curated. There is no pinned/unpinned state to respect: every
// offered axis always holds an explicit value, so nothing has to be unselected.
export function shuffleAltvatar(style: AltvatarStyle): AltvatarOptions {
  const options: AltvatarOptions = {
    seed: Math.random().toString(36).slice(2),
    selections: {},
  };
  for (const offer of offersOf(style)) {
    const pool = offer.kind === 'enum' ? offer.values : offer.palette;
    options.selections[offer.axis] = pickWeighted(offer.axis, pool);
  }
  return options;
}

// A whole face, style included. Rolled by the surface that renders the host — a
// roll taken inside a client component would differ between the server's render
// and the browser's. The style is rolled with the rest: opening every profile
// without art on one style would make that style the first face everyone meets.
export function rollAltvatar(): AltvatarValue {
  const style = shuffleStyle();
  return { style: style.id, options: shuffleAltvatar(style) };
}
