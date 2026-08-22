import type { CSSProperties } from 'react';

// Presets store a name, not a colour, so re-branding a palette is an edit here
// and every profile holding the name follows. Declaration order is swatch
// order, hand-arranged: sorting by a band's midpoint hue was tried and reads
// worse than the eye does, so the run is authored rather than computed. `ink`
// is measured against `light` and doubles as the selected-swatch ring, so no
// two match.
export const ACCENT_PRESETS = {
  // Red into orange
  spice: { light: '#f0d6b0', dark: '#73431a', ink: '#633710' },
  rosewood: { light: '#e8c9c4', dark: '#6d1f1f', ink: '#5f1717' },
  rose: { light: '#fbcfe8', dark: '#be123c', ink: '#bf012f' },
  cardinal: { light: '#ffeded', dark: '#a30a0a', ink: '#8a0404' },
  coral: { light: '#ffc4a3', dark: '#9f1239', ink: '#ad0433' },
  ember: { light: '#fdba74', dark: '#991b1b', ink: '#a60e0e' },
  lion: { light: '#fac455', dark: '#cc5416', ink: '#8f3208' },
  sunburst: { light: '#fde047', dark: '#db2777', ink: '#900096' },
  joy: { light: '#ffff8c', dark: '#bfa70b', ink: '#7a6803' },

  // Yellow into green
  juniper: { light: '#bcc9a4', dark: '#0f4a26', ink: '#0b3b1d' },
  clover: { light: '#d9f99d', dark: '#15803d', ink: '#097b34' },
  jade: { light: '#B8FFE7', dark: '#116a4c', ink: '#003a27' },
  aspen: { light: '#a1cbd8', dark: '#256551', ink: '#164445' },
  oasis: { light: '#fef08a', dark: '#0e7490', ink: '#3f568c' },

  // Teal into blue
  fathom: { light: '#a9e6cf', dark: '#0541b7', ink: '#0f3a6b' },
  denim: { light: '#c6dcf8', dark: '#0f56b3', ink: '#0b4390' },
  midnight: { light: '#b6c9e4', dark: '#172554', ink: '#101a3f' },
  slate: { light: '#d8e0e9', dark: '#334155', ink: '#29354a' },

  // Violet into pink, closing the wheel back at red
  iris: { light: '#7dd3fc', dark: '#512bc2', ink: '#43199f' },
  blacklight: { light: '#cda2ff', dark: '#05155d', ink: '#2a2060' },
  nebula: { light: '#fca5a5', dark: '#7c3aed', ink: '#4c1d95' },
  orchid: { light: '#c4b5fd', dark: '#be123c', ink: '#0e4d5c' },

  // No hue to sort by, so they close the list
} as const;

export type AccentName = keyof typeof ACCENT_PRESETS;

export const ACCENT_NAMES = Object.keys(ACCENT_PRESETS) as AccentName[];

export function isAccentName(value: string): value is AccentName {
  return Object.hasOwn(ACCENT_PRESETS, value);
}

function presetOf(name: string | null | undefined) {
  return name && isAccentName(name) ? ACCENT_PRESETS[name] : null;
}

// No accent, or a dropped preset, falls back to the brand gradient: reads as
// unset rather than as another accent.
function accentBackground(name: string | null | undefined): string {
  const preset = presetOf(name);
  if (!preset) return 'var(--hero-gradient)';
  return `linear-gradient(120deg, ${preset.light}, ${preset.dark})`;
}

function accentDisc(name: string | null | undefined): string {
  return presetOf(name)?.light ?? 'var(--hero-gradient)';
}

function accentDark(name: string | null | undefined): string {
  return presetOf(name)?.dark ?? 'var(--primary-color)';
}

function accentInk(name: string | null | undefined): string {
  // Brand purple is dark, so its fallback ink is white.
  return presetOf(name)?.ink ?? 'var(--light-color)';
}

// A complete colour on both branches. Appending an alpha to `accentDark` at the
// call site emits `var(--primary-color)55` on the fallback path — invalid CSS,
// so the whole declaration is dropped — and the fallback is the common case
// while `profile_preferences` is still filling up.
function accentShadow(name: string | null | undefined): string {
  const preset = presetOf(name);
  if (!preset)
    return 'color-mix(in srgb, var(--primary-color) 33%, transparent)';
  return `${preset.dark}55`;
}

// Every accent-derived colour at once, as custom properties set on a
// component's root. The stylesheet decides where each one lands, so adding a
// painted element is a rule in profiles.css rather than another inline style
// object in a component.
export function accentVars(name: string | null | undefined): CSSProperties {
  return {
    '--accent-bg': accentBackground(name),
    '--accent-disc': accentDisc(name),
    '--accent-dark': accentDark(name),
    '--accent-ink': accentInk(name),
    '--accent-shadow': accentShadow(name),
  } as CSSProperties;
}

// Unseeded on purpose: a fixed default would land every unedited profile on
// one colour.
export function randomAccentName(): AccentName {
  return ACCENT_NAMES[Math.floor(Math.random() * ACCENT_NAMES.length)];
}
