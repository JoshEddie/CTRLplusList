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
