/**
 * Pins `altvatar`'s thing-kind catalog SHALLs: people, faces, flags and glyphs
 * that cannot be someone's identity mark are excluded, a named code can reach
 * back through its excluded subgroup, values are stable codepoints, and search
 * is the way in.
 */
import { describe, expect, it } from 'vitest';

import {
  OPENMOJI_CATALOG,
  safeOpenmojiCode,
  searchOpenmoji,
} from '@/lib/altvatar/openmoji.catalog';

describe('OPENMOJI_CATALOG', () => {
  it('Built_HoldsCodepointsAndImportedLabels', () => {
    for (const entry of OPENMOJI_CATALOG.slice(0, 50)) {
      expect(entry.code).toMatch(/^[0-9A-F]{2,7}(-[0-9A-F]{2,7})*$/);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('Built_HoldsExactlyThePinnedNumberOfEntries', () => {
    expect(OPENMOJI_CATALOG).toHaveLength(911);
  });

  it('Built_ExcludesPeopleFacesFlagsAndSkintoneVariants', () => {
    const labels = new Set(OPENMOJI_CATALOG.map((e) => e.label));
    // One representative per excluded family: a person, a face, a flag, a
    // skin-tone variant, and a brand mark.
    expect(labels.has('baby')).toBe(false);
    expect(labels.has('grinning face')).toBe(false);
    expect(labels.has('flag: France')).toBe(false);
    expect(labels.has('baby: medium skin tone')).toBe(false);
    expect(labels.has('Twitter')).toBe(false);
    // And the human figures that sit outside people-body, in extras-openmoji.
    expect(labels.has('female doctor')).toBe(false);
    expect(labels.has('gardener man')).toBe(false);
    // While the animals and objects stay.
    expect(labels.has('dog')).toBe(true);
    expect(labels.has('rocket')).toBe(true);
  });

  it('Built_ExcludesGlyphsThatCannotBeSomeonesIdentityMark', () => {
    const labels = new Set(OPENMOJI_CATALOG.map((e) => e.label));
    // One representative per reason a glyph is cut rather than the whole list:
    // a weapon, an explosive, a drug, a death mark, and the produce item whose
    // second meaning has displaced its first.
    expect(labels.has('dagger')).toBe(false);
    expect(labels.has('atom bomb')).toBe(false);
    expect(labels.has('cigarette')).toBe(false);
    expect(labels.has('coffin')).toBe(false);
    expect(labels.has('eggplant')).toBe(false);
    // The cut is aimed at the mark, not the subject: a chef's knife and the
    // animals that read as insults when aimed at a person all stay.
    expect(labels.has('kitchen knife')).toBe(true);
    expect(labels.has('rat')).toBe(true);
  });

  it('ReIncludedCode_ReachesThroughItsExcludedSubgroup', () => {
    const labels = new Set(OPENMOJI_CATALOG.map((e) => e.label));
    // The time subgroup is cut for its two dozen clock faces, but watch
    // collecting is a persona, so 231A is named back in on its own.
    expect(labels.has('watch')).toBe(true);
    expect(labels.has('one o\u2019clock')).toBe(false);
    expect(labels.has('hourglass done')).toBe(false);
  });
});

describe('searchOpenmoji', () => {
  it('EmptyQuery_ReturnsAPopulatedFirstPageWithMoreBehindIt', () => {
    const page = searchOpenmoji('');
    expect(page.entries).toHaveLength(60);
    expect(page.hasMore).toBe(true);
  });

  it('Offset_WindowsTheSameOrderingWithoutOverlap', () => {
    const first = searchOpenmoji('');
    const second = searchOpenmoji('', 60, 60);
    const both = searchOpenmoji('', 120);
    expect([...first.entries, ...second.entries]).toEqual(both.entries);
  });

  it('OffsetPastTheEnd_ReturnsEmptyWithNoMore', () => {
    expect(searchOpenmoji('', 60, 100000)).toEqual({
      entries: [],
      hasMore: false,
    });
  });

  it('Query_MatchesAnnotationAndTags', () => {
    const byLabel = searchOpenmoji('rocket');
    expect(byLabel.entries.some((e) => e.label === 'rocket')).toBe(true);
    // 'puppy' lives in the openmoji tags of 'dog', not its annotation.
    const byTag = searchOpenmoji('puppy');
    expect(byTag.entries.some((e) => e.label === 'dog')).toBe(true);
  });

  it('ExcludedGlyph_IsUnreachableByItsOwnName', () => {
    // Search is the only way in, so exclusion has to hold there too — the
    // annotation and tags of a cut glyph must not lead back to it.
    expect(searchOpenmoji('dagger').entries).toHaveLength(0);
    expect(searchOpenmoji('eggplant').entries).toHaveLength(0);
    // 'handgun' is a tag on the cut water pistol, not an annotation.
    expect(searchOpenmoji('handgun').entries).toHaveLength(0);
  });

  it('QueryMatchingNothing_ReturnsEmptyWithNoMore', () => {
    expect(searchOpenmoji('zzzzzzzz')).toEqual({
      entries: [],
      hasMore: false,
    });
  });
});

describe('safeOpenmojiCode', () => {
  it('CatalogCode_PassesThrough', () => {
    expect(safeOpenmojiCode('1F415')).toBe('1F415');
  });

  it('UnknownOrMissingCode_FallsBackToTheDefaultGlyph', () => {
    expect(safeOpenmojiCode('ABCDEF')).toBe('2B50');
    expect(safeOpenmojiCode(undefined)).toBe('2B50');
    // An excluded group's code is outside the set even though the file exists.
    expect(safeOpenmojiCode('1F476')).toBe('2B50');
  });
});
