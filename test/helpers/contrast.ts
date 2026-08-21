/**
 * WCAG 2.x sRGB contrast utilities — a browserless engine for asserting that
 * text colors clear their AA contrast thresholds against a background.
 *
 * Shared per `testing-foundation` ("shared helpers under `test/helpers/`").
 * Consumed by `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts`.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

/**
 * Parse a CSS color string into channels + alpha. Supports `#rgb`, `#rrggbb`
 * (case-insensitive) and `rgb(...)` / `rgba(...)`. Throws on anything else so
 * a malformed token fails loudly rather than silently scoring 0 contrast.
 */
export function parseColor(input: string): Rgba {
  const str = input.trim();

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(str);
  if (hexMatch) {
    const hex = hexMatch[1];
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgbMatch =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
      str
    );
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
      a: rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]),
    };
  }

  throw new Error(`Unparseable color: ${JSON.stringify(input)}`);
}

function toRgba(color: string | Rgba): Rgba {
  return typeof color === 'string' ? parseColor(color) : color;
}

/**
 * Composite a (possibly translucent) foreground over an opaque background:
 * `c = α·fg + (1−α)·bg` per channel. Returns an opaque color.
 */
export function compositeOver(
  fg: string | Rgba,
  background: string | Rgba
): Rgba {
  const f = toRgba(fg);
  const bg = toRgba(background);
  const blend = (fc: number, bc: number) => f.a * fc + (1 - f.a) * bc;
  return {
    r: blend(f.r, bg.r),
    g: blend(f.g, bg.g),
    b: blend(f.b, bg.b),
    a: 1,
  };
}

/** sRGB relative luminance (WCAG): linearize each channel, then weight. */
export function relativeLuminance(color: string | Rgba): number {
  const { r, g, b } = toRgba(color);
  const channel = (value: number) => {
    const cs = value / 255;
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG contrast ratio `(Llighter + 0.05) / (Ldarker + 0.05)`. Both colors are
 * treated as opaque; composite translucent inputs with `compositeOver` first.
 */
export function contrastRatio(fg: string | Rgba, bg: string | Rgba): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** A colour as the DOM serializes it in a style attribute, for containment
 *  assertions that must not depend on the authored notation. */
export function cssRgb(color: string): string {
  const { r, g, b } = parseColor(color);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const LINEAR_RGB_TO_LMS = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const LMS_TO_OKLAB = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];

/** A colour in OKLab, the space every perceptual measure below is taken in. */
function oklab(color: string | Rgba): { l: number; a: number; b: number } {
  const { r, g, b } = toRgba(color);
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const rgb = [toLinear(r), toLinear(g), toLinear(b)];
  const lms = LINEAR_RGB_TO_LMS.map((row) =>
    Math.cbrt(row.reduce((sum, m, i) => sum + m * rgb[i], 0))
  );
  const [l, la, lb] = LMS_TO_OKLAB.map((row) =>
    row.reduce((sum, m, i) => sum + m * lms[i], 0)
  );
  return { l, a: la, b: lb };
}

/** Degrees of OKLCH hue between two colours, the short way round. */
export function hueTravel(a: string, b: string): number {
  const hueOf = (color: string) => {
    const { a: la, b: lb } = oklab(color);
    return ((Math.atan2(lb, la) * 180) / Math.PI + 360) % 360;
  };
  const diff = Math.abs(hueOf(a) - hueOf(b));
  return Math.min(diff, 360 - diff);
}

/**
 * Straight-line OKLab distance — how far apart two colours look, counting
 * lightness, hue and chroma together. Where `hueTravel` reads a pair that
 * separates only in lightness as standing still, this does not.
 */
export function perceptualDistance(a: string, b: string): number {
  const x = oklab(a);
  const y = oklab(b);
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

/**
 * How much of its endpoints' chroma a gradient keeps at its midpoint, where
 * a value near 1 means the band stays saturated all the way across and a low
 * one means it greys out in the middle — the signature of a gradient between
 * exact complements.
 */
export function midpointChromaRatio(a: string, b: string): number {
  const ca = parseColor(a);
  const cb = parseColor(b);
  const mid = {
    r: (ca.r + cb.r) / 2,
    g: (ca.g + cb.g) / 2,
    b: (ca.b + cb.b) / 2,
    a: 1,
  };
  const chroma = (color: Rgba) => {
    const { a: la, b: lb } = oklab(color);
    return Math.hypot(la, lb);
  };
  return chroma(mid) / ((chroma(ca) + chroma(cb)) / 2);
}
