import type { CSSProperties } from 'react';

// Presets store a name, not a colour, so re-branding a palette is an edit here
// and every profile holding the name follows. Declaration order is swatch
// order, hand-arranged: sorting by a band's midpoint hue was tried and reads
// worse than the eye does, so the run is authored rather than computed. `ink`
// is measured against `light` and doubles as the selected-swatch ring, so no
// two match.
export const ACCENT_PRESETS = {
  // Red into orange
  spice: { light: '#f0d6b0', dark: '#73431a', ink: '#62360e' },
  rosewood: { light: '#e8c9c4', dark: '#6d1f1f', ink: '#5d1516' },
  rose: { light: '#fbcfe8', dark: '#be123c', ink: '#b3042c' },
  cardinal: { light: '#ffeded', dark: '#a30a0a', ink: '#820102' },
  coral: { light: '#ffc4a3', dark: '#9f1239', ink: '#ad0433' },
  ember: { light: '#fdba74', dark: '#991b1b', ink: '#a60e0e' },
  lion: { light: '#fac455', dark: '#cc5416', ink: '#832a00' },
  sunburst: { light: '#fde047', dark: '#db2777', ink: '#7c0081' },
  joy: { light: '#ffff8c', dark: '#bfa70b', ink: '#005293' },

  // Yellow into green
  juniper: { light: '#bcc9a4', dark: '#0f4a26', ink: '#07381a' },
  clover: { light: '#d9f99d', dark: '#15803d', ink: '#006728' },
  jade: { light: '#B8FFE7', dark: '#116a4c', ink: '#003a27' },
  aspen: { light: '#a1cbd8', dark: '#256551', ink: '#0c3c3d' },
  oasis: { light: '#fef08a', dark: '#0e7490', ink: '#3a5187' },

  // Teal into blue
  fathom: { light: '#a9e6cf', dark: '#0541b7', ink: '#033060' },
  denim: { light: '#c6dcf8', dark: '#0f56b3', ink: '#00367f' },
  midnight: { light: '#b6c9e4', dark: '#172554', ink: '#101a3f' },
  slate: { light: '#d8e0e9', dark: '#334155', ink: '#002976' },

  // Violet into pink, closing the wheel back at red
  iris: { light: '#7dd3fc', dark: '#512bc2', ink: '#3f1099' },
  blacklight: { light: '#a98dff', dark: '#180770', ink: '#14065C' },
  nebula: { light: '#fca5a5', dark: '#7c3aed', ink: '#46138d' },
  orchid: { light: '#c4b5fd', dark: '#be123c', ink: '#003f4d' },

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

// No accent, or a dropped preset, falls back to the `iris` preset: one
// fallback rule with one answer across all five derivations, so an accent-less
// surface paints a complete accent rather than a half-brand hybrid.
const FALLBACK_ACCENT = ACCENT_PRESETS.iris;

function accentBackground(name: string | null | undefined): string {
  const preset = presetOf(name) ?? FALLBACK_ACCENT;
  return `linear-gradient(120deg, ${preset.light}, ${preset.dark})`;
}

function accentDisc(name: string | null | undefined): string {
  return presetOf(name)?.light ?? FALLBACK_ACCENT.light;
}

function accentDark(name: string | null | undefined): string {
  return presetOf(name)?.dark ?? FALLBACK_ACCENT.dark;
}

function accentInk(name: string | null | undefined): string {
  return presetOf(name)?.ink ?? FALLBACK_ACCENT.ink;
}

function accentShadow(name: string | null | undefined): string {
  return `${presetOf(name)?.dark ?? FALLBACK_ACCENT.dark}55`;
}

// Every accent-derived colour at once, as custom properties set on a
// component's root. The stylesheet decides where each one lands, so adding a
// painted element is a rule in altvatar-space.css rather than another inline style
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
