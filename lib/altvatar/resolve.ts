import { AXIS_ORDER, COLOR_AXES, ENUM_AXES } from '@/lib/altvatar/vocabulary';
import type {
  AltvatarStyle,
  AxisGate,
  EnumAxisBinding,
  CanonicalValue,
  ColorAxis,
  EnumAxis,
  Selections,
} from '@/lib/altvatar/types';
import { NONE } from '@/lib/altvatar/types';

// A component is chosen through `<component>Variant`, which takes an array-typed
// *pool* the seed then picks from, so a pinned choice is `eyesVariant: ['wink']`
// and never `eyesVariant: 'wink'`. The second control kind is
// `<component>Probability`, an integer 0–100, which is how an absent part is
// expressed — `facialHairProbability: 0` is "no beard". A binding's `native` is
// the component's own name, without either suffix, because it names the part
// rather than one of the controls over it.

function gateOpen(gate: AxisGate | undefined, selections: Selections): boolean {
  if (!gate) return true;
  const matches = selections[gate.axis] === gate.value;
  return gate.negate ? !matches : matches;
}

export type AxisOffer =
  | {
      axis: EnumAxis;
      kind: 'enum';
      values: { value: string; label: string }[];
      // What this style takes for the axis when nothing is stored for it at
      // all. Carried on the offer rather than looked back up on the style, so
      // resolution reads the binding the offer was built from and the compiler
      // can see that it exists.
      fallback: string;
    }
  | { axis: ColorAxis; kind: 'color'; palette: CanonicalValue[] };

// What a style offers is the intersection of the whitelist and what it maps: a
// canonical value this style carries no row for is not offered while it is
// selected. An axis whose map is empty offers nothing and renders no control,
// which is what lets the mapping table land incomplete without breaking.
// `selections` narrows the result to what a viewer should actually see: an
// axis that only applies while another holds a given value is dropped when it
// does not. Omit it — as shuffle does — to get every axis the style has, so a
// re-roll still chooses a value for a dependent axis that is not showing yet.
export function offersOf(
  style: AltvatarStyle,
  selections?: Selections
): AxisOffer[] {
  const offers: AxisOffer[] = [];
  for (const [key, binding] of Object.entries(style.enumAxes)) {
    const axis = key as EnumAxis;
    if (selections && !gateOpen(binding.visibleWhen, selections)) continue;
    // An axis mapping nothing is not offered: `NONE` on its own is not a
    // choice, and forcing an absent part would be worse than leaving the axis
    // to the style's own default pool.
    if (Object.keys(binding.map).length === 0) continue;
    const values = ENUM_AXES[axis].values.filter(
      (v) =>
        Object.hasOwn(binding.map, v.value) ||
        (v.value === NONE &&
          (binding.probability !== undefined || binding.overlay === true))
    );
    if (values.length > 0)
      offers.push({ axis, kind: 'enum', values, fallback: binding.fallback });
  }
  for (const [key, binding] of Object.entries(style.colorAxes)) {
    if (selections && !gateOpen(binding.visibleWhen, selections)) continue;
    offers.push({
      axis: key as ColorAxis,
      kind: 'color',
      palette: binding.palette,
    });
  }
  // Presented in the vocabulary's authored order rather than in whichever order
  // the style module declared its bindings, so a colour never lands away from
  // the part it colours.
  return offers.sort(
    (a, b) => AXIS_ORDER.indexOf(a.axis) - AXIS_ORDER.indexOf(b.axis)
  );
}

// Selecting a style walks every axis:
//
// - an axis the style lacks renders no control and keeps its stored value;
// - an axis the style has and can map renders that value unchanged;
// - an axis the style has but cannot map keeps its stored value too — the
//   style draws nothing for it, and no control reads as chosen.
//
// Nothing a style change touches is overwritten. A style with no close
// equivalent for what a viewer chose has no business substituting one: a hat
// that becomes the only hat the next style draws is a hat nobody picked, and
// switching back would carry the substitute home rather than the original.
// Only choosing a value replaces one. Colour axes carry verbatim wherever the
// target style has the axis at all, since a hex means the same thing in every
// style.
export function resolveSelections(
  style: AltvatarStyle,
  selections: Selections
): Selections {
  const resolved: Selections = { ...selections };
  // Colour axes are walked off the style rather than off what it offers: a gate
  // hides a control, it does not unset the colour behind it.
  for (const [key, binding] of Object.entries(style.colorAxes)) {
    const axis = key as ColorAxis;
    resolved[axis] = colorOf(binding, axis, selections);
  }
  // A stored value stands whether or not this style can draw it; only an axis
  // holding nothing at all takes the style's default, so a control the viewer
  // has never touched still starts on something.
  for (const offer of offersOf(style)) {
    if (offer.kind !== 'enum') continue;
    resolved[offer.axis] = selections[offer.axis] ?? offer.fallback;
  }
  return resolved;
}

