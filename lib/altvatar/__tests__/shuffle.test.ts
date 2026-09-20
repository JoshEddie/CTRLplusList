/**
 * Pins `altvatar`'s shuffle SHALLs: what a roll re-rolls, and what it never
 * lands on.
 */
import { describe, expect, it } from 'vitest';

import { ALTVATAR_STYLES, kindOf } from '@/lib/altvatar/registry';
import { offersOf } from '@/lib/altvatar/resolve';
import { shuffleAltvatar, shuffleStyle } from '@/lib/altvatar/shuffle';
import { ALTVATAR_STYLE_IDS } from '@/lib/altvatar/types';

// Enough rolls that landing on one style throughout, or never reaching a glyph
// style by luck, is not a plausible pass.
const ROLLS = 80;
const rolled = () => Array.from({ length: ROLLS }, () => shuffleStyle());

describe('shuffleStyle', () => {
  it('RepeatedRolls_ChangeTheStyle', () => {
    expect(new Set(rolled().map((s) => s.id)).size).toBeGreaterThan(1);
  });

  it('AnyRoll_LandsInThePersonKind', () => {
    // A thing answers a different question, so it is chosen and never rolled
    // into.
    expect(rolled().every((s) => kindOf(s.id) === 'person')).toBe(true);
  });
});

describe('shuffleAltvatar', () => {
  it('EveryStyle_LeavesEveryOfferedAxisHoldingAValue', () => {
    // Reported as `<style>.<axis>` so a failure names the style that left one
    // unset rather than only that something did.
    const unset = ALTVATAR_STYLE_IDS.flatMap((id) => {
      const style = ALTVATAR_STYLES[id];
      const { selections } = shuffleAltvatar(style);
      return offersOf(style)
        .map((offer) => offer.axis)
        .filter((axis) => selections[axis] === undefined)
        .map((axis) => `${id}.${axis}`);
    });
    expect(unset).toEqual([]);
  });

  it('ReligiousHeadwear_RollsNearItsTargetShare-FarBelowUniform', () => {
    // avataaars offers eight hats, so a uniform roll would put a hijab or a
    // turban on a quarter of all faces. Each carries a 5% target share, so
    // together they land near a tenth — still rolled, never a quarter.
    const ROLLS = 400;
    const style = ALTVATAR_STYLES.avataaars;
    const worn = Array.from({ length: ROLLS }, () =>
      shuffleAltvatar(style)
    ).filter(
      ({ selections }) =>
        selections.hat === 'hijab' || selections.hat === 'turban'
    );
    expect(worn.length).toBeLessThan(ROLLS * 0.2);
    expect(worn.length).toBeGreaterThan(ROLLS * 0.02);
  });

  it('SuccessiveRolls_ChangeTheSeed', () => {
    const style = ALTVATAR_STYLES.avataaars;
    expect(shuffleAltvatar(style).seed).not.toBe(shuffleAltvatar(style).seed);
  });
});
