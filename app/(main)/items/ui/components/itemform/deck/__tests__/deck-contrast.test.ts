import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/test/helpers/contrast';

// The deck consumes the consolidated global state palette (success/warn/
// danger) plus the shared tokens (buy-link, primary, muted, heading, …) —
// all resolved from global.css.
const css = readFileSync(
  resolve(process.cwd(), 'app/ui/styles/global.css'),
  'utf8'
).replace(/\/\*[\s\S]*?\*\//g, '');

function rawToken(name: string): string {
  const m = new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(css);
  if (!m) throw new Error(`Missing --${name}`);
  return m[1].trim();
}

// Resolve a token through any var(--x) chain to a literal color.
function token(name: string): string {
  let value = rawToken(name);
  for (let guard = 0; value.startsWith('var('); guard++) {
    const inner = /^var\(\s*--([\w-]+)\s*\)$/.exec(value);
    if (!inner) throw new Error(`Unresolvable token value: ${value}`);
    value = rawToken(inner[1]);
    if (guard > 10) throw new Error('var() cycle');
  }
  return value;
}

const AA_NORMAL = 4.5;
const WHITE = '#ffffff';

describe('deckContrast', () => {
  function meetsAA(fg: string, bg: string): number {
    return contrastRatio(token(fg), bg.startsWith('#') ? bg : token(bg));
  }

  describe('TierNoteOnWash', () => {
    it('GoodNote_MeetsAA', () => {
      expect(meetsAA('success-text', 'success-bg')).toBeGreaterThanOrEqual(
        AA_NORMAL
      );
    });
    it('WarnNote_MeetsAA', () => {
      expect(meetsAA('warn', 'warn-bg')).toBeGreaterThanOrEqual(AA_NORMAL);
    });
    it('ErrorNote_MeetsAA', () => {
      expect(meetsAA('danger-text', 'danger-bg')).toBeGreaterThanOrEqual(
        AA_NORMAL
      );
    });
  });

  describe('TierTextOnWhiteCard', () => {
    // Counters and Triage status pills sit on the white card, not the wash.
    it('GoodText_MeetsAAOnWhite', () => {
      expect(meetsAA('success-text', WHITE)).toBeGreaterThanOrEqual(AA_NORMAL);
    });
    it('WarnText_MeetsAAOnWhite', () => {
      expect(meetsAA('warn', WHITE)).toBeGreaterThanOrEqual(AA_NORMAL);
    });
    it('ErrorText_MeetsAAOnWhite', () => {
      expect(meetsAA('danger-text', WHITE)).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  });

  describe('LavenderEntry', () => {
    it('Label_MeetsAAOnLavenderSurface', () => {
      expect(
        contrastRatio(token('buy-link-text'), token('buy-link-bg'))
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it('TrimChipValue_MeetsAAOnLavenderSurface', () => {
      expect(
        contrastRatio(token('neutral-text-color'), token('buy-link-bg'))
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  });

  describe('PrimaryCta', () => {
    it('ContrastTextOnPrimary_MeetsAA', () => {
      expect(
        contrastRatio(token('contrast-text-color'), token('primary-color'))
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  });

  describe('FaintSubtext', () => {
    it('MutedOnWhite_MeetsAA', () => {
      expect(contrastRatio(token('muted-text-color'), WHITE)).toBeGreaterThanOrEqual(
        AA_NORMAL
      );
    });
  });

  describe('Eyebrow', () => {
    it('PrimaryOnWhite_MeetsAA', () => {
      expect(contrastRatio(token('primary-color'), WHITE)).toBeGreaterThanOrEqual(
        AA_NORMAL
      );
    });
  });

  describe('Heading', () => {
    it('HeadingTextOnWhite_MeetsAA', () => {
      expect(
        contrastRatio(token('heading-text-color'), WHITE)
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  });
});
