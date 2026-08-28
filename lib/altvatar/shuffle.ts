import { ALTVATAR_STYLES } from '@/lib/altvatar/registry';
import { offersOf } from '@/lib/altvatar/resolve';
import type {
  AltvatarOptions,
  AltvatarStyle,
  AltvatarValue,
  CanonicalValue,
  EnumAxis,
} from '@/lib/altvatar/types';
import { ALTVATAR_STYLE_IDS } from '@/lib/altvatar/types';

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

// Rolling uniformly over what a style offers would put a hijab or a turban on
// one face in eight, because the hat axis holds eight values and a roll knows
// nothing about what they mean. Religious headwear is not a costume option, so
// these weights land it at roughly the share of people wearing one — about 1
// face in 200 for a hijab, 1 in 400 for a turban. Choosing either from the
// control stays exactly as easy as choosing any other hat; only the dice are
// weighted. Anything unlisted weighs 1.
const ROLL_WEIGHTS: Partial<Record<EnumAxis, Record<string, number>>> = {
  hat: { hijab: 0.03, turban: 0.015 },
};

function pickEnum(
  axis: EnumAxis,
  values: readonly Pick<CanonicalValue, 'value'>[]
): string {
  const weights = ROLL_WEIGHTS[axis];
  if (!weights) return pick(values).value;

  const weightOf = (v: Pick<CanonicalValue, 'value'>) => weights[v.value] ?? 1;
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

// A glyph style answers a different question — a household or a trip, not a
// face — so rolling into one is a category jump rather than a different face.
// It stays one click away in the style chooser; it is only unrolled.
const ROLLABLE = ALTVATAR_STYLE_IDS.filter((id) => !ALTVATAR_STYLES[id].glyph);

export function shuffleStyle(): AltvatarStyle {
  return ALTVATAR_STYLES[pick(ROLLABLE)];
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
    options.selections[offer.axis] =
      offer.kind === 'enum'
        ? pickEnum(offer.axis, offer.values)
        : pick(offer.palette).value;
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
