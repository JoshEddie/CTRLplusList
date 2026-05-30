import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compositeOver,
  contrastRatio,
  relativeLuminance,
} from '@/test/helpers/contrast';

/** Drop `/* … *​/` comments so they can't break declaration-boundary parsing. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const globalCss = stripComments(
  readFileSync(resolve(process.cwd(), 'app/ui/styles/global.css'), 'utf8')
);
const listCss = stripComments(
  readFileSync(
    resolve(process.cwd(), 'app/(main)/lists/ui/styles/list.css'),
    'utf8'
  )
);

const AA_NORMAL = 4.5;
const AA_LARGE = 3;

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Value of a `--custom-property` declaration. Throws a named error on miss. */
function customProperty(css: string, name: string): string {
  const match = new RegExp(`--${escapeForRegex(name)}\\s*:\\s*([^;]+);`).exec(
    css
  );
  if (!match) {
    throw new Error(`Could not find --${name} in CSS`);
  }
  return match[1].trim();
}

/** First `{ … }` block for a selector that declares `property`. Named error on miss. */
function declaration(css: string, selector: string, property: string): string {
  const blocks = new RegExp(
    `${escapeForRegex(selector)}\\s*\\{([^}]*)\\}`,
    'g'
  );
  const propRe = new RegExp(`(?:^|;)\\s*${escapeForRegex(property)}\\s*:\\s*([^;]+)`);
  let block: RegExpExecArray | null;
  while ((block = blocks.exec(css)) !== null) {
    const found = propRe.exec(block[1]);
    if (found) return found[1].trim();
  }
  throw new Error(`Could not find "${property}" under "${selector}" in CSS`);
}

/** Resolve `var(--x)` against the global custom properties; pass through otherwise. */
function resolveColor(value: string): string {
  const varMatch = /^var\(\s*--([\w-]+)\s*\)$/.exec(value);
  return varMatch ? customProperty(globalCss, varMatch[1]) : value;
}

function gradientStops(css: string): string[] {
  const gradient = customProperty(css, 'hero-gradient');
  const stops = gradient.match(/#[0-9a-fA-F]{6}/g);
  if (!stops || stops.length < 2) {
    throw new Error(`Could not find two gradient stops in --hero-gradient`);
  }
  return stops;
}

const STOPS = gradientStops(globalCss);
// The lighter stop is the worst case for light-on-dark text per spec R8.
const lightestStop = [...STOPS].sort(
  (a, b) => relativeLuminance(b) - relativeLuminance(a)
)[0];

/** Text contrast against the lightest gradient stop, compositing translucency. */
function ratioOverWorstCase(textColor: string, fill?: string): number {
  const background = fill
    ? compositeOver(fill, lightestStop)
    : lightestStop;
  const composited = compositeOver(textColor, background);
  return contrastRatio(composited, background);
}

describe('heroContrast', () => {
  describe('TokenExtraction', () => {
    it('Gradient_ExtractsBothStops', () => {
      expect(STOPS).toEqual(['#4a35c5', '#7855f0']);
    });

    it('LightColor_ResolvesToWhite', () => {
      expect(customProperty(globalCss, 'light-color').toLowerCase()).toBe(
        '#ffffff'
      );
    });

    it('MissingCustomProperty_ThrowsNamedError', () => {
      expect(() => customProperty(globalCss, 'not-a-real-token')).toThrow(
        /Could not find --not-a-real-token/
      );
    });

    it('MissingSelector_ThrowsNamedError', () => {
      expect(() => declaration(listCss, '.no-such-selector', 'color')).toThrow(
        /Could not find "color" under "\.no-such-selector"/
      );
    });
  });

  describe('WorstCasePixel', () => {
    // Light text loses contrast as the background lightens, so the lighter
    // gradient stop is the worst case to evaluate against.
    it('LighterStop_HasHigherLuminanceThanDarkerStop', () => {
      expect(relativeLuminance('#7855f0')).toBeGreaterThan(
        relativeLuminance('#4a35c5')
      );
      expect(lightestStop).toBe('#7855f0');
    });
  });

  describe('TextRolesAgainstWorstCaseStop', () => {
    it('Title_MeetsLargeTextAA', () => {
      const color = resolveColor(declaration(listCss, '.list-hero-title', 'color'));
      expect(ratioOverWorstCase(color)).toBeGreaterThanOrEqual(AA_LARGE);
    });

    it('Subtitle_MeetsNormalTextAA', () => {
      const color = resolveColor(
        declaration(listCss, '.list-hero-subtitle', 'color')
      );
      expect(ratioOverWorstCase(color)).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it('Footer_MeetsNormalTextAA', () => {
      const color = resolveColor(
        declaration(listCss, '.list-hero-identity-foot', 'color')
      );
      expect(ratioOverWorstCase(color)).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it('Eyebrow_MeetsNormalTextAA', () => {
      const color = resolveColor(
        declaration(listCss, '.list-hero-eyebrow', 'color')
      );
      const fill = resolveColor(
        declaration(listCss, '.list-hero-eyebrow', 'background-color')
      );
      expect(ratioOverWorstCase(color, fill)).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  });
});
