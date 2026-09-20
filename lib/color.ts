// WCAG 2.x sRGB relative luminance: linearize each channel, then weight.
// Channels are 0–1.
//
// Production rather than a test helper because the legibility ramp derives
// from it: a copy living beside the tests lets the ramp and the assertions
// that check it drift apart while both keep passing.
export function relativeLuminance([r, g, b]: number[]): number {
  const linear = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