// Two canonical axes can share one native option — avataaars draws hair and
// headwear through `top`, personas draws eyes and glasses through `eyes` — and
// the overlay is written second, so it wins. A grid of tiles for the axis
// underneath would then draw the same face for every value it offers, which is
// a control nobody can use. Lifting the overlay off those tiles is what keeps a
// hairstyle choosable while a hat is on. Only the tiles are drawn that way: the
// face itself keeps the hat, because that is what the art does.
export function withoutOverlaysOver(
  style: AltvatarStyle,
  axis: EnumAxis,
  selections: Selections
): Selections {
  const binding = style.enumAxes[axis];
  if (!binding || binding.overlay) return selections;

  const lifted: Selections = { ...selections };
  for (const [key, other] of Object.entries(style.enumAxes)) {
    if (other.overlay && other.native === binding.native)
      lifted[key as EnumAxis] = NONE;
  }
  return lifted;
}

function colorOf(
  binding: { fallback: string; inheritsFrom?: ColorAxis },
  axis: ColorAxis,
  selections: Selections
): string {
  return (
    selections[axis] ??
    (binding.inheritsFrom ? selections[binding.inheritsFrom] : undefined) ??
    binding.fallback
  );
}

// Canonical selections plus a style become the native option object the drawing
// library takes. Pure: nothing here imports the library.
export function toNativeOptions(
  style: AltvatarStyle,
  selections: Selections
): Record<string, unknown> {
  // No art carries a background of its own — the accent's light stop, painted
  // by the avatar slot, is the colour behind every Altvatar. Spelled as a
  // fully-transparent eight-digit hex rather than the `transparent` keyword,
  // which the library's option schema rejects. It cannot be dropped instead:
  // left unset, a style paints a background from its own palette, and an
  // opaque square behind a glyph is what the disc's mask would then show.
  const options: Record<string, unknown> = {
    backgroundColor: ['00000000'],
  };

  // Written in the vocabulary's order rather than the style module's, so an
  // overlay always lands after the axis it paints over.
  const enumAxes = Object.entries(style.enumAxes).sort(
    ([a], [b]) =>
      AXIS_ORDER.indexOf(a as EnumAxis) - AXIS_ORDER.indexOf(b as EnumAxis)
  );
  for (const [key, binding] of enumAxes) {
    writeEnumAxis(options, binding, selections[key as EnumAxis]);
  }

  for (const [key, binding] of Object.entries(style.colorAxes)) {
    const value = colorOf(binding, key as ColorAxis, selections);
    for (const native of binding.native) options[native] = [value];
  }

  return options;
}

function writeEnumAxis(
  options: Record<string, unknown>,
  binding: EnumAxisBinding,
  value: string | undefined
): void {
  // An axis this style maps nothing for is left out entirely, so its own
  // default pool and the seed govern it rather than an invented value.
  if (value === undefined || Object.keys(binding.map).length === 0) return;

  const native = value === NONE ? undefined : binding.map[value];
  if (native !== undefined) {
    options[`${binding.native}Variant`] = [native];
    if (binding.probability) options[binding.probability] = 100;
    return;
  }

  // Nothing this style draws answers to that value — it is either `NONE` or a
  // value only some other style carries. Both are absences here, and an
  // absence is drawn as one wherever the style can express it: an overlay
  // contributes nothing, leaving whatever it paints over intact, and an axis
  // with a probability toggle turns off. An axis that cannot be absent — every
  // face has eyes — takes the style's own default. Storage is untouched either
  // way, so the value returns the moment the viewer picks a style that draws
  // it.
  if (binding.overlay) return;
  if (binding.probability) {
    options[binding.probability] = 0;
    return;
  }
  const fallback = binding.map[binding.fallback];
  if (fallback !== undefined) options[`${binding.native}Variant`] = [fallback];
}

// The whitelist, enforced where a selection crosses a trust boundary. A value
// the vocabulary does not name cannot be produced by any control, so one
// arriving in a payload was not chosen — it is dropped rather than stored,
// which is what keeps a library-native name out of storage for good.
export function sanitizeSelections(
  selections: Record<string, unknown>
): Selections {
  const clean: Selections = {};
  for (const [axis, value] of Object.entries(selections)) {
    if (typeof value !== 'string') continue;
    if (Object.hasOwn(COLOR_AXES, axis)) {
      if (/^[0-9a-f]{6}$/i.test(value))
        clean[axis as ColorAxis] = value.toLowerCase();
      continue;
    }
    if (!Object.hasOwn(ENUM_AXES, axis)) continue;
    const named = ENUM_AXES[axis as EnumAxis].values.some(
      (v) => v.value === value
    );
    if (named) clean[axis as EnumAxis] = value;
  }
  return clean;
}
