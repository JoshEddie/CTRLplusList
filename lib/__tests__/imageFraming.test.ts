import { describe, expect, it } from 'vitest';
import { framingStyle } from '../imageFraming';

describe('framingStyle', () => {
  it('FilledFraming_CoversPositionedAtFocalPoint', () => {
    expect(framingStyle({ focal_x: 20, focal_y: 80, fit: 'cover' })).toEqual({
      objectFit: 'cover',
      objectPosition: '20% 80%',
    });
  });

  it('FittedFraming_ContainsWholeImageIgnoringFocalPoint', () => {
    expect(framingStyle({ focal_x: 20, focal_y: 80, fit: 'contain' })).toEqual({
      objectFit: 'contain',
    });
  });

  it('NoFraming_NoInlineStyle', () => {
    expect(framingStyle(null)).toBeUndefined();
  });
});
