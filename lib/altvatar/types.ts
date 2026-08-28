export const ALTVATAR_STYLE_IDS = [
  'avataaars',
  'personas',
  'toon-head',
  'icons',
] as const;

export type AltvatarStyleId = (typeof ALTVATAR_STYLE_IDS)[number];

export type EnumAxis =
  | 'hair'
  | 'rearHair'
  | 'hat'
  | 'eyes'
  | 'eyebrows'
  | 'nose'
  | 'mouth'
  | 'glasses'
  | 'facialHair'
  | 'body'
  | 'clothing'
  | 'clothingGraphic'
  | 'glyph';

export type ColorAxis =
  | 'skinColor'
  | 'hairColor'
  | 'facialHairColor'
  | 'hatColor'
  | 'glassesColor'
  | 'clothingColor';

export type CanonicalAxis = EnumAxis | ColorAxis;

// A value every enum axis carrying a native probability toggle can hold, so an
// absent part is a choice like any other rather than a second kind of state.
export const NONE = 'none';

export type CanonicalValue = { value: string; label: string };

// The canonical selections a profile holds, style-independent by construction:
// a value names what the app calls it, never what a drawing library calls it.
export type Selections = Partial<Record<CanonicalAxis, string>>;

export type AltvatarOptions = {
  seed: string;
  selections: Selections;
};

// A whole stored face: the style that drew it and the selections it was drawn
// from. The rendering is not part of it — that is derived, never carried.
export type AltvatarValue = { style: string; options: AltvatarOptions };

export type EnumAxisBinding = {
  native: string;
  // The native `<axis>Probability` key, where the style has one. Its presence
  // is what makes `NONE` selectable for the axis.
  probability?: string;
  // Writes the same native key as an axis before it, and only while it holds a
  // value: avataaars draws hair and headwear through one option, so a hat is
  // painted over the hair rather than beside it, and choosing no hat leaves the
  // hair showing rather than baring the head.
  overlay?: boolean;
  visibleWhen?: AxisGate;
  map: Record<string, string>;
  // A canonical value this style maps, taken when a stored value is one it
  // does not. Unreachable while `map` is empty, since an axis mapping nothing
  // is not offered at all.
  fallback: string;
};

// An axis only applies while another holds — or does not hold — a given value:
// a shirt graphic is drawn on a graphic tee and nothing else, and a beard
// colour means nothing without a beard. Declared per style, because which axes
// depend on which is the style's own business.
export type AxisGate = {
  axis: EnumAxis;
  value: string;
  // Read the condition the other way: visible while the axis is NOT the value.
  negate?: boolean;
};

export type ColorAxisBinding = {
  // One canonical colour may drive several native keys.
  native: string[];
  // Named, because a swatch a viewer cannot name is one they cannot describe,
  // ask for, or find again. The names are this app's, like every other value.
  palette: CanonicalValue[];
  fallback: string;
  // Where an unset value comes from: a beard takes the hair's colour until
  // someone says otherwise, so splitting the control off changes no face that
  // never set one.
  inheritsFrom?: ColorAxis;
  visibleWhen?: AxisGate;
};

// Which panel of the customizer an axis appears in. Grouping is what keeps the
// control count per screen small enough to render every option as art rather
// than as a stepper through names.
export type AxisTab =
  | 'Basics'
  | 'Icon'
  | 'Skin'
  | 'Hair'
  | 'Face'
  | 'Extras'
  | 'Outfit';

export type AltvatarStyle = {
  id: AltvatarStyleId;
  label: string;
  enumAxes: Partial<Record<EnumAxis, EnumAxisBinding>>;
  colorAxes: Partial<Record<ColorAxis, ColorAxisBinding>>;
  // A glyph style draws one flat shape, so the disc paints it from the accent's
  // ink through a CSS mask rather than reading a colour baked into the art.
  glyph?: true;
};
