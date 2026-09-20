import { describe, expect, it } from 'vitest';

import {
  SPOILER_PARAM,
  atLeast,
  resolveSpoilerTier,
  spoilerTierOf,
  withSpoilerParam,
} from '@/lib/spoilers';

// The adjustment is a delta from the viewer's own baseline: an absent parameter
// falls through so the same URL resolves differently for two people, and a
// present one overrides in either direction.
describe('resolveSpoilerTier', () => {
  describe('AbsentParam', () => {
    it('EmptyParams_ReturnsTheBaseline', () => {
      expect(resolveSpoilerTier('progress', {})).toBe('progress');
    });

    it('UnknownParamValue_FallsThroughToTheBaseline', () => {
      expect(
        resolveSpoilerTier('progress', { [SPOILER_PARAM]: 'everything' })
      ).toBe('progress');
    });

    it('RepeatedParam_FallsThroughRatherThanReadingAnArray', () => {
      expect(
        resolveSpoilerTier('surprise', { [SPOILER_PARAM]: ['progress', 'claims'] })
      ).toBe('surprise');
    });
  });

  describe('PresentParam', () => {
    it('ParamAboveBaseline_OverridesUpward', () => {
      expect(resolveSpoilerTier('surprise', { [SPOILER_PARAM]: 'claims' })).toBe(
        'claims'
      );
    });

    it('ParamBelowBaseline_OverridesDownward', () => {
      expect(resolveSpoilerTier('claims', { [SPOILER_PARAM]: 'surprise' })).toBe(
        'surprise'
      );
    });
  });
});

describe('atLeast', () => {
  it('ClaimsAgainstProgress_ReturnsTrue', () => {
    expect(atLeast('claims', 'progress')).toBe(true);
  });

  it('SurpriseAgainstClaims_ReturnsFalse', () => {
    expect(atLeast('surprise', 'claims')).toBe(false);
  });

  it('TierAgainstItself_ReturnsTrue', () => {
    expect(atLeast('claims', 'claims')).toBe(true);
  });
});

describe('spoilerTierOf', () => {
  it('StoredClaims_ReturnsClaims', () => {
    expect(spoilerTierOf('claims')).toBe('claims');
  });

  // `identity` named the claiming parties before that stopped being a tier;
  // rows written under it must not silently re-hide what they disclosed.
  it('StoredRetiredIdentityTier_ReturnsClaims', () => {
    expect(spoilerTierOf('identity')).toBe('claims');
  });

  it('ValueOutsideTheVocabulary_ReturnsSurprise', () => {
    expect(spoilerTierOf('everything')).toBe('surprise');
  });
});

// The write side of the delta: omit the param when the choice is the viewer's
// own baseline, set it otherwise.
describe('withSpoilerParam', () => {
  it('NextEqualsBaseline_OmitsTheParamKeepingOtherQuery', () => {
    expect(withSpoilerParam('spoiler=claims&sort=name', 'progress', 'progress')).toBe(
      'sort=name'
    );
  });

  it('NextDiffersFromBaseline_SetsTheParamAlongsideOtherQuery', () => {
    expect(withSpoilerParam('sort=name', 'claims', 'surprise')).toBe(
      'sort=name&spoiler=claims'
    );
  });

  it('NextDiffersFromBaseline_ReplacesAnExistingParam', () => {
    expect(withSpoilerParam('spoiler=surprise', 'claims', 'surprise')).toBe(
      'spoiler=claims'
    );
  });
});
